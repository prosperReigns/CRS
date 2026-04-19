from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.structure.models import Cell

User = settings.AUTH_USER_MODEL


class Person(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["first_name", "last_name", "id"]
        indexes = [
            models.Index(fields=["first_name", "last_name"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["email"]),
        ]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.full_name or f"Person {self.pk}"


class MemberProfile(models.Model):
    class MembershipStatus(models.TextChoices):
        VISITOR = "visitor", "Visitor"
        FIRST_TIMER = "first_timer", "First Timer"
        REGULAR = "regular", "Regular Attender"
        MEMBER = "member", "Member"

    person = models.OneToOneField(
        Person,
        on_delete=models.CASCADE,
        related_name="member_profile",
        null=True,
        blank=True,
    )
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
    membership_status = models.CharField(
        max_length=20,
        choices=MembershipStatus.choices,
        default=MembershipStatus.VISITOR,
        db_index=True,
    )
    attendance_count = models.IntegerField(default=0)
    is_first_timer = models.BooleanField(default=False)
    first_visit_date = models.DateField(null=True, blank=True)
    follow_up_status = models.CharField(max_length=50, blank=True)
    visitation_notes = models.TextField(blank=True)
    visitation_fellowship_leader = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_first_timers_as_fellowship_leader",
    )
    visitation_cell_leader = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_first_timers_as_cell_leader",
    )
    is_partner = models.BooleanField(default=False)
    partnership_date = models.DateField(null=True, blank=True)
    partnership_level = models.CharField(max_length=50, blank=True)
    souls_won = models.PositiveIntegerField(default=0)
    join_date = models.DateField(default=timezone.localdate)
    last_attended = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["person__first_name", "person__last_name", "user__username"]
        indexes = [
            models.Index(fields=["cell"]),
            models.Index(fields=["last_attended"]),
            models.Index(fields=["membership_status"]),
        ]

    def __str__(self):
        if self.person_id:
            return self.person.full_name or f"Profile {self.pk}"
        return self.user.username


class VisitationReport(models.Model):
    class Method(models.TextChoices):
        CALLING = "calling", "Calling"
        ONE_ON_ONE = "one_on_one_visitation", "One on One Visitation"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"

    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name="visitation_reports")
    assigned_leader = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="submitted_visitation_reports",
    )
    visitation_date = models.DateField()
    visitation_time = models.TimeField()
    method_used = models.CharField(max_length=32, choices=Method.choices)
    comment = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_visitation_reports",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-visitation_date", "-visitation_time", "-id"]
        indexes = [
            models.Index(fields=["assigned_leader", "status"]),
            models.Index(fields=["member", "status"]),
            models.Index(fields=["status", "visitation_date"]),
        ]

    def __str__(self):
        return f"{self.member.user.username} - {self.assigned_leader_id} - {self.visitation_date}"


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

    person = models.ForeignKey(
        Person,
        on_delete=models.CASCADE,
        related_name="service_attendance_records",
        null=True,
        blank=True,
    )
    member = models.ForeignKey(
        MemberProfile,
        on_delete=models.CASCADE,
        related_name="attendance_records",
        null=True,
        blank=True,
    )
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
        ordering = ["-date", "person__first_name", "person__last_name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["member", "date", "service_type"],
                name="uniq_member_attendance_per_service",
            ),
            models.UniqueConstraint(
                fields=["member", "date", "service"],
                name="uniq_member_attendance_per_church_service",
                condition=Q(service__isnull=False),
            ),
            models.UniqueConstraint(
                fields=["person", "date", "service_type"],
                name="uniq_person_attendance_per_service",
                condition=Q(person__isnull=False),
            ),
            models.UniqueConstraint(
                fields=["person", "date", "service"],
                name="uniq_person_attendance_per_church_service",
                condition=Q(person__isnull=False) & Q(service__isnull=False),
            ),
        ]
        indexes = [
            models.Index(fields=["date", "service_type"]),
            models.Index(fields=["date", "service"]),
            models.Index(fields=["member", "date"]),
            models.Index(fields=["person", "date"]),
        ]

    def __str__(self):
        service = getattr(self, "service", None)
        service_label = service.name if service else self.service_type
        person_label = self.person.full_name if self.person_id else (self.member.user.username if self.member_id else "Unknown")
        return f"{person_label} - {self.date} ({service_label})"


class FirstTimerEvent(models.Model):
    class EventType(models.TextChoices):
        CELL = "cell", "Cell"
        SERVICE = "service", "Service"

    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="first_timer_events")
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    event_date = models.DateField()
    handled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-event_date", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["person", "event_type"], name="uniq_first_timer_event_per_source"),
        ]
        indexes = [
            models.Index(fields=["event_type", "handled"]),
            models.Index(fields=["person", "event_type"]),
        ]

    def __str__(self):
        return f"{self.person} - {self.event_type} ({self.event_date})"


class CellMembership(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="cell_memberships")
    cell = models.ForeignKey(Cell, on_delete=models.CASCADE, related_name="person_memberships")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["person", "cell"], name="uniq_person_cell_membership"),
        ]
        indexes = [
            models.Index(fields=["cell", "is_active"]),
            models.Index(fields=["person", "is_active"]),
        ]

    def __str__(self):
        return f"{self.person} @ {self.cell.name}"
