from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class FellowshipPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return request.user.role in {User.Role.PASTOR, User.Role.STAFF}


class CellPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return request.user.role in {User.Role.PASTOR, User.Role.STAFF, User.Role.FELLOWSHIP_LEADER}


class BibleStudyClassPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return request.user.role in {
            User.Role.PASTOR,
            User.Role.STAFF,
            User.Role.FELLOWSHIP_LEADER,
            User.Role.CELL_LEADER,
        }
