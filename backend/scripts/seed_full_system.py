import os
import django
from datetime import date, timedelta, time

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model
from structure.models import Fellowship, Cell
from members.models import MemberProfile
from reports.models import CellReport
from communication.models import Message
from attendance.models import ChurchService, Attendance

User = get_user_model()


def run():
    print("🌱 Seeding database...")

    # -----------------------------
    # USERS (ROLES)
    # -----------------------------
    pastor = User.objects.create_user(
        username="pastor",
        password="password",
        role="pastor"
    )

    staff = User.objects.create_user(
        username="staff",
        password="password",
        role="staff"
    )

    fellowship_leader = User.objects.create_user(
        username="fellowship_leader",
        password="password",
        role="fellowship_leader"
    )

    cell_leader = User.objects.create_user(
        username="cell_leader",
        password="password",
        role="cell_leader"
    )

    # -----------------------------
    # STRUCTURE
    # -----------------------------
    fellowship = Fellowship.objects.create(
        name="Main Fellowship",
        leader=fellowship_leader
    )

    cell = Cell.objects.create(
        name="Cell A",
        fellowship=fellowship,
        leader=cell_leader,
        meeting_day="saturday",
        meeting_time=time(17, 0)
    )

    # -----------------------------
    # MEMBERS
    # -----------------------------
    members = []

    for i in range(1, 11):
        user = User.objects.create_user(
            username=f"member{i}",
            password="password",
            role="member"
        )

        profile = MemberProfile.objects.create(
            user=user,
            cell=cell,
            is_baptised=True,
            foundation_completed=True,
            souls_won=i
        )

        members.append(profile)

    print("✅ Members created")

    # -----------------------------
    # CHURCH SERVICES
    # -----------------------------
    service1 = ChurchService.objects.create(
        name="Service 1",
        day_of_week="sunday",
        start_time=time(8, 0),
    )

    service2 = ChurchService.objects.create(
        name="Service 2",
        day_of_week="sunday",
        start_time=time(10, 30),
    )

    print("✅ Services created")

    # -----------------------------
    # CELL REPORT (WITH ATTENDEES)
    # -----------------------------
    report_date = date.today() - timedelta(days=1)

    report = CellReport.objects.create(
        cell=cell,
        leader=cell_leader,
        meeting_date=report_date,
        new_members=2,
        offering_amount=5000,
        summary="Great meeting with strong attendance"
    )

    # Add attendees (first 6 members)
    report.attendees.set(members[:6])

    print("✅ Report created with attendees")

    # -----------------------------
    # SERVICE ATTENDANCE
    # -----------------------------
    attendance_date = date.today()

    for member in members[:8]:
        Attendance.objects.create(
            member=member,
            service=service1,
            date=attendance_date
        )

    for member in members[2:10]:
        Attendance.objects.create(
            member=member,
            service=service2,
            date=attendance_date
        )

    print("✅ Attendance recorded")

    # -----------------------------
    # MESSAGES
    # -----------------------------
    Message.objects.create(
        sender=pastor,
        receiver=fellowship_leader,
        content="Please review reports before Sunday."
    )

    Message.objects.create(
        sender=fellowship_leader,
        receiver=cell_leader,
        content="Kindly submit your report."
    )

    print("✅ Messages created")

    print("\n🎉 SEEDING COMPLETE!\n")
    print("Login Credentials:")
    print("Pastor → pastor / password")
    print("Cell Leader → cell_leader / password")
    print("Fellowship Leader → fellowship_leader / password")


if __name__ == "__main__":
    run()