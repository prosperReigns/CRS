from django.db import models
from django.conf import settings
from structure.models import Cell

User = settings.AUTH_USER_MODEL

class MemberProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    cell = models.ForeignKey(Cell, on_delete=models.SET_NULL, null=True, related_name="members")

    is_baptised = models.BooleanField(default=False)
    foundation_completed = models.BooleanField(default=False)
    is_partner = models.BooleanField(default=False)

    souls_won = models.IntegerField(default=0)

    join_date = models.DateField()
    last_attended = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.user.username

class SoulWinning(models.Model):
    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name="evangelism_records")

    date = models.DateField()
    converts = models.IntegerField(default=0)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.member.user.username} - {self.date}"

class Attendance(models.Model):
    SERVICE_CHOICES = [
        ("sunday", "Sunday Service"),
        ("midweek", "Midweek Service"),
        ("special", "Special Service"),
    ]

    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name="attendance_records")

    date = models.DateField()
    service_type = models.CharField(max_length=20, choices=SERVICE_CHOICES, default="sunday")

    present = models.BooleanField(default=True)

    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("member", "date", "service_type")

    def __str__(self):
        return f"{self.member.user.username} - {self.date}"