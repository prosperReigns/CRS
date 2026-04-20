from django.contrib import admin

from .models import ScheduleEvent, TodoItem


@admin.register(ScheduleEvent)
class ScheduleEventAdmin(admin.ModelAdmin):
    list_display = ("title", "event_type", "start_datetime", "end_datetime", "all_day", "created_by")
    list_filter = ("event_type", "all_day", "start_datetime")
    search_fields = ("title", "description", "location", "created_by__username")


@admin.register(TodoItem)
class TodoItemAdmin(admin.ModelAdmin):
    list_display = ("title", "priority", "due_date", "is_completed", "created_by", "completed_at")
    list_filter = ("priority", "is_completed", "due_date")
    search_fields = ("title", "description", "created_by__username")
