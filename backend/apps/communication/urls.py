from rest_framework.routers import DefaultRouter

from .views import AnnouncementViewSet, MessageViewSet, NotificationViewSet

router = DefaultRouter()
router.register("messages", MessageViewSet, basename="message")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("announcements", AnnouncementViewSet, basename="announcement")

urlpatterns = router.urls
