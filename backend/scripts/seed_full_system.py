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

    print("Users ready")


    print("\nSEEDING COMPLETE\n")
    print("Login Credentials:")
    print("Admin -> admin / password")


if __name__ == "__main__":
    run()
