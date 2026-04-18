from django.conf import settings
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils.crypto import get_random_string

from apps.members.models import MemberProfile
from .models import User


@receiver(pre_save, sender=MemberProfile)
def auto_create_member_user(sender, instance, **kwargs):
    auto_create_enabled = getattr(settings, "ACCOUNTS_AUTO_CREATE_MEMBER_USER", False)
    if not auto_create_enabled or instance.user_id:
        return

    username = f"member_{get_random_string(8).lower()}"
    while User.objects.filter(username=username).exists():
        username = f"member_{get_random_string(8).lower()}"

    password = get_random_string(12)
    user = User.objects.create_user(username=username, password=password, role=User.Role.MEMBER)
    instance.user = user
