from rest_framewrork import viewsets
from rest_framework.permission import IsAuthenticated
from .models import Message
from .serializers import MessageSerializer, SendMessageSerializer
from django.db.models import Q
from rest_framework.decorators import action
from rest_framework.response import Response


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return SendMessageSerializer
        return MessageSerializer

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=["get"])
    def conversations(self, request):
        user = request.user

        messages = Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        )

        users = set()

        for msg in messages:
            if msg.sender != user:
                users.add(msg.sender)
            if msg.receiver != user:
                users.add(msg.receiver)

        data = [
            {
                "id": u.id,
                "username": u.username,
                "role": u.role
            }
            for u in users
        ]

        return Response(data)

    @action(detail=True, methods=["patch"])
    def mark_read(self, request, pk=None):
        message = self.get_object()

        if message.receiver != request.user:
            return Response({"error": "Not allowed"}, status=403)

        message.is_read = True
        message.save()

        return Response({"status": "Message marked as read"})