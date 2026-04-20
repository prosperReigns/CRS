from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone


User = settings.AUTH_USER_MODEL


class ScheduleEvent(models.Model):
    class EventType(models.TextChoices):
        SERVICE = "service", "Service"
        MEETING = "meeting", "Meeting"
        COUNSELING = "counseling", "Counseling"
        OUTREACH = "outreach", "Outreach"
        TRAINING = "training", "Training"
        ADMINISTRATIVE = "administrative", "Administrative"
        OTHER = "other", "Other"

    title = models.CharField(max_length=200, db_index=True)
    description = models.TextField(blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    start_datetime = models.DateTimeField(db_index=True)
    end_datetime = models.DateTimeField(db_index=True)
    all_day = models.BooleanField(default=False)
    event_type = models.CharField(max_length=30, choices=EventType.choices, default=EventType.MEETING, db_index=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_schedule_events",
    )
    participants = models.ManyToManyField(User, blank=True, related_name="schedule_events")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_datetime", "title"]
        indexes = [
            models.Index(fields=["start_datetime", "end_datetime"]),
            models.Index(fields=["created_by", "start_datetime"]),
        ]

    def clean(self):
        if self.end_datetime <= self.start_datetime:
            raise ValidationError({"end_datetime": "End date/time must be after start date/time."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.start_datetime} - {self.end_datetime})"


class TodoItem(models.Model):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    title = models.CharField(max_length=200, db_index=True)
    description = models.TextField(blank=True, default="")
    due_date = models.DateField(null=True, blank=True, db_index=True)
    is_completed = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM, db_index=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_todo_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["is_completed", "due_date", "-created_at"]
        indexes = [
            models.Index(fields=["created_by", "is_completed"]),
            models.Index(fields=["due_date", "is_completed"]),
        ]

    def save(self, *args, **kwargs):
        if self.is_completed and self.completed_at is None:
            self.completed_at = timezone.now()
        if not self.is_completed:
            self.completed_at = None
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.title
