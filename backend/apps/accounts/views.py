from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.members.models import MemberProfile
from apps.structure.models import Cell, Fellowship
from .models import StaffResponsibility, User
from .permissions import IsPastorOrStaff, IsSelfOrPastorOrStaff
from .responsibilities import has_staff_permission
from .services import assign_cell_leader, assign_fellowship_leader, create_leader_account
from .serializers import (
    AssignCellLeaderSerializer,
    AssignFellowshipLeaderSerializer,
    ChangePasswordSerializer,
    CreateLeaderSerializer,
    LoginTokenSerializer,
    StaffResponsibilitySerializer,
    UserCreateSerializer,
    UserSerializer,
    UserSettingsSerializer,
)


class LoginView(TokenObtainPairView):
    serializer_class = LoginTokenSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.prefetch_related("staff_responsibilities").all().order_by("username")
    settings_roles = {
        User.Role.PASTOR,
        User.Role.ADMIN,
        User.Role.STAFF,
        User.Role.FELLOWSHIP_LEADER,
        User.Role.CELL_LEADER,
    }

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
        if user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
            return User.objects.prefetch_related("staff_responsibilities").all().order_by("username")
        if user.role == User.Role.FELLOWSHIP_LEADER:
            return (
                User.objects.filter(
                    Q(member_profile__cell__fellowship__leader=user)
                    | Q(led_cells__fellowship__leader=user)
                )
                .prefetch_related("staff_responsibilities")
                .distinct()
                .order_by("username")
            )
        return User.objects.filter(pk=user.pk).prefetch_related("staff_responsibilities")

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = self.request.user
        role = serializer.validated_data.get("role")

        if user.role in {User.Role.PASTOR, User.Role.ADMIN}:
            serializer.save()
            return
        if user.role == User.Role.STAFF:
            if role in {User.Role.CELL_LEADER, User.Role.FELLOWSHIP_LEADER}:
                if not has_staff_permission(user, "manage_cells"):
                    raise PermissionDenied(
                        "Only staff with cell ministry responsibility can create fellowship leader or cell leader accounts."
                    )
                serializer.save()
                return
            if role == User.Role.MEMBER:
                serializer.save()
                return
            raise PermissionDenied("Staff can only create member, fellowship leader, or cell leader accounts.")
        if user.role == User.Role.FELLOWSHIP_LEADER and role == User.Role.CELL_LEADER:
            serializer.save()
            return
        raise PermissionDenied(f"You are not allowed to create users with the '{role}' role.")

    def _enforce_role_assignment_rules(self, acting_user, target_user, role):
        allowed_target_roles = {
            User.Role.MEMBER,
            User.Role.FELLOWSHIP_LEADER,
            User.Role.CELL_LEADER,
        }
        assignable_roles = {User.Role.FELLOWSHIP_LEADER, User.Role.CELL_LEADER}

        if role not in assignable_roles:
            raise PermissionDenied("You can only assign fellowship leader or cell leader roles.")
        if target_user.role not in allowed_target_roles:
            raise PermissionDenied("You can only change roles for members and existing leaders.")
        if acting_user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
            return
        if acting_user.role == User.Role.FELLOWSHIP_LEADER:
            if role != User.Role.CELL_LEADER:
                raise PermissionDenied("Fellowship leaders can only assign the cell leader role.")
            return
        raise PermissionDenied("You are not allowed to assign leadership roles.")

    def perform_update(self, serializer):
        acting_user = self.request.user
        target_user = self.get_object()
        requested_role = serializer.validated_data.get("role")
        if requested_role in {User.Role.FELLOWSHIP_LEADER, User.Role.CELL_LEADER}:
            raise PermissionDenied(
                "Assign leader roles through /api/accounts/assign-fellowship-leader/ or /api/accounts/assign-cell-leader/."
            )

        if acting_user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
            serializer.save()
            return

        if acting_user.role != User.Role.FELLOWSHIP_LEADER:
            raise PermissionDenied("You are not allowed to update user records.")

        submitted_fields = set(serializer.validated_data.keys())
        if submitted_fields != {"role"}:
            raise PermissionDenied("Fellowship leaders can only update the user role field.")

        self._enforce_role_assignment_rules(acting_user, target_user, serializer.validated_data["role"])
        serializer.save()

    @action(detail=False, methods=["get"])
    def me(self, request):
        user = User.objects.prefetch_related("staff_responsibilities").filter(pk=request.user.pk).first() or request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=["get", "patch"], url_path="settings")
    def user_settings(self, request):
        if request.user.role not in self.settings_roles:
            raise PermissionDenied("You are not allowed to access account settings.")

        if request.method.lower() == "get":
            user = User.objects.prefetch_related("staff_responsibilities").filter(pk=request.user.pk).first() or request.user
            serializer = UserSettingsSerializer(user, context={"request": request})
            return Response(serializer.data)

        serializer = UserSettingsSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="change-password")
    def change_password(self, request):
        if request.user.role not in self.settings_roles:
            raise PermissionDenied("You are not allowed to change password from this page.")

        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."})


class AssignCellLeaderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AssignCellLeaderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member = MemberProfile.objects.select_related("user").filter(pk=serializer.validated_data["member_id"]).first()
        if not member:
            raise NotFound("Member profile not found.")

        cell = Cell.objects.select_related("fellowship", "leader").filter(pk=serializer.validated_data["cell_id"]).first()
        if not cell:
            raise NotFound("Cell not found.")

        data = assign_cell_leader(member_profile=member, cell=cell, assigned_by=request.user)
        return Response(data)


class AssignFellowshipLeaderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AssignFellowshipLeaderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member = MemberProfile.objects.select_related("user").filter(pk=serializer.validated_data["member_id"]).first()
        if not member:
            raise NotFound("Member profile not found.")

        fellowship = Fellowship.objects.select_related("leader").filter(pk=serializer.validated_data["fellowship_id"]).first()
        if not fellowship:
            raise NotFound("Fellowship not found.")

        data = assign_fellowship_leader(member_profile=member, fellowship=fellowship, assigned_by=request.user)
        return Response(data)


class CreateLeaderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateLeaderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        data = create_leader_account(
            data=payload,
            role=payload["role"],
            assigned_by=request.user,
        )
        return Response(data, status=201)


class StaffResponsibilityViewSet(viewsets.ModelViewSet):
    serializer_class = StaffResponsibilitySerializer
    queryset = StaffResponsibility.objects.all().order_by("name")
    permission_classes = [IsAuthenticated]

    def _ensure_pastor(self):
        if self.request.user.role not in {User.Role.PASTOR, User.Role.ADMIN}:
            raise PermissionDenied("Only pastors or admins can manage staff responsibilities.")

    def create(self, request, *args, **kwargs):
        self._ensure_pastor()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._ensure_pastor()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._ensure_pastor()
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._ensure_pastor()
        return super().destroy(request, *args, **kwargs)
