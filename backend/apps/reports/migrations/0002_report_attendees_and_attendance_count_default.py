from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("members", "0001_initial"),
        ("reports", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="cellreport",
            name="attendees",
            field=models.ManyToManyField(related_name="cell_reports", to="members.memberprofile"),
        ),
        migrations.AlterField(
            model_name="cellreport",
            name="attendance_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
