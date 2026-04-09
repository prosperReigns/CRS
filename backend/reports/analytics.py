from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.timezone import now
from datatime import timedelta

from reports.models import CellReport
from members.models import SoulWinning, Attendance, MemberProfile

class DashboardAnalyticsView(APIView):

    def get(self, request):
        user = request.user

        today = now().date()
        last_7_days = today - timedelta(days=7)

        # 👥 Members
        total_members = MemberProfile.objects.count()

        active_members = MemberProfile.objects.filter(
            last_attended__gte=today - timedelta(days=30)
        ).count()

        inactive_members = total_members - active_members

        # 📅 Attendance
        attendance_last_week = Attendance.objects.filter(
            date__gte=last_7_days
        ).count()

        # 🧾 Reports
        reports = CellReport.objects.filter(meeting_date__gte=last_7_days)

        total_reports = reports.count()
        approved_reports = reports.filter(status="approved").count()
        rejected_reports = reports.filter(status="rejected").count()

        # 💰 Offering
        total_offering = sum(
            report.offering_amount for report in reports
        )

        # 🕊️ Evangelism
        souls_won = SoulWinning.objects.filter(
            date__gte=last_7_days
        ).aggregate(total=models.Sum("converts"))["total"] or 0

        return Response({
            "members": {
                "total": total_members,
                "active": active_members,
                "inactive": inactive_members
            },
            "attendance_last_week": attendance_last_week,
            "reports": {
                "total": total_reports,
                "approved": approved_reports,
                "rejected": rejected_reports
            },
            "offering": float(total_offering),
            "souls_won": souls_won
        })