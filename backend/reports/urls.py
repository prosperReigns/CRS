from rest_framework.routers import DefaultRouter, path
from .views import CellReportViewSet
from .analytics import DashboardAnalyticsView


router = DefaultRouter()
router.register("reports", CellReportViewSet)

urlpatterns = router.urls + [
    path("analytics/", DashboardAnalyticsView.as_view(), name="dashboard-analytics"),
]