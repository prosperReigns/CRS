from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.accounts.models import User
from .models import Attendance, MemberProfile


PROFILE_ROLES = {
    User.Role.MEMBER,
    User.Role.TEACHER,
    User.Role.CELL_LEADER,
    User.Role.FELLOWSHIP_LEADER,
}


@receiver(post_save, sender=User)
def ensure_member_profile(sender, instance, created, **kwargs):
    if instance.role in PROFILE_ROLES:
        MemberProfile.objects.get_or_create(user=instance, defaults={"join_date": timezone.localdate()})


@receiver(post_save, sender=Attendance)
def update_last_attended(sender, instance, **kwargs):
    if not instance.present:
        return

    profile = instance.member
    if profile.last_attended is None or instance.date > profile.last_attended:
        profile.last_attended = instance.date
        profile.save(update_fields=["last_attended", "updated_at"])
