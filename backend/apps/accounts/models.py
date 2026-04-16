from django.contrib.auth.models import AbstractUser
from django.db import models


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
    is_frozen = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"
