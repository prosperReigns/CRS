from django.db import transaction
from django.db.models import Case, DateField, F, Value, When
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.models import User
from .models import Attendance, MemberProfile, SoulWinning
from .permissions import AttendancePermission, MemberProfilePermission, SoulWinningPermission
from .serializers import AttendanceSerializer, BulkAttendanceSerializer, MemberProfileSerializer, SoulWinningSerializer


def scoped_member_profiles(user):
    qs = MemberProfile.objects.select_related("user", "cell", "cell__fellowship")

    if user.role in {User.Role.PASTOR, User.Role.STAFF}:
        return qs
    if user.role == User.Role.FELLOWSHIP_LEADER:
        return qs.filter(cell__fellowship__leader=user)
    if user.role == User.Role.CELL_LEADER:
        return qs.filter(cell__leader=user)
    return qs.filter(user=user)


class MemberProfileViewSet(viewsets.ModelViewSet):
    serializer_class = MemberProfileSerializer
    permission_classes = [MemberProfilePermission]

    def get_queryset(self):
        return scoped_member_profiles(self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        cell = serializer.validated_data.get("cell")

        if user.role == User.Role.FELLOWSHIP_LEADER and cell and cell.fellowship.leader_id != user.id:
            raise PermissionDenied("You can only assign members to cells in your fellowship.")
        if user.role == User.Role.CELL_LEADER and cell and cell.leader_id != user.id:
            raise PermissionDenied("You can only assign members to your own cell.")

        serializer.save()


class SoulWinningViewSet(viewsets.ModelViewSet):
    serializer_class = SoulWinningSerializer
    permission_classes = [SoulWinningPermission]

    def get_queryset(self):
        profiles = scoped_member_profiles(self.request.user)
        return SoulWinning.objects.select_related("member", "member__user", "recorded_by").filter(member__in=profiles)

    def perform_create(self, serializer):
        member = serializer.validated_data["member"]
        allowed_ids = scoped_member_profiles(self.request.user).values_list("id", flat=True)
        if member.id not in allowed_ids:
            raise PermissionDenied("You cannot record soul-winning for this member.")
        serializer.save(recorded_by=self.request.user)


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [AttendancePermission]

    def get_queryset(self):
        profiles = scoped_member_profiles(self.request.user)
        return Attendance.objects.select_related("member", "member__user", "recorded_by").filter(member__in=profiles)

    def perform_create(self, serializer):
        member = serializer.validated_data["member"]
        allowed_ids = set(scoped_member_profiles(self.request.user).values_list("id", flat=True))
        if member.id not in allowed_ids:
            raise PermissionDenied("You cannot record attendance for this member.")
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="bulk-mark")
    @transaction.atomic
    def bulk_mark(self, request):
        user = request.user
        if user.role not in {
            User.Role.PASTOR,
            User.Role.STAFF,
            User.Role.FELLOWSHIP_LEADER,
            User.Role.CELL_LEADER,
        }:
            raise PermissionDenied("You are not allowed to mark bulk attendance.")

        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        date = serializer.validated_data["date"]
        service_type = serializer.validated_data["service_type"]
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
                service_type=service_type,
            ).values_list("member_id", flat=True)
        )

        to_create_ids = [member_id for member_id in requested_ids if member_id not in existing_ids]
        records = [
            Attendance(
                member_id=member_id,
                date=date,
                service_type=service_type,
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
                "service_type": service_type,
                "requested": len(requested_ids),
                "created": len(to_create_ids),
                "duplicates": len(existing_ids),
            },
            status=status.HTTP_201_CREATED,
        )
