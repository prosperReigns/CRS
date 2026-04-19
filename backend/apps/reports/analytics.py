from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate, TruncWeek
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.members.models import Attendance, MemberProfile, SoulWinning
from .models import CellReport


class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def _scope_members(self, user):
        qs = MemberProfile.objects.select_related("cell", "cell__fellowship")
        if user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
            return qs
        if user.role == User.Role.FELLOWSHIP_LEADER:
            return qs.filter(cell__fellowship__leader=user)
        if user.role == User.Role.CELL_LEADER:
            return qs.filter(cell__leader=user)
        return qs.filter(user=user)

    def _scope_reports(self, user):
        qs = CellReport.objects.select_related("cell", "cell__fellowship")
        if user.role in {User.Role.PASTOR, User.Role.ADMIN, User.Role.STAFF}:
            return qs
        if user.role == User.Role.FELLOWSHIP_LEADER:
            return qs.filter(cell__fellowship__leader=user)
        if user.role == User.Role.CELL_LEADER:
            return qs.filter(cell__leader=user)
        return qs.none()

    def _scope_soul_winning(self, user):
        members = self._scope_members(user)
        return SoulWinning.objects.filter(member__in=members)

    def _scope_attendance(self, user):
        members = self._scope_members(user)
        person_ids = members.exclude(person__isnull=True).values_list("person_id", flat=True)
        return Attendance.objects.select_related("service", "member", "person").filter(
            person_id__in=person_ids,
            service__isnull=False,
            present=True,
        )

    def get(self, request):
        user = request.user
        today = timezone.localdate()
        active_since = today - timedelta(days=30)
        trend_since = today - timedelta(weeks=8)
        previous_window_start = today - timedelta(days=60)

        members_qs = self._scope_members(user)
        reports_qs = self._scope_reports(user)
        soul_qs = self._scope_soul_winning(user)
        attendance_qs = self._scope_attendance(user)

        total_members = members_qs.filter(membership_status=MemberProfile.MembershipStatus.MEMBER).count()
        active_members = members_qs.filter(last_attended__gte=active_since).count()
        visitors = members_qs.filter(membership_status=MemberProfile.MembershipStatus.VISITOR).count()
        first_timers = members_qs.filter(membership_status=MemberProfile.MembershipStatus.FIRST_TIMER).count()
        recent_members = members_qs.filter(
            membership_status=MemberProfile.MembershipStatus.MEMBER,
            join_date__gte=active_since,
        ).count()
        previous_members = members_qs.filter(
            membership_status=MemberProfile.MembershipStatus.MEMBER,
            join_date__gte=previous_window_start,
            join_date__lt=active_since,
        ).count()
        growth_rate = 0.0
        if previous_members > 0:
            growth_rate = ((recent_members - previous_members) / previous_members) * 100

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
                member_count=Count(
                    "attendees",
                    filter=Q(attendees__member_profile__membership_status=MemberProfile.MembershipStatus.MEMBER),
                    distinct=True,
                ),
                visitor_count=Count(
                    "attendees",
                    filter=Q(attendees__member_profile__membership_status=MemberProfile.MembershipStatus.VISITOR),
                    distinct=True,
                ),
                first_timer_count=Count(
                    "attendees",
                    filter=Q(attendees__member_profile__membership_status=MemberProfile.MembershipStatus.FIRST_TIMER),
                    distinct=True,
                ),
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
                "member_count": row["member_count"] or 0,
                "visitor_count": row["visitor_count"] or 0,
                "first_timer_count": row["first_timer_count"] or 0,
            }
            for row in top_cells_qs
        ]

        service_attendance_qs = (
            attendance_qs.values("service_id", "service__name")
            .annotate(attendance=Count("id"))
            .order_by("service__name")
        )
        service_attendance = [
            {
                "service_id": row["service_id"],
                "name": row["service__name"],
                "attendance": row["attendance"] or 0,
            }
            for row in service_attendance_qs
        ]

        daily_total_attendance_qs = (
            attendance_qs.annotate(day=TruncDate("date"))
            .values("day")
            .annotate(attendance=Count("id"))
            .order_by("day")
        )
        daily_total_attendance = [
            {"date": row["day"].isoformat() if row["day"] else None, "attendance": row["attendance"] or 0}
            for row in daily_total_attendance_qs
        ]

        return Response(
            {
                "members": {
                    "total": total_members,
                    "active": active_members,
                    "inactive": total_members - active_members,
                },
                "membership": {
                    "strength": total_members,
                    "visitors": visitors,
                    "first_timers": first_timers,
                    "growth_rate": round(growth_rate, 2),
                },
                "report_stats": {
                    "total": reports_summary["total"] or 0,
                    "approved": reports_summary["approved"] or 0,
                    "rejected": reports_summary["rejected"] or 0,
                },
                "offering_total": float(reports_summary["offering_total"] or 0),
                "souls_won": souls_total,
                "attendance_trend": attendance_trend,
                "services": service_attendance,
                "daily_total_attendance": daily_total_attendance,
                "offering_trend": offering_trend,
                "top_cells": top_cells,
            }
        )
