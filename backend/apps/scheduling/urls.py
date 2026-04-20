from rest_framework.routers import DefaultRouter

from .views import ScheduleEventViewSet, TodoItemViewSet

router = DefaultRouter()
router.register("events", ScheduleEventViewSet, basename="schedule-event")
router.register("todos", TodoItemViewSet, basename="todo-item")

urlpatterns = router.urls
