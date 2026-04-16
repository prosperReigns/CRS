from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("structure", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cell",
            name="meeting_day",
            field=models.CharField(
                choices=[
                    ("monday", "Monday"),
                    ("tuesday", "Tuesday"),
                    ("wednesday", "Wednesday"),
                    ("thursday", "Thursday"),
                    ("friday", "Friday"),
                    ("saturday", "Saturday"),
                    ("sunday", "Sunday"),
                ],
                default="saturday",
                max_length=20,
            ),
        ),
    ]
