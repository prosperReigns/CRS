from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class MessagePermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return obj.sender_id == request.user.id or obj.recipient_id == request.user.id


class NotificationPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id


class AnnouncementPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            if request.user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
                return True
            return obj.recipients.filter(pk=request.user.pk).exists() or obj.recipients.count() == 0
        return request.user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}
