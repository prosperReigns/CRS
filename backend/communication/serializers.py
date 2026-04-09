from rest_framework import serializers
from .models import Message, Announcement

class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.StringRelatedField()
    recipient = serializers.StringRelatedField()

    class Meta:
        model = Message
        fields = "__all__"

class SendMessageSerializer(serializers.ModelSerializer):
    recipient = serializers.CharField()

    class Meta:
        model = Message
        fields = ["recipient", "content"]

    def validate_recipient(self, value):
        from accounts.models import User
        try:
            user = User.objects.get(username=value)
            return user
        except User.DoesNotExist:
            raise serializers.ValidationError("Recipient does not exist.")

    def create(self, validated_data):
        sender = self.context["request"].user
        recipient = validated_data["recipient"]
        content = validated_data["content"]

        message = Message.objects.create(sender=sender, recipient=recipient, content=content)
        return message

class AnnouncementSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()

    class Meta:
        model = Announcement
        fields = "__all__"