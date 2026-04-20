from django.conf import settings
from django.db import models

from apps.members.models import ChurchService
from apps.members.models import Person
from apps.structure.models import Cell

User = settings.AUTH_USER_MODEL


class CellReport(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        FELLOWSHIP_REVIEWED = "fellowship_reviewed", "Fellowship Reviewed"
        REVIEWED = "reviewed", "Reviewed"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class ReportType(models.TextChoices):
        WEEK1_PRAYER_AND_PLANNING = "week1_prayer_planning", "Week 1 - Prayer and Planning"
        WEEK2_BIBLE_STUDY = "week2_bible_study", "Week 2 - Bible Study"
        WEEK3_BIBLE_STUDY = "week3_bible_study", "Week 3 - Bible Study"
        WEEK4_OUTREACH = "week4_outreach", "Week 4 - Outreach"

    cell = models.ForeignKey(Cell, on_delete=models.CASCADE, related_name="reports")
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="submitted_reports")
    leader = models.ForeignKey(User, on_delete=models.CASCADE)
    meeting_date = models.DateField(db_index=True)
    meeting_time = models.TimeField(null=True, blank=True)
    meeting_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    report_type = models.CharField(
        max_length=32,
        choices=ReportType.choices,
        default=ReportType.WEEK1_PRAYER_AND_PLANNING,
    )
    service = models.ForeignKey(ChurchService, null=True, blank=True, on_delete=models.SET_NULL, related_name="reports")
    attendees = models.ManyToManyField(Person, related_name="cell_reports")
    first_timer_attendees = models.ManyToManyField(Person, related_name="first_timer_reports", blank=True)
    attendance_count = models.PositiveIntegerField(default=0)
    attendee_names = models.TextField(blank=True)
    new_members = models.PositiveIntegerField(default=0)
    offering_amount = models.DecimalField(max_digits=12, decimal_places=2)
    summary = models.TextField()
    review_summary = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        related_name="reviewed_reports",
        on_delete=models.SET_NULL,
    )
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        related_name="approved_reports",
        on_delete=models.SET_NULL,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-meeting_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["cell", "meeting_date"], name="uniq_report_per_cell_per_date"),
        ]
        indexes = [
            models.Index(fields=["cell", "meeting_date"]),
            models.Index(fields=["status", "meeting_date"]),
        ]

    def __str__(self):
        return f"{self.cell.name} - {self.meeting_date}"

    @classmethod
    def infer_report_type(cls, meeting_date):
        # Ministry calendar uses a fixed 4-week cycle per month; dates beyond day 21 map to week 4.
        week_of_month = ((meeting_date.day - 1) // 7) + 1
        if week_of_month <= 1:
            return cls.ReportType.WEEK1_PRAYER_AND_PLANNING
        if week_of_month == 2:
            return cls.ReportType.WEEK2_BIBLE_STUDY
        if week_of_month == 3:
            return cls.ReportType.WEEK3_BIBLE_STUDY
        return cls.ReportType.WEEK4_OUTREACH

    def sync_attendance_count(self, *, save=True):
        self.attendance_count = self.attendees.count()
        if save:
            self.save(update_fields=["attendance_count", "updated_at"])
        return self.attendance_count


class ReportImage(models.Model):
    report = models.ForeignKey(CellReport, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="reports/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at"]

    def __str__(self):
        return f"Image for report {self.report_id}"


class ReportComment(models.Model):
    report = models.ForeignKey(CellReport, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="report_comments")
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["report", "created_at"]),
            models.Index(fields=["author"]),
        ]

    def __str__(self):
        return f"Comment by {self.author_id} on report {self.report_id}"


class ReportActivityLog(models.Model):
    class Action(models.TextChoices):
        CREATED = "created", "Created"
        REVIEWED = "reviewed", "Reviewed"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        COMMENTED = "commented", "Commented"

    report = models.ForeignKey(CellReport, on_delete=models.CASCADE, related_name="activity_logs")
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="report_actions")
    action = models.CharField(max_length=20, choices=Action.choices)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["report", "created_at"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self):
        return f"{self.action} - report {self.report_id}"
