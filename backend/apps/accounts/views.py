from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsPastorOrStaff, IsSelfOrPastorOrStaff
from .serializers import LoginTokenSerializer, UserCreateSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    serializer_class = LoginTokenSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")

    def get_permissions(self):
        if self.action == "destroy":
            return [IsPastorOrStaff()]
        if self.action in {"update", "partial_update"}:
            return [IsAuthenticated()]
        if self.action in {"list", "create"}:
            return [IsAuthenticated()]
        if self.action == "retrieve":
            return [IsAuthenticated(), IsSelfOrPastorOrStaff()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in {User.Role.PASTOR, User.Role.STAFF}:
            return User.objects.all().order_by("username")
        if user.role == User.Role.FELLOWSHIP_LEADER:
            return (
                User.objects.filter(
                    Q(member_profile__cell__fellowship__leader=user)
                    | Q(led_cells__fellowship__leader=user)
                )
                .distinct()
                .order_by("username")
            )
        return User.objects.filter(pk=user.pk)

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = self.request.user
        role = serializer.validated_data.get("role")

        if user.role in {User.Role.PASTOR, User.Role.STAFF}:
            serializer.save()
            return
        if user.role == User.Role.FELLOWSHIP_LEADER and role == User.Role.CELL_LEADER:
            serializer.save()
            return
        raise PermissionDenied(f"You are not allowed to create users with the '{role}' role.")

    def _validate_role_assignment(self, acting_user, target_user, role):
        allowed_target_roles = {
            User.Role.MEMBER,
            User.Role.FELLOWSHIP_LEADER,
            User.Role.CELL_LEADER,
        }
        assignable_roles = {User.Role.FELLOWSHIP_LEADER, User.Role.CELL_LEADER}

        if role not in assignable_roles:
            raise PermissionDenied("You can only assign fellowship leader or cell leader roles.")
        if target_user.role not in allowed_target_roles:
            raise PermissionDenied("Only member records can be assigned to leadership roles.")
        if acting_user.role in {User.Role.PASTOR, User.Role.STAFF}:
            return
        if acting_user.role == User.Role.FELLOWSHIP_LEADER:
            return
        raise PermissionDenied("You are not allowed to assign leadership roles.")

    def perform_update(self, serializer):
        acting_user = self.request.user
        target_user = self.get_object()

        if acting_user.role in {User.Role.PASTOR, User.Role.STAFF}:
            serializer.save()
            return

        if acting_user.role != User.Role.FELLOWSHIP_LEADER:
            raise PermissionDenied("You are not allowed to update user records.")

        submitted_fields = set(serializer.validated_data.keys())
        if submitted_fields != {"role"}:
            raise PermissionDenied("Fellowship leaders can only assign member leadership roles.")

        self._validate_role_assignment(acting_user, target_user, serializer.validated_data["role"])
        serializer.save()

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
