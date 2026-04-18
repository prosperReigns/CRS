from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AssignCellLeaderView,
    AssignFellowshipLeaderView,
    CreateLeaderView,
    LoginView,
    StaffResponsibilityViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("staff-responsibilities", StaffResponsibilityViewSet, basename="staff-responsibility")

urlpatterns = router.urls + [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("assign-cell-leader/", AssignCellLeaderView.as_view(), name="assign-cell-leader"),
    path("assign-fellowship-leader/", AssignFellowshipLeaderView.as_view(), name="assign-fellowship-leader"),
    path("create-leader/", CreateLeaderView.as_view(), name="create-leader"),
]
