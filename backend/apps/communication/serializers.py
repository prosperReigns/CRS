from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Announcement, Message, Notification

User = get_user_model()


class MessageUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class MessageSerializer(serializers.ModelSerializer):
    sender = MessageUserSerializer(read_only=True)
    receiver = MessageUserSerializer(source="recipient", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "receiver",
            "content",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["id", "sender", "receiver", "is_read", "created_at"]


class MessageCreateSerializer(serializers.Serializer):
    receiver = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    recipient = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    content = serializers.CharField()

    def validate(self, attrs):
        request = self.context["request"]
        receiver = attrs.get("receiver")
        recipient = attrs.get("recipient")

        if receiver is None and recipient is None:
            raise serializers.ValidationError({"receiver": "This field is required."})
        if receiver is not None and recipient is not None and receiver.id != recipient.id:
            raise serializers.ValidationError({"receiver": "receiver and recipient must match."})

        selected_recipient = receiver or recipient
        if selected_recipient.id == request.user.id:
            raise serializers.ValidationError("You cannot send a message to yourself.")

        attrs["recipient"] = selected_recipient
        attrs.pop("receiver", None)
        return attrs

    def create(self, validated_data):
        return Message.objects.create(**validated_data)


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
