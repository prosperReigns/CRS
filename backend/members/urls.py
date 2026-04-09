from rest_framework.routers import DefaultRouter
from .views import MemberProfileViewSet, SoulWinningViewSet, AttendanceViewSet

router = DefaultRouter()
router.register("members", MemberProfileViewSet)
router.register("soul-winning", SoulWinningViewSet)
router.register("attendance", AttendanceViewSet)

urlpatterns = router.urls