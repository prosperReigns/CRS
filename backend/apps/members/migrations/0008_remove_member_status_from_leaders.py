from django.db import migrations
from django.utils import timezone


def remove_member_status_from_leaders(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    MemberProfile = apps.get_model("members", "MemberProfile")

    leader_user_ids = User.objects.filter(
        role__in=["cell_leader", "fellowship_leader"]
    ).values_list("id", flat=True)

    MemberProfile.objects.filter(
        user_id__in=leader_user_ids,
        membership_status="member",
    ).update(
        membership_status="visitor",
        is_first_timer=False,
        updated_at=timezone.now(),
    )


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0007_promote_leaders_to_member_status"),
    ]

    operations = [
        migrations.RunPython(remove_member_status_from_leaders, migrations.RunPython.noop),
    ]
