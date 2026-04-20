from django.contrib import admin

from .models import ScheduleEvent


@admin.register(ScheduleEvent)
class ScheduleEventAdmin(admin.ModelAdmin):
    list_display = ("title", "event_type", "start_datetime", "end_datetime", "all_day", "created_by")
    list_filter = ("event_type", "all_day", "start_datetime")
    search_fields = ("title", "description", "location", "created_by__username")

# Register your models here.
