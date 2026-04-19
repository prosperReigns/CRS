from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.text import slugify

from apps.reports.models import CellReport
from ..models import Attendance, MemberProfile, Person

User = get_user_model()
ATTENDANCE_THRESHOLD_FOR_MEMBERSHIP = 4
MAX_USERNAME_LENGTH = 150
USERNAME_SEED_LIMIT = 24
LEADERSHIP_ROLES = {User.Role.CELL_LEADER, User.Role.FELLOWSHIP_LEADER}
MEMBERSHIP_PRIORITY = {
    MemberProfile.MembershipStatus.VISITOR: 0,
    MemberProfile.MembershipStatus.FIRST_TIMER: 1,
    MemberProfile.MembershipStatus.REGULAR: 2,
    MemberProfile.MembershipStatus.MEMBER: 3,
}


def _normalize_username_seed(person):
    seed = slugify(person.full_name).replace("-", "_")
    if seed:
        return seed
    return f"member_{person.id or get_random_string(8).lower()}"


def _unique_username(seed):
    base = seed[:USERNAME_SEED_LIMIT] or "member"
    candidate = base
    index = 0
    while User.objects.filter(username=candidate).exists():
        index += 1
        if index > 1000:
            random_tail = get_random_string(8).lower()
            prefix = base[: max(0, MAX_USERNAME_LENGTH - len(random_tail) - 1)]
            candidate = f"{prefix}_{random_tail}" if prefix else random_tail[:MAX_USERNAME_LENGTH]
            if not User.objects.filter(username=candidate).exists():
                return candidate
        suffix = f"_{index}"
        prefix_length = max(0, MAX_USERNAME_LENGTH - len(suffix))
        candidate = f"{base[:prefix_length]}{suffix}" if prefix_length else f"m{suffix}"[-MAX_USERNAME_LENGTH:]
    return candidate


def _create_member_profile_for_person(person, attendance_count):
    username = _unique_username(_normalize_username_seed(person))
    user = User.objects.create_user(
        username=username,
        first_name=person.first_name,
        last_name=person.last_name,
        email=person.email,
        role=User.Role.MEMBER,
    )
    active_membership = person.cell_memberships.filter(is_active=True).select_related("cell").first()
    return MemberProfile.objects.create(
        person=person,
        user=user,
        cell=getattr(active_membership, "cell", None),
        membership_status=MemberProfile.MembershipStatus.MEMBER,
        attendance_count=max(0, attendance_count),
    )


def _attendance_total_from_db(person):
    service_count = Attendance.objects.filter(person=person, present=True).count()
    cell_count = CellReport.objects.filter(attendees=person).count()
    return service_count + cell_count


def evaluate_membership(person, *, attendance_delta=0, recalculate_attendance=False):
    if not isinstance(person, Person):
        return None

    profile = MemberProfile.objects.filter(person=person).first()
    if profile is None:
        attendance_total = _attendance_total_from_db(person)
        if attendance_total < ATTENDANCE_THRESHOLD_FOR_MEMBERSHIP:
            return None
        return _create_member_profile_for_person(person, attendance_total)

    if profile.user.role in LEADERSHIP_ROLES:
        updates = []
        if profile.membership_status != MemberProfile.MembershipStatus.MEMBER:
            profile.membership_status = MemberProfile.MembershipStatus.MEMBER
            updates.append("membership_status")
        if profile.is_first_timer:
            profile.is_first_timer = False
            updates.append("is_first_timer")
        if updates:
            profile.save(update_fields=[*updates, "updated_at"])
        return profile

    if recalculate_attendance:
        profile.attendance_count = _attendance_total_from_db(person)
    elif attendance_delta:
        profile.attendance_count = max(0, profile.attendance_count + attendance_delta)

    if profile.foundation_completed and profile.is_baptised:
        next_status = MemberProfile.MembershipStatus.MEMBER
    elif profile.attendance_count >= ATTENDANCE_THRESHOLD_FOR_MEMBERSHIP:
        next_status = MemberProfile.MembershipStatus.MEMBER
    elif profile.attendance_count > 0:
        next_status = MemberProfile.MembershipStatus.FIRST_TIMER
    else:
        next_status = MemberProfile.MembershipStatus.VISITOR

    status_to_save = (
        profile.membership_status
        if MEMBERSHIP_PRIORITY.get(profile.membership_status, 0) > MEMBERSHIP_PRIORITY.get(next_status, 0)
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
