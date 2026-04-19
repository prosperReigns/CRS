from datetime import timedelta

from django.utils import timezone

from apps.reports.models import CellReport
from ..models import Attendance, CellMembership, MemberProfile, Person


def ensure_cell_membership(person, cell):
    membership, _ = CellMembership.objects.get_or_create(
        person=person,
        cell=cell,
        defaults={"is_active": True},
    )
    if not membership.is_active:
        membership.is_active = True
        membership.save(update_fields=["is_active", "updated_at"])
    return membership


def evaluate_membership(person):
    if not isinstance(person, Person):
        return None

    profile = MemberProfile.objects.filter(person=person).first()
    since = timezone.localdate() - timedelta(days=90)

    service_attendance_count = Attendance.objects.filter(
        person=person,
        present=True,
        date__gte=since,
        service__isnull=False,
    ).count()
    cell_attendance_count = CellReport.objects.filter(
        meeting_date__gte=since,
        attendees=person,
    ).count()

    next_status = None
    if service_attendance_count >= 1:
        next_status = MemberProfile.MembershipStatus.FIRST_TIMER
    if service_attendance_count >= 2 and cell_attendance_count >= 2:
        next_status = MemberProfile.MembershipStatus.REGULAR
    if (
        service_attendance_count >= 6
        and cell_attendance_count >= 6
        and profile
        and profile.foundation_completed
    ):
        next_status = MemberProfile.MembershipStatus.MEMBER

    if profile is None:
        return None

    priority = {
        MemberProfile.MembershipStatus.VISITOR: 0,
        MemberProfile.MembershipStatus.FIRST_TIMER: 1,
        MemberProfile.MembershipStatus.REGULAR: 2,
        MemberProfile.MembershipStatus.MEMBER: 3,
    }

    if next_status and priority[next_status] > priority[profile.membership_status]:
        profile.membership_status = next_status
        profile.is_first_timer = next_status == MemberProfile.MembershipStatus.FIRST_TIMER
        if next_status == MemberProfile.MembershipStatus.FIRST_TIMER and not profile.first_visit_date:
            profile.first_visit_date = timezone.localdate()
        profile.save(update_fields=["membership_status", "is_first_timer", "first_visit_date", "updated_at"])
    return profile
