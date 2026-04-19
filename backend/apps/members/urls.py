from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceViewSet,
    FirstTimerEventViewSet,
    MemberProfileViewSet,
    PersonViewSet,
    SoulWinningViewSet,
    VisitationReportViewSet,
)

router = DefaultRouter()
router.register("profiles", MemberProfileViewSet, basename="member-profile")
router.register("people", PersonViewSet, basename="person")
router.register("soul-winning", SoulWinningViewSet, basename="soul-winning")
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("visitation-reports", VisitationReportViewSet, basename="visitation-report")
router.register("first-timer-events", FirstTimerEventViewSet, basename="first-timer-event")

urlpatterns = router.urls
