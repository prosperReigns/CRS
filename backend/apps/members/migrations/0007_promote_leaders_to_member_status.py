from django.db import migrations
from django.utils import timezone


def promote_leaders_to_member_status(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    MemberProfile = apps.get_model("members", "MemberProfile")

    leader_user_ids = User.objects.filter(
        role__in=["cell_leader", "fellowship_leader"]
    ).values_list("id", flat=True)

    MemberProfile.objects.filter(
        user_id__in=leader_user_ids
    ).exclude(
        membership_status="member",
        is_first_timer=False,
    ).update(
        membership_status="member",
        is_first_timer=False,
        updated_at=timezone.now(),
    )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_user_home_address"),
        ("members", "0006_memberprofile_attendance_count"),
    ]

    operations = [
        migrations.RunPython(promote_leaders_to_member_status, migrations.RunPython.noop),
    ]
