from django.contrib.auth import get_user_model
from django.db import models, transaction
from rest_framework import serializers

from .models import Attendance, ChurchService, MemberProfile, SoulWinning

User = get_user_model()


class MemberMiniUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "home_address",
            "profile_picture",
            "role",
            "is_active",
            "is_frozen",
        ]


class MemberProfileSerializer(serializers.ModelSerializer):
    user = MemberMiniUserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(source="user", queryset=User.objects.all(), write_only=True, required=False)
    cell_name = serializers.CharField(source="cell.name", read_only=True)

    class Meta:
        model = MemberProfile
        fields = [
            "id",
            "user",
            "user_id",
            "cell",
            "cell_name",
            "is_baptised",
            "foundation_completed",
            "is_first_timer",
            "first_visit_date",
            "follow_up_status",
            "visitation_notes",
            "visitation_fellowship_leader",
            "visitation_cell_leader",
            "is_partner",
            "partnership_date",
            "partnership_level",
            "souls_won",
            "join_date",
            "last_attended",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "cell_name", "user"]

    def validate_visitation_fellowship_leader(self, value):
        if value and value.role != User.Role.FELLOWSHIP_LEADER:
            raise serializers.ValidationError("Visitation fellowship leader must have the fellowship_leader role.")
        return value

    def validate_visitation_cell_leader(self, value):
        if value and value.role != User.Role.CELL_LEADER:
            raise serializers.ValidationError("Visitation cell leader must have the cell_leader role.")
        return value


class SoulWinningSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.user.username", read_only=True)

    class Meta:
        model = SoulWinning
        fields = [
            "id",
            "member",
            "member_name",
            "date",
            "converts",
            "notes",
            "recorded_by",
            "created_at",
        ]
        read_only_fields = ["id", "recorded_by", "created_at", "member_name"]

    @transaction.atomic
    def create(self, validated_data):
        record = super().create(validated_data)
        MemberProfile.objects.filter(pk=record.member_id).update(souls_won=models.F("souls_won") + record.converts)
        record.member.refresh_from_db(fields=["souls_won"])
        return record


class FirstTimerFollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = [
            "id",
            "is_first_timer",
            "first_visit_date",
            "follow_up_status",
            "visitation_notes",
            "visitation_fellowship_leader",
            "visitation_cell_leader",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate_visitation_fellowship_leader(self, value):
        if value and value.role != User.Role.FELLOWSHIP_LEADER:
            raise serializers.ValidationError("Visitation fellowship leader must have the fellowship_leader role.")
        return value

    def validate_visitation_cell_leader(self, value):
        if value and value.role != User.Role.CELL_LEADER:
            raise serializers.ValidationError("Visitation cell leader must have the cell_leader role.")
        return value


class PartnershipUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = ["id", "is_partner", "partnership_date", "partnership_level", "updated_at"]
        read_only_fields = ["id", "updated_at"]


class AttendanceSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.user.username", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id",
            "member",
            "member_name",
            "date",
            "service",
            "service_name",
            "service_type",
            "present",
            "recorded_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "recorded_by", "created_at", "updated_at", "member_name", "service_name"]

    def _is_legacy_record_without_service(self, attrs):
        return bool(
            self.instance
            and getattr(self.instance, "service_id", None) is None
            and "service" not in attrs
        )

    def validate(self, attrs):
        service = attrs.get("service") or getattr(self.instance, "service", None)
        attendance_date = attrs.get("date") or getattr(self.instance, "date", None)
        if not service:
            if self._is_legacy_record_without_service(attrs):
                return attrs
            raise serializers.ValidationError({"service": "Service is required."})
        if attendance_date and service.day_of_week.lower() != attendance_date.strftime("%A").lower():
            raise serializers.ValidationError(
                {"service": f"Selected service runs on {service.day_of_week}, but date is {attendance_date.strftime('%A')}."}
            )
        return attrs


class ChurchServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChurchService
        fields = ["id", "name", "day_of_week", "start_time", "end_time", "is_active"]
        read_only_fields = fields


class BulkAttendanceSerializer(serializers.Serializer):
    member_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, required=False)
    members = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, required=False, write_only=True)
    date = serializers.DateField()
    service_id = serializers.PrimaryKeyRelatedField(queryset=ChurchService.objects.filter(is_active=True), source="service")
    present = serializers.BooleanField(default=True)

    def validate(self, attrs):
        raw_member_ids = attrs.get("member_ids") or attrs.get("members") or []
        member_ids = list(dict.fromkeys(raw_member_ids))
        if not member_ids:
            raise serializers.ValidationError({"member_ids": "At least one member is required."})
        attrs["member_ids"] = member_ids
        service = attrs.get("service")
        attendance_date = attrs.get("date")
        if service and attendance_date:
            requested_day = attendance_date.strftime("%A").lower()
            if service.day_of_week.lower() != requested_day:
                raise serializers.ValidationError(
                    {"service_id": f"Selected service runs on {service.day_of_week}, but date is {attendance_date.strftime('%A')}."}
                )
        return attrs
