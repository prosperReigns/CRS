from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import User
from .models import BibleStudyClass, Cell, Fellowship


AccountUser = get_user_model()


class FellowshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fellowship
        fields = ["id", "name", "leader", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_leader(self, value):
        if value and value.role not in {User.Role.FELLOWSHIP_LEADER, User.Role.PASTOR, User.Role.STAFF}:
            raise serializers.ValidationError("Fellowship leader must be a fellowship leader, staff, or pastor.")
        return value


class CellSerializer(serializers.ModelSerializer):
    fellowship_name = serializers.CharField(source="fellowship.name", read_only=True)

    class Meta:
        model = Cell
        fields = [
            "id",
            "name",
            "fellowship",
            "fellowship_name",
            "leader",
            "meeting_day",
            "meeting_time",
            "venue",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "fellowship_name"]

    def validate_leader(self, value):
        if value and value.role != User.Role.CELL_LEADER:
            raise serializers.ValidationError("Cell leader must have the cell_leader role.")
        return value


class BibleStudyClassSerializer(serializers.ModelSerializer):
    cell_name = serializers.CharField(source="cell.name", read_only=True)

    class Meta:
        model = BibleStudyClass
        fields = ["id", "name", "cell", "cell_name", "teacher", "created_at"]
        read_only_fields = ["id", "created_at", "cell_name"]

    def validate_teacher(self, value):
        if value and value.role != User.Role.TEACHER:
            raise serializers.ValidationError("Assigned teacher must have the teacher role.")
        return value
