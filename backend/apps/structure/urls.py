from rest_framework.routers import DefaultRouter

from .views import BibleStudyClassViewSet, CellViewSet, FellowshipViewSet

router = DefaultRouter()
router.register("fellowships", FellowshipViewSet, basename="fellowship")
router.register("cells", CellViewSet, basename="cell")
router.register("classes", BibleStudyClassViewSet, basename="bible-study-class")

urlpatterns = router.urls
