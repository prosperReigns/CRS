from .models import User

RESPONSIBILITY_PERMISSIONS = {
    "first_timer": [
        "view_new_members",
        "update_visitation",
    ],
    "cell_ministry": [
        "manage_cells",
        "view_reports",
        "review_reports",
    ],
    "partnership": [
        "view_partnership",
        "update_partnership",
    ],
}


def _responsibility_codes(user):
    prefetched = getattr(user, "_prefetched_objects_cache", {}).get("staff_responsibilities")
    if prefetched is not None:
        return {item.code for item in prefetched}
    return set(user.staff_responsibilities.values_list("code", flat=True))


def has_responsibility(user, code):
    if not getattr(user, "is_authenticated", False):
        return False
    if user.role != User.Role.STAFF:
        return False
    codes = _responsibility_codes(user)
    return code in codes


def has_staff_permission(user, permission):
    if not getattr(user, "is_authenticated", False):
        return False
    if user.role in {User.Role.PASTOR, User.Role.ADMIN}:
        return True
    if user.role != User.Role.STAFF:
        return False
    for code in _responsibility_codes(user):
        if permission in RESPONSIBILITY_PERMISSIONS.get(code, []):
            return True
    return False
