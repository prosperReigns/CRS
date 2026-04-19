from django.contrib.auth import get_user_model
from django.db import models, transaction
from rest_framework import serializers

from .models import Attendance, ChurchService, MemberProfile, Person, SoulWinning, VisitationReport
from .services import evaluate_membership

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
    person_id = serializers.PrimaryKeyRelatedField(source="person", queryset=Person.objects.all(), write_only=True, required=False)
    person = serializers.SerializerMethodField(read_only=True)
    cell_name = serializers.CharField(source="cell.name", read_only=True)

    class Meta:
        model = MemberProfile
        fields = [
            "id",
            "user",
            "user_id",
            "person",
            "person_id",
            "cell",
            "cell_name",
            "membership_status",
            "attendance_count",
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
        read_only_fields = ["id", "created_at", "updated_at", "cell_name", "user", "person", "attendance_count"]

    def get_person(self, obj):
        person = obj.person
        if not person:
            return None
        return {
            "id": person.id,
            "first_name": person.first_name,
            "last_name": person.last_name,
            "phone": person.phone,
            "email": person.email,
        }

    def validate_visitation_fellowship_leader(self, value):
        if value and value.role != User.Role.FELLOWSHIP_LEADER:
            raise serializers.ValidationError("Visitation fellowship leader must have the fellowship_leader role.")
        return value

    def validate_visitation_cell_leader(self, value):
        if value and value.role != User.Role.CELL_LEADER:
            raise serializers.ValidationError("Visitation cell leader must have the cell_leader role.")
        return value

    def update(self, instance, validated_data):
        track_fields = {"is_baptised", "foundation_completed"}
        should_evaluate = bool(track_fields.intersection(validated_data.keys()))
        profile = super().update(instance, validated_data)
        if should_evaluate and profile.person_id:
            evaluate_membership(profile.person)
        return profile


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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        person = attrs.get("person") or getattr(self.instance, "person", None)
        if person and "membership_status" not in attrs:
            attrs["membership_status"] = getattr(self.instance, "membership_status", MemberProfile.MembershipStatus.VISITOR)
        return attrs

    def _build_person_from_user(self, user):
        return Person.objects.create(
            first_name=user.first_name or user.username,
            last_name=user.last_name or "",
            phone=user.phone or "",
            email=user.email or "",
        )

    def create(self, validated_data):
        if not validated_data.get("person") and validated_data.get("user"):
            validated_data["person"] = self._build_person_from_user(validated_data["user"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get("person") and not instance.person_id and validated_data.get("user"):
            validated_data["person"] = self._build_person_from_user(validated_data["user"])
        return super().update(instance, validated_data)


class PartnershipUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = ["id", "is_partner", "partnership_date", "partnership_level", "updated_at"]
        read_only_fields = ["id", "updated_at"]


class VisitationReportSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    leader_name = serializers.CharField(source="assigned_leader.username", read_only=True)

    class Meta:
        model = VisitationReport
        fields = [
            "id",
            "member",
            "member_name",
            "assigned_leader",
            "leader_name",
            "visitation_date",
            "visitation_time",
            "method_used",
            "comment",
            "status",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "assigned_leader",
            "member_name",
            "leader_name",
            "status",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        member = attrs.get("member") or getattr(self.instance, "member", None)
        if member and member.membership_status != MemberProfile.MembershipStatus.FIRST_TIMER:
            raise serializers.ValidationError({"member": "Selected member is not marked as a first timer."})
        return attrs

    def get_member_name(self, obj):
        if obj.member.person_id:
            return obj.member.person.full_name
        return obj.member.user.username


class AttendanceSerializer(serializers.ModelSerializer):
    person_name = serializers.SerializerMethodField(read_only=True)
    member_name = serializers.SerializerMethodField(read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id",
            "person",
            "person_name",
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
        read_only_fields = ["id", "recorded_by", "created_at", "updated_at", "member_name", "person_name", "service_name"]

    def get_person_name(self, obj):
        if obj.person_id:
            return obj.person.full_name
        return None

    def get_member_name(self, obj):
        if obj.person_id:
            return obj.person.full_name
        if obj.member_id:
            return obj.member.user.username
        return None

    def _is_legacy_record_without_service(self, attrs):
        return bool(
            self.instance
            and getattr(self.instance, "service_id", None) is None
            and "service" not in attrs
        )

    def validate(self, attrs):
        person = attrs.get("person") or getattr(self.instance, "person", None)
        member = attrs.get("member") or getattr(self.instance, "member", None)
        if person is None and member is None:
            raise serializers.ValidationError({"person": "Person is required."})
        if person is None and member is not None:
            person = member.person
            attrs["person"] = person
        if person is not None and member is None:
            member = MemberProfile.objects.filter(person=person).first()
            if member:
                attrs["member"] = member

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

    def create(self, validated_data):
        record = super().create(validated_data)
        if record.person_id and record.present:
            evaluate_membership(record.person, attendance_delta=1)
        return record


class ChurchServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChurchService
        fields = ["id", "name", "day_of_week", "start_time", "end_time", "is_active"]
        read_only_fields = fields


class BulkAttendanceSerializer(serializers.Serializer):
    person_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, required=False)
    people = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, required=False, write_only=True)
    member_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, required=False, write_only=True)
    members = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, required=False, write_only=True)
    date = serializers.DateField()
    service_id = serializers.PrimaryKeyRelatedField(queryset=ChurchService.objects.filter(is_active=True), source="service")
    present = serializers.BooleanField(default=True)

    def validate(self, attrs):
        raw_person_ids = attrs.get("person_ids") or attrs.get("people") or []
        raw_member_ids = attrs.get("member_ids") or attrs.get("members") or []

        person_ids = list(dict.fromkeys(raw_person_ids))
        if not person_ids and raw_member_ids:
            person_ids = list(
                MemberProfile.objects.filter(id__in=raw_member_ids, person__isnull=False).values_list("person_id", flat=True)
            )
        if not person_ids:
            raise serializers.ValidationError({"person_ids": "At least one person is required."})
        attrs["person_ids"] = list(dict.fromkeys(person_ids))
        service = attrs.get("service")
        attendance_date = attrs.get("date")
        if service and attendance_date:
            requested_day = attendance_date.strftime("%A").lower()
            if service.day_of_week.lower() != requested_day:
                raise serializers.ValidationError(
                    {"service_id": f"Selected service runs on {service.day_of_week}, but date is {attendance_date.strftime('%A')}."}
                )
        return attrs


class PersonSerializer(serializers.ModelSerializer):
    membership_status = serializers.SerializerMethodField(read_only=True)
    attendance_count = serializers.SerializerMethodField(read_only=True)
    is_member = serializers.SerializerMethodField(read_only=True)
    cell_name = serializers.CharField(source="member_profile.cell.name", read_only=True, allow_null=True)

    class Meta:
        model = Person
        fields = [
            "id",
            "first_name",
            "last_name",
            "phone",
            "email",
            "created_at",
            "membership_status",
            "attendance_count",
            "is_member",
            "cell_name",
        ]
        read_only_fields = ["id", "created_at", "membership_status", "attendance_count", "is_member", "cell_name"]

    def get_membership_status(self, obj):
        profile = getattr(obj, "member_profile", None)
        if not profile:
            return MemberProfile.MembershipStatus.VISITOR
        return profile.membership_status

    def get_attendance_count(self, obj):
        profile = getattr(obj, "member_profile", None)
        if not profile:
            return 0
        return profile.attendance_count

    def get_is_member(self, obj):
        return self.get_membership_status(obj) == MemberProfile.MembershipStatus.MEMBER
