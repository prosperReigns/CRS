from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import User
from apps.accounts.responsibilities import has_staff_permission
from .models import BibleStudyClass, Cell, Fellowship
from .permissions import BibleStudyClassPermission, CellPermission, FellowshipPermission
from .serializers import BibleStudyClassSerializer, CellSerializer, FellowshipSerializer


class FellowshipViewSet(viewsets.ModelViewSet):
    serializer_class = FellowshipSerializer
    permission_classes = [FellowshipPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Fellowship.objects.select_related("leader").all()

        if user.role in {User.Role.PASTOR, User.Role.ADMIN}:
            return qs
        if user.role == User.Role.STAFF:
            return qs if has_staff_permission(user, "manage_cells") else qs.none()
        if user.role == User.Role.FELLOWSHIP_LEADER:
            return qs.filter(leader=user)
        if user.role == User.Role.CELL_LEADER:
            return qs.filter(cells__leader=user).distinct()
        return qs.none()


class CellViewSet(viewsets.ModelViewSet):
    serializer_class = CellSerializer
    permission_classes = [CellPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Cell.objects.select_related("fellowship", "leader").all()

        if user.role in {User.Role.PASTOR, User.Role.ADMIN}:
            return qs
        if user.role == User.Role.STAFF:
            return qs if has_staff_permission(user, "manage_cells") else qs.none()
        if user.role == User.Role.FELLOWSHIP_LEADER:
            return qs.filter(fellowship__leader=user)
        if user.role == User.Role.CELL_LEADER:
            return qs.filter(leader=user)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        fellowship = serializer.validated_data["fellowship"]
        if user.role == User.Role.FELLOWSHIP_LEADER and fellowship.leader_id != user.id:
            raise PermissionDenied("You can only create cells under your fellowship.")
        serializer.save()


class BibleStudyClassViewSet(viewsets.ModelViewSet):
    serializer_class = BibleStudyClassSerializer
    permission_classes = [BibleStudyClassPermission]

    def get_queryset(self):
        user = self.request.user
        qs = BibleStudyClass.objects.select_related("cell", "cell__fellowship", "teacher").all()

        if user.role in {User.Role.PASTOR, User.Role.ADMIN}:
            return qs
        if user.role == User.Role.STAFF:
            return qs if has_staff_permission(user, "manage_cells") else qs.none()
        if user.role == User.Role.FELLOWSHIP_LEADER:
            return qs.filter(cell__fellowship__leader=user)
        if user.role == User.Role.CELL_LEADER:
            return qs.filter(cell__leader=user)
        if user.role == User.Role.TEACHER:
            return qs.filter(teacher=user)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        cell = serializer.validated_data["cell"]

        if user.role == User.Role.FELLOWSHIP_LEADER and cell.fellowship.leader_id != user.id:
            raise PermissionDenied("You can only create classes in your fellowship.")
        if user.role == User.Role.CELL_LEADER and cell.leader_id != user.id:
            raise PermissionDenied("You can only create classes in your cell.")

        serializer.save()
