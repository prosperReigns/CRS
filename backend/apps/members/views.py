from django.db import transaction
from django.db.models import Case, DateField, F, Value, When
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.responsibilities import has_staff_permission
from .models import Attendance, ChurchService, MemberProfile, SoulWinning
from .permissions import AttendancePermission, MemberProfilePermission, SoulWinningPermission
from .serializers import (
    AttendanceSerializer,
    BulkAttendanceSerializer,
    ChurchServiceSerializer,
    FirstTimerFollowUpSerializer,
    MemberProfileSerializer,
    PartnershipUpdateSerializer,
    SoulWinningSerializer,
)


def scoped_member_profiles(user):
    qs = MemberProfile.objects.select_related("user", "cell", "cell__fellowship")

    if user.role in {User.Role.PASTOR, User.Role.STAFF}:
        return qs
    if user.role == User.Role.FELLOWSHIP_LEADER:
        return qs.filter(cell__fellowship__leader=user)
    if user.role == User.Role.CELL_LEADER:
        return qs.filter(cell__leader=user)
    return qs.filter(user=user)


def ensure_member_in_scope(user, member_id, message):
    if not scoped_member_profiles(user).filter(id=member_id).exists():
        raise PermissionDenied(message)


class MemberProfileViewSet(viewsets.ModelViewSet):
    serializer_class = MemberProfileSerializer
    permission_classes = [MemberProfilePermission]

    def get_queryset(self):
        qs = scoped_member_profiles(self.request.user)

        role = self.request.query_params.get("role")
        if role:
            valid_roles = {choice[0] for choice in User.Role.choices}
            if role not in valid_roles:
                raise ValidationError({"role": "Invalid role filter."})
            qs = qs.filter(user__role=role)

        cell_id = self.request.query_params.get("cell")
        if cell_id:
            qs = qs.filter(cell_id=cell_id)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        cell = serializer.validated_data.get("cell")

        if user.role == User.Role.FELLOWSHIP_LEADER and cell and cell.fellowship.leader_id != user.id:
            raise PermissionDenied("You can only assign members to cells in your fellowship.")
        if user.role == User.Role.CELL_LEADER and cell and cell.leader_id != user.id:
            raise PermissionDenied("You can only assign members to your own cell.")

        serializer.save()

    def _require_staff_permission(self, user, permission, message):
        if user.role == User.Role.PASTOR:
            return
        if user.role != User.Role.STAFF or not has_staff_permission(user, permission):
            raise PermissionDenied(message)

    @action(detail=False, methods=["get"], url_path="first-timers")
    def first_timers(self, request):
        self._require_staff_permission(
            request.user,
            "view_new_members",
            "Only pastor or first timer coordinators can view first timers.",
        )
        qs = scoped_member_profiles(request.user).filter(is_first_timer=True)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="first-timer-follow-up")
    def first_timer_follow_up(self, request, pk=None):
        self._require_staff_permission(
            request.user,
            "update_visitation",
            "Only pastor or first timer coordinators can update follow-up records.",
        )
        member_profile = self.get_object()
        if not member_profile.is_first_timer:
            raise ValidationError({"is_first_timer": "Selected member is not marked as a first timer."})
        serializer = FirstTimerFollowUpSerializer(member_profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="partners")
    def partners(self, request):
        self._require_staff_permission(
            request.user,
            "view_partnership",
            "Only pastor or partnership representatives can view partnership records.",
        )
        qs = scoped_member_profiles(request.user).filter(is_partner=True)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="partnership")
    def update_partnership(self, request, pk=None):
        self._require_staff_permission(
            request.user,
            "update_partnership",
            "Only pastor or partnership representatives can update partnership records.",
        )
        member_profile = self.get_object()
        serializer = PartnershipUpdateSerializer(member_profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SoulWinningViewSet(viewsets.ModelViewSet):
    serializer_class = SoulWinningSerializer
    permission_classes = [SoulWinningPermission]

    def get_queryset(self):
        profiles = scoped_member_profiles(self.request.user)
        return SoulWinning.objects.select_related("member", "member__user", "recorded_by").filter(member__in=profiles)

    def perform_create(self, serializer):
        member = serializer.validated_data["member"]
        ensure_member_in_scope(
            self.request.user,
            member.id,
            "You cannot record soul-winning for this member.",
        )
        serializer.save(recorded_by=self.request.user)


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [AttendancePermission]

    def get_queryset(self):
        profiles = scoped_member_profiles(self.request.user)
        return Attendance.objects.select_related("member", "member__user", "recorded_by", "service").filter(member__in=profiles)

    def perform_create(self, serializer):
        member = serializer.validated_data["member"]
        ensure_member_in_scope(
            self.request.user,
            member.id,
            "You cannot record attendance for this member.",
        )
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="bulk-mark")
    @transaction.atomic
    def bulk_mark(self, request):
        user = request.user
        if user.role not in {User.Role.PASTOR, User.Role.STAFF}:
            raise PermissionDenied("You are not allowed to mark bulk attendance.")

        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        date = serializer.validated_data["date"]
        service = serializer.validated_data["service"]
        present = serializer.validated_data["present"]
        requested_ids = serializer.validated_data["member_ids"]

        allowed_ids = set(scoped_member_profiles(user).values_list("id", flat=True))
        invalid_ids = sorted(set(requested_ids) - allowed_ids)
        if invalid_ids:
            raise ValidationError({"member_ids": f"Not allowed for member IDs: {invalid_ids}"})

        existing_ids = set(
            Attendance.objects.filter(
                member_id__in=requested_ids,
                date=date,
                service=service,
            ).values_list("member_id", flat=True)
        )

        to_create_ids = [member_id for member_id in requested_ids if member_id not in existing_ids]
        records = [
            Attendance(
                member_id=member_id,
                date=date,
                service=service,
                present=present,
                recorded_by=user,
            )
            for member_id in to_create_ids
        ]

        Attendance.objects.bulk_create(records)

        if present and to_create_ids:
            MemberProfile.objects.filter(id__in=to_create_ids).update(
                last_attended=Case(
                    When(last_attended__isnull=True, then=Value(date)),
                    When(last_attended__lt=date, then=Value(date)),
                    default=F("last_attended"),
                    output_field=DateField(),
                )
            )

        return Response(
            {
                "date": date,
                "service_id": service.id,
                "service_name": service.name,
                "requested": len(requested_ids),
                "created": len(to_create_ids),
                "duplicates": len(existing_ids),
            },
            status=status.HTTP_201_CREATED,
        )


class ChurchServiceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        services = ChurchService.objects.filter(is_active=True).order_by("day_of_week", "start_time", "name")
        return Response(ChurchServiceSerializer(services, many=True).data)
