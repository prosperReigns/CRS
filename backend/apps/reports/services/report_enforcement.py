from datetime import datetime, timedelta

from django.utils import timezone

from apps.structure.models import Cell


WEEKDAY_MAP = {
    Cell.MeetingDay.MONDAY: 0,
    Cell.MeetingDay.TUESDAY: 1,
    Cell.MeetingDay.WEDNESDAY: 2,
    Cell.MeetingDay.THURSDAY: 3,
    Cell.MeetingDay.FRIDAY: 4,
    Cell.MeetingDay.SATURDAY: 5,
    Cell.MeetingDay.SUNDAY: 6,
}


def _last_meeting_datetime(cell, now):
    current = timezone.localtime(now)
    weekday = WEEKDAY_MAP.get(cell.meeting_day)
    if weekday is None or cell.meeting_time is None:
        return None

    days_since = (current.weekday() - weekday) % 7
    meeting_date = current.date() - timedelta(days=days_since)
    scheduled_datetime = datetime.combine(meeting_date, cell.meeting_time)
    meeting_dt = timezone.make_aware(scheduled_datetime, timezone.get_current_timezone())
    if meeting_dt > current:
        meeting_dt -= timedelta(days=7)
    return meeting_dt


def enforce_report_submission(now=None):
    now = now or timezone.now()
    cells = Cell.objects.select_related("leader").all()

    frozen_count = 0
    unfrozen_count = 0

    for cell in cells:
        leader = cell.leader
        if not leader:
            continue

        last_meeting_dt = _last_meeting_datetime(cell, now)
        if not last_meeting_dt:
            continue

        deadline = last_meeting_dt + timedelta(hours=48)
        meeting_date = last_meeting_dt.date()
        has_report = cell.reports.filter(meeting_date=meeting_date).exists()
        should_freeze = timezone.localtime(now) >= deadline and not has_report

        if should_freeze and not leader.is_frozen:
            leader.is_frozen = True
            leader.save(update_fields=["is_frozen"])
            frozen_count += 1
        elif not should_freeze and leader.is_frozen:
            leader.is_frozen = False
            leader.save(update_fields=["is_frozen"])
            unfrozen_count += 1

    return {"frozen": frozen_count, "unfrozen": unfrozen_count}
