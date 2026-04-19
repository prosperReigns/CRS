from ..models import CellMembership
from .membership_evaluator import evaluate_membership


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
