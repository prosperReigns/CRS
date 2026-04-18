from django.contrib.auth.models import AbstractUser
from django.db import models


class StaffResponsibility(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(AbstractUser):
    class Role(models.TextChoices):
        PASTOR = "pastor", "Pastor"
        STAFF = "staff", "Church Staff"
        FELLOWSHIP_LEADER = "fellowship_leader", "Fellowship Leader"
        CELL_LEADER = "cell_leader", "Cell Leader"
        TEACHER = "teacher", "Bible Study Teacher"
        MEMBER = "member", "Member"

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.MEMBER,
        db_index=True,
    )
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)
    is_frozen = models.BooleanField(default=False)
    staff_responsibilities = models.ManyToManyField(
        StaffResponsibility,
        blank=True,
        related_name="users",
    )

    class Meta:
        indexes = [
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.role != self.Role.STAFF and self.staff_responsibilities.exists():
            self.staff_responsibilities.clear()
