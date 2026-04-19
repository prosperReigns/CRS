from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.accounts.models import User
from .models import Attendance, MemberProfile, Person


PROFILE_ROLES = {
    User.Role.TEACHER,
    User.Role.CELL_LEADER,
    User.Role.FELLOWSHIP_LEADER,
}


@receiver(post_save, sender=User)
def ensure_member_profile(sender, instance, created, **kwargs):
    if instance.role in PROFILE_ROLES:
        profile, _ = MemberProfile.objects.get_or_create(user=instance)
        if not profile.person_id:
            person = Person.objects.create(
                first_name=instance.first_name or instance.username,
                last_name=instance.last_name or "",
                phone=instance.phone or "",
                email=instance.email or "",
            )
            profile.person = person
            profile.save(update_fields=["person", "updated_at"])


@receiver(post_save, sender=Attendance)
def update_last_attended(sender, instance, **kwargs):
    if not instance.present:
        return

    profile = instance.member or MemberProfile.objects.filter(person=instance.person).first()
    if not profile:
        return
    if profile.last_attended is None or instance.date > profile.last_attended:
        profile.last_attended = instance.date
        profile.save(update_fields=["last_attended", "updated_at"])
