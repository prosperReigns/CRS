from django.db import migrations, models


def populate_attendance_count(apps, schema_editor):
    MemberProfile = apps.get_model("members", "MemberProfile")
    Attendance = apps.get_model("members", "Attendance")
    CellReport = apps.get_model("reports", "CellReport")

    for profile in MemberProfile.objects.exclude(person__isnull=True).only("id", "person_id"):
        service_count = Attendance.objects.filter(person_id=profile.person_id, present=True).count()
        cell_count = CellReport.objects.filter(attendees__id=profile.person_id).count()
        MemberProfile.objects.filter(pk=profile.pk).update(attendance_count=service_count + cell_count)


def reset_attendance_count(apps, schema_editor):
    MemberProfile = apps.get_model("members", "MemberProfile")
    MemberProfile.objects.update(attendance_count=0)


class Migration(migrations.Migration):
    dependencies = [
        ("members", "0005_cellmembership_person_alter_attendance_options_and_more"),
        ("reports", "0005_alter_cellreport_attendees_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="memberprofile",
            name="attendance_count",
            field=models.IntegerField(default=0),
        ),
        migrations.RunPython(populate_attendance_count, reset_attendance_count),
    ]
