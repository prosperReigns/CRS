from rest_framework.permissions import BasePermission

from .models import User


class IsPastorOrStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {User.Role.PASTOR, User.Role.STAFF}
        )


class IsSelfOrPastorOrStaff(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in {User.Role.PASTOR, User.Role.STAFF}:
            return True
        return obj.pk == request.user.pk
