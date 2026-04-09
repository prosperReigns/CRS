from rest_framework.routers import DefaultRouter

from .views import AttendanceViewSet, MemberProfileViewSet, SoulWinningViewSet

router = DefaultRouter()
router.register("profiles", MemberProfileViewSet, basename="member-profile")
router.register("soul-winning", SoulWinningViewSet, basename="soul-winning")
router.register("attendance", AttendanceViewSet, basename="attendance")

urlpatterns = router.urls
