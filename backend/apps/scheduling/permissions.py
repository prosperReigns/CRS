from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class ScheduleEventPermission(BasePermission):
    editor_roles = {
        User.Role.ADMIN,
        User.Role.PASTOR,
        User.Role.STAFF,
        User.Role.FELLOWSHIP_LEADER,
        User.Role.CELL_LEADER,
    }

    elevated_roles = {
        User.Role.ADMIN,
        User.Role.PASTOR,
        User.Role.STAFF,
    }

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return user.role in self.editor_roles

    def has_object_permission(self, request, view, obj):
        user = request.user
        if request.method in SAFE_METHODS:
            if user.role in self.elevated_roles:
                return True
            return obj.created_by_id == user.id or obj.participants.filter(id=user.id).exists()
        if user.role in self.elevated_roles:
            return True
        return obj.created_by_id == user.id


class TodoItemPermission(BasePermission):
    editor_roles = {
        User.Role.ADMIN,
        User.Role.PASTOR,
        User.Role.STAFF,
        User.Role.FELLOWSHIP_LEADER,
        User.Role.CELL_LEADER,
    }

    elevated_roles = {
        User.Role.ADMIN,
        User.Role.PASTOR,
        User.Role.STAFF,
    }

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.role in self.editor_roles

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in self.elevated_roles:
            return True
        return obj.created_by_id == user.id
