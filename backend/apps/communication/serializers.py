from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Announcement, Message, Notification

User = get_user_model()


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    recipient_username = serializers.CharField(source="recipient.username", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "sender_username",
            "recipient",
            "recipient_username",
            "content",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["id", "sender", "sender_username", "recipient_username", "is_read", "created_at"]


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "recipient", "content"]
        read_only_fields = ["id"]

    def validate_recipient(self, value):
        request = self.context["request"]
        if value.id == request.user.id:
            raise serializers.ValidationError("You cannot send a message to yourself.")
        return value


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "message", "category", "is_read", "created_at"]
        read_only_fields = ["id", "title", "message", "category", "created_at"]


class AnnouncementSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    recipient_ids = serializers.PrimaryKeyRelatedField(
        source="recipients",
        queryset=User.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Announcement
        fields = [
            "id",
            "author",
            "author_username",
            "title",
            "message",
            "recipients",
            "recipient_ids",
            "created_at",
        ]
        read_only_fields = ["id", "author", "author_username", "recipients", "created_at"]

    def create(self, validated_data):
        recipients = validated_data.pop("recipients", [])
        announcement = Announcement.objects.create(**validated_data)
        if recipients:
            announcement.recipients.set(recipients)
        return announcement

    def update(self, instance, validated_data):
        recipients = validated_data.pop("recipients", None)
        announcement = super().update(instance, validated_data)
        if recipients is not None:
            announcement.recipients.set(recipients)
        return announcement
