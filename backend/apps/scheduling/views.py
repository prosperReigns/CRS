from django.db.models import Q
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets

from apps.accounts.models import User
from .models import ScheduleEvent
from .permissions import ScheduleEventPermission
from .serializers import ScheduleEventSerializer


class ScheduleEventViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleEventSerializer
    permission_classes = [ScheduleEventPermission]
    search_fields = ["title", "description", "location"]
    ordering_fields = ["start_datetime", "end_datetime", "created_at", "updated_at", "title"]
    ordering = ["start_datetime"]

    def get_queryset(self):
        user = self.request.user
        queryset = ScheduleEvent.objects.select_related("created_by").prefetch_related("participants").all()

        if user.role not in {User.Role.ADMIN, User.Role.PASTOR, User.Role.STAFF}:
            queryset = queryset.filter(Q(created_by=user) | Q(participants=user)).distinct()

        start_param = self.request.query_params.get("start")
        end_param = self.request.query_params.get("end")

        start_datetime = parse_datetime(start_param) if start_param else None
        end_datetime = parse_datetime(end_param) if end_param else None

        if start_datetime and end_datetime:
            queryset = queryset.filter(start_datetime__lt=end_datetime, end_datetime__gt=start_datetime)
        elif start_datetime:
            queryset = queryset.filter(end_datetime__gte=start_datetime)
        elif end_datetime:
            queryset = queryset.filter(start_datetime__lte=end_datetime)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
