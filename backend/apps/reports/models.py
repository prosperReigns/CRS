from django.conf import settings
from django.db import models

from apps.members.models import MemberProfile
from apps.structure.models import Cell

User = settings.AUTH_USER_MODEL


class CellReport(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REVIEWED = "reviewed", "Reviewed"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    cell = models.ForeignKey(Cell, on_delete=models.CASCADE, related_name="reports")
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="submitted_reports")
    meeting_date = models.DateField(db_index=True)
    attendees = models.ManyToManyField(MemberProfile, related_name="cell_reports")
    attendance_count = models.PositiveIntegerField(default=0)
    new_members = models.PositiveIntegerField(default=0)
    offering_amount = models.DecimalField(max_digits=12, decimal_places=2)
    summary = models.TextField()
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
