from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("members", "0002_memberprofile_staff_extensions"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="memberprofile",
            name="visitation_cell_leader",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="assigned_first_timers_as_cell_leader",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="memberprofile",
            name="visitation_fellowship_leader",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="assigned_first_timers_as_fellowship_leader",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
