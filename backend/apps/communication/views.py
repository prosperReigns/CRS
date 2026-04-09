from django.contrib.auth import get_user_model
from django.db.models import Case, Count, F, IntegerField, Max, OuterRef, Q, Subquery, Value, When
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Announcement, Message, Notification
from .permissions import AnnouncementPermission, MessagePermission, NotificationPermission
from .serializers import AnnouncementSerializer, MessageCreateSerializer, MessageSerializer, NotificationSerializer

User = get_user_model()


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [MessagePermission]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.select_related("sender", "recipient").filter(
            Q(sender=user) | Q(recipient=user)
        )

    def get_serializer_class(self):
        if self.action == "create":
            return MessageCreateSerializer
        return MessageSerializer

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        Notification.objects.create(
            user=message.recipient,
            title="New Message",
            message=f"You have a new message from {self.request.user.username}.",
            category=Notification.Category.MESSAGE,
        )

    @action(detail=False, methods=["get"])
    def conversations(self, request):
        user = request.user

        base = Message.objects.filter(Q(sender=user) | Q(recipient=user)).annotate(
            partner_id=Case(
                When(sender=user, then=F("recipient_id")),
                default=F("sender_id"),
                output_field=IntegerField(),
            )
        )

        latest_message_subquery = base.filter(partner_id=OuterRef("partner_id")).order_by("-created_at")

        conversations = (
            base.values("partner_id")
            .annotate(
                last_message_at=Max("created_at"),
                unread_count=Count("id", filter=Q(recipient=user, is_read=False)),
                last_message=Subquery(latest_message_subquery.values("content")[:1]),
            )
            .order_by("-last_message_at")
        )

        partners = User.objects.in_bulk([row["partner_id"] for row in conversations])

        data = []
        for row in conversations:
            partner = partners.get(row["partner_id"])
            if partner is None:
                continue
            data.append(
                {
                    "partner": {
                        "id": partner.id,
                        "username": partner.username,
                        "role": partner.role,
                    },
                    "last_message": row["last_message"],
                    "last_message_at": row["last_message_at"],
                    "unread_count": row["unread_count"],
                }
            )

        return Response(data)

    @action(detail=True, methods=["patch"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        message = self.get_object()
        if message.recipient_id != request.user.id:
            raise PermissionDenied("Only the recipient can mark this message as read.")
        if not message.is_read:
            message.is_read = True
            message.save(update_fields=["is_read"])
        return Response({"status": "read"})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [NotificationPermission]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["patch"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response({"status": "read"})

    @action(detail=False, methods=["patch"], url_path="mark-all-read")
    def mark_all_read(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"updated": count})


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [AnnouncementPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Announcement.objects.select_related("author").prefetch_related("recipients")

        if user.role in {User.Role.PASTOR, User.Role.STAFF}:
            return qs
        return qs.filter(Q(recipients=user) | Q(recipients__isnull=True)).distinct()

    def perform_create(self, serializer):
        announcement = serializer.save(author=self.request.user)

        recipient_ids = list(announcement.recipients.values_list("id", flat=True))
        if not recipient_ids:
            recipient_ids = list(User.objects.exclude(pk=self.request.user.pk).values_list("id", flat=True))

        Notification.objects.bulk_create(
            [
                Notification(
                    user_id=user_id,
                    title=f"Announcement: {announcement.title}",
                    message=announcement.message,
                    category=Notification.Category.ANNOUNCEMENT,
                )
                for user_id in recipient_ids
            ]
        )
