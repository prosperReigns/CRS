from django.utils import timezone

from apps.reports.models import CellReport
from ..models import Attendance, MemberProfile, Person


def _attendance_total_from_db(person):
    service_count = Attendance.objects.filter(person=person, present=True).count()
    cell_count = CellReport.objects.filter(attendees=person).count()
    return service_count + cell_count


def evaluate_membership(person, *, attendance_delta=0, recalculate_attendance=False):
    if not isinstance(person, Person):
        return None

    profile = MemberProfile.objects.filter(person=person).first()
    if profile is None:
        return None

    if recalculate_attendance:
        profile.attendance_count = _attendance_total_from_db(person)
    elif attendance_delta:
        profile.attendance_count = max(0, profile.attendance_count + attendance_delta)

    if profile.foundation_completed and profile.is_baptised:
        next_status = MemberProfile.MembershipStatus.MEMBER
    elif profile.attendance_count >= 4:
        next_status = MemberProfile.MembershipStatus.MEMBER
    elif profile.attendance_count > 0:
        next_status = MemberProfile.MembershipStatus.FIRST_TIMER
    else:
        next_status = MemberProfile.MembershipStatus.VISITOR

    priority = {
        MemberProfile.MembershipStatus.VISITOR: 0,
        MemberProfile.MembershipStatus.FIRST_TIMER: 1,
        MemberProfile.MembershipStatus.REGULAR: 2,
        MemberProfile.MembershipStatus.MEMBER: 3,
    }
    status_to_save = (
        profile.membership_status
        if priority.get(profile.membership_status, 0) > priority.get(next_status, 0)
        else next_status
    )

    profile.membership_status = status_to_save
    profile.is_first_timer = status_to_save == MemberProfile.MembershipStatus.FIRST_TIMER
    if profile.is_first_timer and not profile.first_visit_date:
        profile.first_visit_date = timezone.localdate()
    profile.save(
        update_fields=[
            "attendance_count",
            "membership_status",
            "is_first_timer",
            "first_visit_date",
            "updated_at",
        ]
    )
    return profile
