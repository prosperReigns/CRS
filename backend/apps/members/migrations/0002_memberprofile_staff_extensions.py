from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("members", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="memberprofile",
            name="first_visit_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="memberprofile",
            name="follow_up_status",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="memberprofile",
            name="is_first_timer",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="memberprofile",
            name="partnership_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="memberprofile",
            name="partnership_level",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="memberprofile",
            name="visitation_notes",
            field=models.TextField(blank=True),
        ),
    ]
