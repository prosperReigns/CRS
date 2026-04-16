from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class CellReportPermission(BasePermission):
    @staticmethod
    def _is_admin(role):
        return role in {User.Role.PASTOR, User.Role.STAFF}

    @staticmethod
    def _is_fellowship_owner(user, obj):
        return obj.cell.fellowship.leader_id == user.id

    @staticmethod
    def _is_cell_owner(user, obj):
        return obj.cell.leader_id == user.id

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        if view.action in {"review"}:
            return request.user.role == User.Role.FELLOWSHIP_LEADER
        if view.action in {"approve", "reject"}:
            return request.user.role == User.Role.PASTOR
        if view.action in {"comment"}:
            return request.user.role in {User.Role.FELLOWSHIP_LEADER, User.Role.PASTOR}

        return request.user.role in {
            User.Role.PASTOR,
            User.Role.STAFF,
            User.Role.CELL_LEADER,
        }

    def has_object_permission(self, request, view, obj):
        role = request.user.role
        if request.method in SAFE_METHODS:
            if self._is_admin(role):
                return True
            if role == User.Role.FELLOWSHIP_LEADER:
                return self._is_fellowship_owner(request.user, obj)
            if role == User.Role.CELL_LEADER:
                return self._is_cell_owner(request.user, obj)
            return False

        if self._is_admin(role):
            return True
        if view.action in {"review", "comment"} and role == User.Role.FELLOWSHIP_LEADER:
            return self._is_fellowship_owner(request.user, obj)
        if view.action in {"update", "partial_update", "destroy"} and role == User.Role.CELL_LEADER:
            return self._is_cell_owner(request.user, obj)
        return False
