from rest_framework.routers import DefaultRouter
from .views import FellowshipViewSet, CellViewSet, BibleStudyClassViewSet

router = DefaultRouter()
router.register("fellowships", FellowshipViewSet)
router.register("cells", CellViewSet)
router.register("classes", BibleStudyClassViewSet)

urlpatterns = router.urls