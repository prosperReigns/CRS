from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncWeek
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.members.models import MemberProfile, SoulWinning
from .models import CellReport


class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def _scope_members(self, user):
        qs = MemberProfile.objects.select_related("cell", "cell__fellowship")
        if user.role in {User.Role.PASTOR, User.Role.STAFF}:
            return qs
        if user.role == User.Role.FELLOWSHIP_LEADER:
            return qs.filter(cell__fellowship__leader=user)
        if user.role == User.Role.CELL_LEADER:
            return qs.filter(cell__leader=user)
        return qs.filter(user=user)

    def _scope_reports(self, user):
        qs = CellReport.objects.select_related("cell", "cell__fellowship")
        if user.role in {User.Role.PASTOR, User.Role.STAFF}:
            return qs
        if user.role == User.Role.FELLOWSHIP_LEADER:
            return qs.filter(cell__fellowship__leader=user)
        if user.role == User.Role.CELL_LEADER:
            return qs.filter(cell__leader=user)
        return qs.none()

    def _scope_soul_winning(self, user):
        members = self._scope_members(user)
        return SoulWinning.objects.filter(member__in=members)

    def get(self, request):
        user = request.user
        today = timezone.localdate()
        active_since = today - timedelta(days=30)
        trend_since = today - timedelta(weeks=8)

        members_qs = self._scope_members(user)
        reports_qs = self._scope_reports(user)
        soul_qs = self._scope_soul_winning(user)

        total_members = members_qs.count()
        active_members = members_qs.filter(last_attended__gte=active_since).count()

        reports_summary = reports_qs.aggregate(
            total=Count("id"),
            approved=Count("id", filter=Q(status=CellReport.Status.APPROVED)),
            rejected=Count("id", filter=Q(status=CellReport.Status.REJECTED)),
            offering_total=Sum("offering_amount"),
        )

        souls_total = soul_qs.aggregate(total=Sum("converts"))["total"] or 0

        attendance_trend_qs = (
            reports_qs.filter(meeting_date__gte=trend_since)
            .annotate(week=TruncWeek("meeting_date"))
            .values("week")
            .annotate(count=Sum("attendance_count"))
            .order_by("week")
        )
        attendance_trend = [
            {"date": row["week"].isoformat() if row["week"] else None, "count": row["count"] or 0}
            for row in attendance_trend_qs
        ]

        offering_trend_qs = (
            reports_qs.filter(meeting_date__gte=trend_since)
            .annotate(week=TruncWeek("meeting_date"))
            .values("week")
            .annotate(total=Sum("offering_amount"))
            .order_by("week")
        )
        offering_trend = [
            {"meeting_date": row["week"].isoformat() if row["week"] else None, "total": float(row["total"] or 0)}
            for row in offering_trend_qs
        ]

        top_cells_qs = (
            reports_qs.values("cell_id", "cell__name")
            .annotate(
                report_count=Count("id"),
                total_attendance=Sum("attendance_count"),
                total_offering=Sum("offering_amount"),
            )
            .order_by("-total_attendance", "-total_offering")[:5]
        )
        top_cells = [
            {
                "cell_id": row["cell_id"],
                "cell_name": row["cell__name"],
                "report_count": row["report_count"],
                "total_attendance": row["total_attendance"] or 0,
                "total_offering": float(row["total_offering"] or 0),
            }
            for row in top_cells_qs
        ]

        return Response(
            {
                "members": {
                    "total": total_members,
                    "active": active_members,
                    "inactive": total_members - active_members,
                },
                "report_stats": {
                    "total": reports_summary["total"] or 0,
                    "approved": reports_summary["approved"] or 0,
                    "rejected": reports_summary["rejected"] or 0,
                },
                "offering_total": float(reports_summary["offering_total"] or 0),
                "souls_won": souls_total,
                "attendance_trend": attendance_trend,
                "offering_trend": offering_trend,
                "top_cells": top_cells,
            }
        )
