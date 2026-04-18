from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User
from apps.accounts.responsibilities import has_staff_permission


class CellReportPermission(BasePermission):
    @staticmethod
    def _is_fellowship_owner(user, obj):
        return obj.cell.fellowship.leader_id == user.id

    @staticmethod
    def _is_cell_owner(user, obj):
        return obj.cell.leader_id == user.id

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        role = request.user.role
        if request.method in SAFE_METHODS:
            if role == User.Role.STAFF:
                return has_staff_permission(request.user, "view_reports")
            return True

        if view.action in {"review"}:
            return (
                role == User.Role.FELLOWSHIP_LEADER
                or role == User.Role.PASTOR
                or (role == User.Role.STAFF and has_staff_permission(request.user, "review_reports"))
            )
        if view.action in {"approve", "reject"}:
            return role == User.Role.PASTOR
        if view.action in {"comment"}:
            return role in {User.Role.FELLOWSHIP_LEADER, User.Role.PASTOR}

        if role == User.Role.STAFF:
            return has_staff_permission(request.user, "view_reports")

        return role in {
            User.Role.PASTOR,
            User.Role.CELL_LEADER,
        }

    def has_object_permission(self, request, view, obj):
        role = request.user.role
        if request.method in SAFE_METHODS:
            if role == User.Role.PASTOR:
                return True
            if role == User.Role.STAFF:
                return has_staff_permission(request.user, "view_reports")
            if role == User.Role.FELLOWSHIP_LEADER:
                return self._is_fellowship_owner(request.user, obj)
            if role == User.Role.CELL_LEADER:
                return self._is_cell_owner(request.user, obj)
            return False

        if role == User.Role.PASTOR:
            return True
        if role == User.Role.STAFF:
            if view.action == "review":
                return has_staff_permission(request.user, "review_reports")
            return has_staff_permission(request.user, "view_reports")
        if view.action in {"review", "comment"} and role == User.Role.FELLOWSHIP_LEADER:
            return self._is_fellowship_owner(request.user, obj)
        if view.action in {"update", "partial_update", "destroy"} and role == User.Role.CELL_LEADER:
            return self._is_cell_owner(request.user, obj)
        return False
