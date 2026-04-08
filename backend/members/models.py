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

    join_date = models.DateField()

    def __str__(self):
        return self.user.username