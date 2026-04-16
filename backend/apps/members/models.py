from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.structure.models import Cell

User = settings.AUTH_USER_MODEL


class MemberProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="member_profile")
    cell = models.ForeignKey(
        Cell,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
    )
    is_baptised = models.BooleanField(default=False)
    foundation_completed = models.BooleanField(default=False)
    is_partner = models.BooleanField(default=False)
    souls_won = models.PositiveIntegerField(default=0)
    join_date = models.DateField(default=timezone.localdate)
    last_attended = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__username"]
        indexes = [
            models.Index(fields=["cell"]),
            models.Index(fields=["last_attended"]),
        ]

    def __str__(self):
        return self.user.username


class SoulWinning(models.Model):
    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name="evangelism_records")
    date = models.DateField()
    converts = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="soul_winning_records",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["member", "date"]),
        ]

    def __str__(self):
        return f"{self.member.user.username} - {self.date}"


class ChurchService(models.Model):
    class DayOfWeek(models.TextChoices):
        MONDAY = "Monday", "Monday"
        TUESDAY = "Tuesday", "Tuesday"
        WEDNESDAY = "Wednesday", "Wednesday"
        THURSDAY = "Thursday", "Thursday"
        FRIDAY = "Friday", "Friday"
        SATURDAY = "Saturday", "Saturday"
        SUNDAY = "Sunday", "Sunday"

    name = models.CharField(max_length=50)
    day_of_week = models.CharField(max_length=10, choices=DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["day_of_week", "start_time", "name"]
        indexes = [
            models.Index(fields=["is_active", "day_of_week"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.day_of_week}"


class Attendance(models.Model):
    class ServiceType(models.TextChoices):
        SUNDAY = "sunday", "Sunday Service"
        MIDWEEK = "midweek", "Midweek Service"
        SPECIAL = "special", "Special Service"

    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    service = models.ForeignKey(ChurchService, on_delete=models.CASCADE, related_name="attendances", null=True, blank=True)
    service_type = models.CharField(max_length=20, choices=ServiceType.choices, default=ServiceType.SUNDAY)
    present = models.BooleanField(default=True)
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_recorded",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "member__user__username"]
        constraints = [
            models.UniqueConstraint(
                fields=["member", "date", "service_type"],
                name="uniq_member_attendance_per_service",
            ),
            models.UniqueConstraint(
                fields=["member", "date", "service"],
                name="uniq_member_attendance_per_church_service",
            ),
        ]
        indexes = [
            models.Index(fields=["date", "service_type"]),
            models.Index(fields=["date", "service"]),
            models.Index(fields=["member", "date"]),
        ]

    def __str__(self):
        service = getattr(self, "service", None)
        service_label = service.name if service else self.service_type
        return f"{self.member.user.username} - {self.date} ({service_label})"
