from rest_framework.routers import DefaultRouter

from .views import ScheduleEventViewSet

router = DefaultRouter()
router.register("events", ScheduleEventViewSet, basename="schedule-event")

urlpatterns = router.urls
