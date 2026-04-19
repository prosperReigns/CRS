from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class MemberProfilePermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return request.user.role in {
            User.Role.PASTOR,
            User.Role.ADMIN,
            User.Role.STAFF,
            User.Role.FELLOWSHIP_LEADER,
            User.Role.CELL_LEADER,
        }

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            if request.user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
                return True
            if request.user.role == User.Role.FELLOWSHIP_LEADER:
                return obj.cell and obj.cell.fellowship.leader_id == request.user.id
            if request.user.role == User.Role.CELL_LEADER:
                return obj.cell and obj.cell.leader_id == request.user.id
            return obj.user_id == request.user.id

        if request.user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
            return True
        if request.user.role == User.Role.FELLOWSHIP_LEADER:
            return obj.cell and obj.cell.fellowship.leader_id == request.user.id
        if request.user.role == User.Role.CELL_LEADER:
            return obj.cell and obj.cell.leader_id == request.user.id
        return False


class SoulWinningPermission(MemberProfilePermission):
    def has_object_permission(self, request, view, obj):
        return super().has_object_permission(request, view, obj.member)


class AttendancePermission(MemberProfilePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return request.user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}

    def has_object_permission(self, request, view, obj):
        if obj.member is None:
            return request.user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}
        return super().has_object_permission(request, view, obj.member)
