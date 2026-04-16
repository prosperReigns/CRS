from django.core.management.base import BaseCommand

from apps.reports.services.report_enforcement import enforce_report_submission


class Command(BaseCommand):
    help = "Freeze/unfreeze cell leaders based on report submission deadline rules."

    def handle(self, *args, **options):
        result = enforce_report_submission()
        self.stdout.write(
            self.style.SUCCESS(
                f"Report enforcement complete. Frozen: {result['frozen']}, Unfrozen: {result['unfrozen']}"
            )
        )
