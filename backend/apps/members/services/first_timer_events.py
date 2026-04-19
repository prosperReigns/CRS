from apps.reports.models import CellReport

from ..models import Attendance, FirstTimerEvent, MemberProfile, Person


def attendance_total(person):
    if not isinstance(person, Person):
        return 0
    service_count = Attendance.objects.filter(person=person, present=True).count()
    cell_count = CellReport.objects.filter(attendees=person).count()
    return service_count + cell_count


def ensure_first_timer_event(*, person, event_type, event_date):
    if not isinstance(person, Person):
        return None, False
    event, created = FirstTimerEvent.objects.get_or_create(
        person=person,
        event_type=event_type,
        defaults={"event_date": event_date},
    )
    return event, created


def has_unhandled_first_timer_event(person):
    if not isinstance(person, Person):
        return False
    return FirstTimerEvent.objects.filter(person=person, handled=False).exists()


def derived_person_status(person):
    total = attendance_total(person)
    if total >= 4:
        return MemberProfile.MembershipStatus.MEMBER
    if has_unhandled_first_timer_event(person):
        return MemberProfile.MembershipStatus.FIRST_TIMER
    return MemberProfile.MembershipStatus.VISITOR
