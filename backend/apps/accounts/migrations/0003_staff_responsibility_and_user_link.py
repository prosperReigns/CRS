from django.db import migrations, models


def seed_staff_responsibilities(apps, schema_editor):
    StaffResponsibility = apps.get_model("accounts", "StaffResponsibility")
    defaults = (
        ("first_timer", "First Timer Coordinator", "Handles first timer follow-up workflows."),
        ("cell_ministry", "Cell Ministry Coordinator", "Manages cell ministry reports and structure workflows."),
        ("partnership", "Partnership Representative", "Manages partnership member records."),
    )
    for code, name, description in defaults:
        StaffResponsibility.objects.update_or_create(
            code=code,
            defaults={"name": name, "description": description},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_user_bio_profile_picture"),
    ]

    operations = [
        migrations.CreateModel(
            name="StaffResponsibility",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("code", models.CharField(max_length=50, unique=True)),
                ("description", models.TextField(blank=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.AddField(
            model_name="user",
            name="staff_responsibilities",
            field=models.ManyToManyField(blank=True, related_name="users", to="accounts.staffresponsibility"),
        ),
        migrations.RunPython(seed_staff_responsibilities, migrations.RunPython.noop),
    ]
