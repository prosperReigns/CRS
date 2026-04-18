from django.db import transaction
from django.db.models import Case, DateField, F, Q, Value, When
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.responsibilities import has_staff_permission
from .models import Attendance, ChurchService, MemberProfile, SoulWinning, VisitationReport
from .permissions import AttendancePermission, MemberProfilePermission, SoulWinningPermission
from .serializers import (
    AttendanceSerializer,
    BulkAttendanceSerializer,
    ChurchServiceSerializer,
    FirstTimerFollowUpSerializer,
    MemberProfileSerializer,
    PartnershipUpdateSerializer,
    SoulWinningSerializer,
    VisitationReportSerializer,
)


def scoped_member_profiles(user):
    qs = MemberProfile.objects.select_related("user", "cell", "cell__fellowship")

    if user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
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
        if user.role in {User.Role.PASTOR, User.Role.ADMIN}:
            return
        if user.role != User.Role.STAFF or not has_staff_permission(user, permission):
            raise PermissionDenied(message)

    @action(detail=False, methods=["get"], url_path="first-timers")
    def first_timers(self, request):
        self._require_staff_permission(
            request.user,
            "view_new_members",
            "Only pastor, admin, or first timer coordinators can view first timers.",
        )
        qs = scoped_member_profiles(request.user).filter(is_first_timer=True)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="assigned-visitation-first-timers")
    def assigned_visitation_first_timers(self, request):
        if request.user.role not in {User.Role.FELLOWSHIP_LEADER, User.Role.CELL_LEADER}:
            raise PermissionDenied("Only fellowship leaders or cell leaders can view assigned visitation members.")
        qs = scoped_member_profiles(request.user).filter(is_first_timer=True).filter(
            Q(visitation_fellowship_leader=request.user) | Q(visitation_cell_leader=request.user)
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="first-timer-follow-up")
    def first_timer_follow_up(self, request, pk=None):
        self._require_staff_permission(
            request.user,
            "update_visitation",
            "Only pastor, admin, or first timer coordinators can update follow-up records.",
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
            "Only pastor, admin, or partnership representatives can view partnership records.",
        )
        qs = scoped_member_profiles(request.user).filter(is_partner=True)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="partnership")
    def update_partnership(self, request, pk=None):
        self._require_staff_permission(
            request.user,
            "update_partnership",
            "Only pastor, admin, or partnership representatives can update partnership records.",
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
        if user.role not in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
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


class VisitationReportViewSet(viewsets.ModelViewSet):
    serializer_class = VisitationReportSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def _can_approve_visitation(self, user):
        if user.role in {User.Role.PASTOR, User.Role.ADMIN}:
            return True
        return user.role == User.Role.STAFF and has_staff_permission(user, "update_visitation")

    def get_queryset(self):
        qs = VisitationReport.objects.select_related("member", "member__user", "assigned_leader", "approved_by")
        user = self.request.user
        if self._can_approve_visitation(user):
            return qs
        if user.role in {User.Role.FELLOWSHIP_LEADER, User.Role.CELL_LEADER}:
            return qs.filter(assigned_leader=user)
        return qs.none()

    def _require_leader(self, user):
        if user.role not in {User.Role.FELLOWSHIP_LEADER, User.Role.CELL_LEADER}:
            raise PermissionDenied("Only fellowship leaders or cell leaders can submit visitation reports.")

    def _is_assigned_member(self, user, member):
        return member.is_first_timer and (
            member.visitation_fellowship_leader_id == user.id or member.visitation_cell_leader_id == user.id
        )

    def perform_create(self, serializer):
        user = self.request.user
        self._require_leader(user)
        member = serializer.validated_data["member"]
        if not self._is_assigned_member(user, member):
            raise PermissionDenied("You can only submit visitation reports for your assigned first timers.")
        serializer.save(assigned_leader=user)

    def perform_update(self, serializer):
        report = self.get_object()
        if report.status == VisitationReport.Status.APPROVED:
            raise PermissionDenied("Approved visitation reports cannot be edited.")
        if report.assigned_leader_id != self.request.user.id:
            raise PermissionDenied("You can only edit visitation reports you submitted.")
        member = serializer.validated_data.get("member", report.member)
        if not self._is_assigned_member(self.request.user, member):
            raise PermissionDenied("You can only submit visitation reports for your assigned first timers.")
        serializer.save()

    @action(detail=True, methods=["patch"])
    @transaction.atomic
    def approve(self, request, pk=None):
        if not self._can_approve_visitation(request.user):
            raise PermissionDenied("Only first timer staff, pastors, or admins can approve visitation reports.")
        report = self.get_object()
        if report.status == VisitationReport.Status.APPROVED:
            return Response({"detail": "Visitation report is already approved."}, status=status.HTTP_400_BAD_REQUEST)
        report.status = VisitationReport.Status.APPROVED
        report.approved_by = request.user
        report.approved_at = timezone.now()
        report.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        return Response(self.get_serializer(report).data)
