from rest_framework import serializers

from apps.accounts.models import User
from .models import ScheduleEvent


class EventParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "role"]


class ScheduleEventSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True), many=True, required=False)
    participant_details = EventParticipantSerializer(source="participants", many=True, read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = ScheduleEvent
        fields = [
            "id",
            "title",
            "description",
            "location",
            "start_datetime",
            "end_datetime",
            "all_day",
            "event_type",
            "created_by",
            "created_by_username",
            "participants",
            "participant_details",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_username", "created_at", "updated_at", "participant_details"]

    def validate(self, attrs):
        start_datetime = attrs.get("start_datetime") or getattr(self.instance, "start_datetime", None)
        end_datetime = attrs.get("end_datetime") or getattr(self.instance, "end_datetime", None)
        if start_datetime and end_datetime and end_datetime <= start_datetime:
            raise serializers.ValidationError({"end_datetime": "End date/time must be after start date/time."})
        return attrs
