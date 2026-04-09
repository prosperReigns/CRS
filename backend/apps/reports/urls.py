from django.urls import path
from rest_framework.routers import DefaultRouter

from .analytics import DashboardAnalyticsView
from .views import CellReportViewSet

router = DefaultRouter()
router.register("reports", CellReportViewSet, basename="cell-report")

urlpatterns = router.urls + [
    path("analytics/", DashboardAnalyticsView.as_view(), name="dashboard-analytics"),
]
