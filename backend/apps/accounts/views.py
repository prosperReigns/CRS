from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsPastorOrStaff, IsSelfOrPastorOrStaff
from .serializers import LoginTokenSerializer, UserCreateSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    serializer_class = LoginTokenSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")

    def get_permissions(self):
        if self.action in {"list", "create", "update", "partial_update", "destroy"}:
            return [IsPastorOrStaff()]
        if self.action == "retrieve":
            return [IsAuthenticated(), IsSelfOrPastorOrStaff()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in {User.Role.PASTOR, User.Role.STAFF}:
            return User.objects.all().order_by("username")
        return User.objects.filter(pk=user.pk)

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
