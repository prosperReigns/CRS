from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ("pastor", "Pastor"),
        ("staff", "Church Staff"),
        ("fellowship_leader", "Fellowship Leader"),
        ("cell_leader", "Cell Leader"),
        ("teacher", "Bible Study Teacher"),
        ("member", "Member"),
    ]

    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"