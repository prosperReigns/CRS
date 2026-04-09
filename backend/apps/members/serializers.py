from django.contrib.auth import get_user_model
from django.db import models, transaction
from rest_framework import serializers

from .models import Attendance, MemberProfile, SoulWinning

User = get_user_model()


class MemberMiniUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "role"]


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
            "is_partner",
            "souls_won",
            "join_date",
            "last_attended",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "souls_won", "created_at", "updated_at", "cell_name", "user"]


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


class AttendanceSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source="member.user.username", read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id",
            "member",
            "member_name",
            "date",
            "service_type",
            "present",
            "recorded_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "recorded_by", "created_at", "updated_at", "member_name"]


class BulkAttendanceSerializer(serializers.Serializer):
    member_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    date = serializers.DateField()
    service_type = serializers.ChoiceField(choices=Attendance.ServiceType.choices)
    present = serializers.BooleanField(default=True)

    def validate_member_ids(self, value):
        member_ids = list(dict.fromkeys(value))
        if not member_ids:
            raise serializers.ValidationError("At least one member is required.")
        return member_ids
