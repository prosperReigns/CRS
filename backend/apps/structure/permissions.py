from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User
from apps.accounts.responsibilities import has_staff_permission


class FellowshipPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            if not request.user or not request.user.is_authenticated:
                return False
            if request.user.role == User.Role.STAFF:
                return has_staff_permission(request.user, "manage_cells")
            return True
        if request.user.role == User.Role.PASTOR:
            return True
        if request.user.role == User.Role.STAFF:
            return has_staff_permission(request.user, "manage_cells")
        return False


class CellPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            if not request.user or not request.user.is_authenticated:
                return False
            if request.user.role == User.Role.STAFF:
                return has_staff_permission(request.user, "manage_cells")
            return True
        if request.user.role in {User.Role.PASTOR, User.Role.FELLOWSHIP_LEADER}:
            return True
        if request.user.role == User.Role.STAFF:
            return has_staff_permission(request.user, "manage_cells")
        return False


class BibleStudyClassPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            if not request.user or not request.user.is_authenticated:
                return False
            if request.user.role == User.Role.STAFF:
                return has_staff_permission(request.user, "manage_cells")
            return True
        if request.user.role in {
            User.Role.PASTOR,
            User.Role.FELLOWSHIP_LEADER,
            User.Role.CELL_LEADER,
        }:
            return True
        if request.user.role == User.Role.STAFF:
            return has_staff_permission(request.user, "manage_cells")
        return False
