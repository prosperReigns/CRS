import os
import sys
from datetime import date, timedelta, time
from pathlib import Path

import django
from django.db import transaction

# Ensure this script works when run directly from any working directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model

from apps.communication.models import Message
from apps.members.models import Attendance, ChurchService, MemberProfile
from apps.reports.models import CellReport
from apps.structure.models import Cell, Fellowship

User = get_user_model()


def upsert_user(*, username: str, role: str, password: str = "password"):
    user, _ = User.objects.update_or_create(
        username=username,
        defaults={"role": role},
    )

    if not user.check_password(password):
        user.set_password(password)
        user.save(update_fields=["password"])

    return user


@transaction.atomic
def run():
    print("Seeding database...")

    # -----------------------------
    # USERS (ROLES)
    # -----------------------------
    admin = upsert_user(username="admin", role="admin")
    pastor = upsert_user(username="pastor", role="pastor")
    upsert_user(username="staff", role="staff")
    fellowship_leader = upsert_user(username="fellowship_leader", role="fellowship_leader")
    cell_leader = upsert_user(username="cell_leader", role="cell_leader")

    print("Users ready")

    # -----------------------------
    # STRUCTURE
    # -----------------------------
    fellowship, _ = Fellowship.objects.update_or_create(
        name="Main Fellowship",
        defaults={"leader": fellowship_leader},
    )

    cell, _ = Cell.objects.update_or_create(
        fellowship=fellowship,
        name="Cell A",
        defaults={
            "leader": cell_leader,
            "meeting_day": Cell.MeetingDay.SATURDAY,
            "meeting_time": time(17, 0),
            "venue": "Main Fellowship Center",
        },
    )

    print("Structure ready")

    # -----------------------------
    # MEMBERS
    # -----------------------------
    members = []

    for i in range(1, 11):
        user = upsert_user(username=f"member{i}", role="member")

        profile, _ = MemberProfile.objects.update_or_create(
            user=user,
            defaults={
                "cell": cell,
                "is_baptised": True,
                "foundation_completed": True,
                "souls_won": i,
            },
        )
        members.append(profile)

    print("Members ready")

    # -----------------------------
    # CHURCH SERVICES
    # -----------------------------
    service1, _ = ChurchService.objects.update_or_create(
        name="Service 1",
        defaults={
            "day_of_week": ChurchService.DayOfWeek.SUNDAY,
            "start_time": time(8, 0),
            "is_active": True,
        },
    )
    service2, _ = ChurchService.objects.update_or_create(
        name="Service 2",
        defaults={
            "day_of_week": ChurchService.DayOfWeek.SUNDAY,
            "start_time": time(10, 30),
            "is_active": True,
        },
    )

    print("Services ready")

    # -----------------------------
    # CELL REPORT (WITH ATTENDEES)
    # -----------------------------
    report_date = date.today() - timedelta(days=1)

    report, _ = CellReport.objects.update_or_create(
        cell=cell,
        meeting_date=report_date,
        defaults={
            "submitted_by": cell_leader,
            "leader": cell_leader,
            "service": service1,
            "new_members": 2,
            "offering_amount": 5000,
            "summary": "Great meeting with strong attendance",
        },
    )

    report.attendees.set(members[:6])
    report.sync_attendance_count()

    print("Report ready")

    # -----------------------------
    # SERVICE ATTENDANCE
    # -----------------------------
    attendance_date = date.today()

    # Use disjoint groups so each member has only one record per service_type/day.
    for member in members[:5]:
        Attendance.objects.update_or_create(
            member=member,
            date=attendance_date,
            service_type=Attendance.ServiceType.SUNDAY,
            defaults={
                "service": service1,
                "present": True,
                "recorded_by": cell_leader,
            },
        )

    for member in members[5:]:
        Attendance.objects.update_or_create(
            member=member,
            date=attendance_date,
            service_type=Attendance.ServiceType.MIDWEEK,
            defaults={
                "service": service2,
                "present": True,
                "recorded_by": cell_leader,
            },
        )

    print("Attendance ready")

    # -----------------------------
    # MESSAGES
    # -----------------------------
    Message.objects.get_or_create(
        sender=pastor,
        recipient=fellowship_leader,
        content="Please review reports before Sunday.",
    )
    Message.objects.get_or_create(
        sender=fellowship_leader,
        recipient=cell_leader,
        content="Kindly submit your report.",
    )

    print("Messages ready")

    print("\nSEEDING COMPLETE\n")
    print("Login Credentials:")
    print("Admin -> admin / password")
    print("Pastor -> pastor / password")
    print("Cell Leader -> cell_leader / password")
    print("Fellowship Leader -> fellowship_leader / password")


if __name__ == "__main__":
    run()
