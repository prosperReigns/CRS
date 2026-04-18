from django.db import transaction
from django.utils.crypto import get_random_string
from django.utils.text import slugify
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.members.models import MemberProfile
from apps.structure.models import Cell, Fellowship
from ..responsibilities import has_staff_permission
from ..models import User

MAX_USERNAME_LENGTH = 150
USERNAME_SEED_LIMIT = 24


def _generate_password(length=12):
    return get_random_string(length=length)


def _normalize_username_seed(value):
    seed = slugify((value or "").strip()).replace("-", "_")
    if seed:
        return seed
    return f"leader_{get_random_string(4).lower()}"


def _unique_username(seed):
    base = _normalize_username_seed(seed)[:USERNAME_SEED_LIMIT]
    username = base
    index = 0

    while User.objects.filter(username=username).exists():
        index += 1
        suffix = f"_{index}"
        username = f"{base[: max(1, MAX_USERNAME_LENGTH - len(suffix))]}{suffix}"
    return username


def _ensure_user_for_member(member_profile):
    user = getattr(member_profile, "user", None)
    if user:
        return user, None

    temporary_password = _generate_password()
    generated_username = _unique_username(f"member_{member_profile.pk}")
    user = User.objects.create_user(
        username=generated_username,
        role=User.Role.MEMBER,
        password=temporary_password,
    )
    member_profile.user = user
    member_profile.save(update_fields=["user"])
    return user, temporary_password


def _demote_if_unassigned(previous_leader):
    if not previous_leader:
        return

    leads_fellowship = previous_leader.led_fellowships.exists()
    leads_cell = previous_leader.led_cells.exists()

    if previous_leader.role == User.Role.FELLOWSHIP_LEADER and not leads_fellowship:
        previous_leader.role = User.Role.CELL_LEADER if leads_cell else User.Role.MEMBER
        previous_leader.save(update_fields=["role"])
        return

    if previous_leader.role == User.Role.CELL_LEADER and not leads_cell:
        previous_leader.role = User.Role.FELLOWSHIP_LEADER if leads_fellowship else User.Role.MEMBER
        previous_leader.save(update_fields=["role"])


@transaction.atomic
def assign_cell_leader(member_profile, cell, assigned_by):
    if assigned_by.role not in {User.Role.FELLOWSHIP_LEADER, User.Role.PASTOR, User.Role.STAFF}:
        raise PermissionDenied("You are not allowed to assign cell leaders.")
    if assigned_by.role == User.Role.STAFF and not has_staff_permission(assigned_by, "manage_cells"):
        raise PermissionDenied("Only staff with cell ministry responsibility can assign cell leaders.")
    if assigned_by.role == User.Role.FELLOWSHIP_LEADER and cell.fellowship.leader_id != assigned_by.id:
        raise PermissionDenied("You can only assign cell leaders in your fellowship.")

    user, temporary_password = _ensure_user_for_member(member_profile)
    previous_leader = cell.leader if cell.leader_id and cell.leader_id != user.id else None

    if user.role != User.Role.CELL_LEADER:
        user.role = User.Role.CELL_LEADER
        user.save(update_fields=["role"])

    if member_profile.cell_id != cell.id:
        member_profile.cell = cell
        member_profile.save(update_fields=["cell"])

    if cell.leader_id != user.id:
        cell.leader = user
        cell.save(update_fields=["leader"])

    _demote_if_unassigned(previous_leader)
    return {
        "username": user.username,
        "temporary_password": temporary_password,
        "role": user.role,
    }


@transaction.atomic
def assign_fellowship_leader(member_profile, fellowship, assigned_by):
    if assigned_by.role not in {User.Role.PASTOR, User.Role.STAFF}:
        raise PermissionDenied("Only pastor or staff can assign fellowship leaders.")
    if assigned_by.role == User.Role.STAFF and not has_staff_permission(assigned_by, "manage_cells"):
        raise PermissionDenied("Only staff with cell ministry responsibility can assign fellowship leaders.")

    user, temporary_password = _ensure_user_for_member(member_profile)
    previous_leader = fellowship.leader if fellowship.leader_id and fellowship.leader_id != user.id else None

    if user.role != User.Role.FELLOWSHIP_LEADER:
        user.role = User.Role.FELLOWSHIP_LEADER
        user.save(update_fields=["role"])

    if fellowship.leader_id != user.id:
        fellowship.leader = user
        fellowship.save(update_fields=["leader"])

    _demote_if_unassigned(previous_leader)
    return {
        "username": user.username,
        "temporary_password": temporary_password,
        "role": user.role,
    }


def _validate_leader_creation_permissions(role, assigned_by):
    if role == User.Role.FELLOWSHIP_LEADER and assigned_by.role not in {User.Role.PASTOR, User.Role.STAFF}:
        raise PermissionDenied("Only pastor or staff can create fellowship leaders.")
    if role == User.Role.CELL_LEADER and assigned_by.role not in {User.Role.PASTOR, User.Role.STAFF, User.Role.FELLOWSHIP_LEADER}:
        raise PermissionDenied("You are not allowed to create cell leaders.")
    if assigned_by.role == User.Role.STAFF and not has_staff_permission(assigned_by, "manage_cells"):
        raise PermissionDenied("Only staff with cell ministry responsibility can create leader accounts.")


@transaction.atomic
def create_leader_account(data, role, assigned_by):
    if role not in {User.Role.FELLOWSHIP_LEADER, User.Role.CELL_LEADER}:
        raise ValidationError({"role": "Role must be fellowship_leader or cell_leader."})

    _validate_leader_creation_permissions(role, assigned_by)

    fellowship = None
    cell = None
    if role == User.Role.FELLOWSHIP_LEADER:
        fellowship = Fellowship.objects.select_related("leader").filter(pk=data.get("fellowship_id")).first()
        if not fellowship:
            raise ValidationError({"fellowship_id": "A valid fellowship_id is required for fellowship leaders."})

    if role == User.Role.CELL_LEADER:
        cell = Cell.objects.select_related("fellowship", "leader").filter(pk=data.get("cell_id")).first()
        if not cell:
            raise ValidationError({"cell_id": "A valid cell_id is required for cell leaders."})
        if assigned_by.role == User.Role.FELLOWSHIP_LEADER and cell.fellowship.leader_id != assigned_by.id:
            raise PermissionDenied("You can only assign cell leaders in your fellowship.")

    raw_username = (data.get("username") or "").strip()
    username_seed = raw_username or data.get("email") or data.get("first_name") or role
    username = _unique_username(username_seed)
    temporary_password = (data.get("password") or "").strip() or _generate_password()

    user = User.objects.create_user(
        username=username,
        first_name=(data.get("first_name") or "").strip(),
        last_name=(data.get("last_name") or "").strip(),
        email=(data.get("email") or "").strip(),
        role=role,
        password=temporary_password,
    )
    profile, _ = MemberProfile.objects.get_or_create(user=user)

    if role == User.Role.FELLOWSHIP_LEADER:
        previous_leader = fellowship.leader if fellowship.leader_id and fellowship.leader_id != user.id else None
        fellowship.leader = user
        fellowship.save(update_fields=["leader"])
        _demote_if_unassigned(previous_leader)

    if role == User.Role.CELL_LEADER:
        previous_leader = cell.leader if cell.leader_id and cell.leader_id != user.id else None
        cell.leader = user
        cell.save(update_fields=["leader"])
        if profile.cell_id != cell.id:
            profile.cell = cell
            profile.save(update_fields=["cell"])
        _demote_if_unassigned(previous_leader)

    return {
        "username": user.username,
        "temporary_password": temporary_password,
        "role": user.role,
    }
