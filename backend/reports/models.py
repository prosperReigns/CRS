from django.db import models
from django.conf import settings
from structure.models import Cell

User = settings.AUTH_USER_MODEL

class CellReport(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("reviewed", "Reviewed"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    cell = models.ForeignKey(Cell, on_delete=models.CASCADE, related_name="reports")
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE)

    meeting_date = models.DateField()

    attendance_count = models.IntegerField()
    new_members = models.IntegerField(default=0)
    offering_amount = models.DecimalField(max_digits=10, decimal_places=2)

    summary = models.TextField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    reviewed_by = models.ForeignKey(User, null=True, blank=True, related_name="reviewed_reports", on_delete=models.SET_NULL)
    approved_by = models.ForeignKey(User, null=True, blank=True, related_name="approved_reports", on_delete=models.SET_NULL)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("cell", "meeting_date")

    def __str__(self):
        return f"{self.cell.name} - {self.meeting_date}"
    
class ReportImage(models.Model):
    report = models.ForeignKey(CellReport, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="reports/")

    def __str__(self):
        return f"Image for {self.report}"

class ReportComment(models.Model):
    report = models.ForeignKey(CellReport, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(User, on_delete=models.CASCADE)

    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.author} - {self.report}"