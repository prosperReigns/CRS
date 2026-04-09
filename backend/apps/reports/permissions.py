from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class CellReportPermission(BasePermission):
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
            User.Role.FELLOWSHIP_LEADER,
            User.Role.CELL_LEADER,
        }

    def has_object_permission(self, request, view, obj):
        role = request.user.role
        if role in {User.Role.PASTOR, User.Role.STAFF}:
            return True
        if role == User.Role.FELLOWSHIP_LEADER:
            return obj.cell.fellowship.leader_id == request.user.id
        if role == User.Role.CELL_LEADER:
            return obj.cell.leader_id == request.user.id
        return False
