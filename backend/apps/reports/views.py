from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.responsibilities import has_staff_permission
from apps.communication.models import Notification
from .services.report_enforcement import enforce_report_submission
from .models import CellReport, ReportActivityLog, ReportComment
from .permissions import CellReportPermission
from .serializers import (
    CellReportCreateUpdateSerializer,
    CellReportSerializer,
    ReportCommentCreateSerializer,
    ReportCommentSerializer,
)


def scoped_reports(user):
    qs = (
        CellReport.objects.select_related(
            "cell",
            "cell__fellowship",
            "submitted_by",
            "reviewed_by",
            "approved_by",
            "service",
        )
        .prefetch_related("images", "comments__author", "activity_logs__actor")
        .prefetch_related("attendees__user")
        .all()
    )

    if user.role == User.Role.PASTOR:
        return qs
    if user.role == User.Role.STAFF:
        return qs if has_staff_permission(user, "view_reports") else qs.none()
    if user.role == User.Role.FELLOWSHIP_LEADER:
        return qs.filter(cell__fellowship__leader=user)
    if user.role == User.Role.CELL_LEADER:
        return qs.filter(cell__leader=user)
    return qs.none()


class CellReportViewSet(viewsets.ModelViewSet):
    permission_classes = [CellReportPermission]

    def get_queryset(self):
        return scoped_reports(self.request.user)

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return CellReportCreateUpdateSerializer
        return CellReportSerializer

    def perform_create(self, serializer):
        report = serializer.save()
        enforce_report_submission()
        self._log(report, ReportActivityLog.Action.CREATED)
        self._notify(report, "Report Submitted", "A new report has been submitted.")

    def perform_update(self, serializer):
        report = self.get_object()
        if report.status == CellReport.Status.APPROVED:
            raise PermissionDenied("Approved reports cannot be edited.")
        serializer.save()

    @action(detail=True, methods=["patch"])
    @transaction.atomic
    def review(self, request, pk=None):
        report = self.get_object()
        is_pastor = request.user.role == User.Role.PASTOR
        is_staff_reviewer = request.user.role == User.Role.STAFF and has_staff_permission(request.user, "review_reports")
        is_fellowship_reviewer = request.user.role == User.Role.FELLOWSHIP_LEADER

        if not (is_pastor or is_staff_reviewer or is_fellowship_reviewer):
            raise PermissionDenied("Only pastors, fellowship leaders, or authorized staff can review reports.")
        if is_fellowship_reviewer and report.cell.fellowship.leader_id != request.user.id:
            raise PermissionDenied("You can only review reports in your fellowship.")
        if report.status != CellReport.Status.PENDING:
            return Response({"detail": "Only pending reports can be reviewed."}, status=status.HTTP_400_BAD_REQUEST)

        self._update_report(
            report,
            status=CellReport.Status.REVIEWED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )

        self._log(report, ReportActivityLog.Action.REVIEWED)
        self._notify(report, "Report Reviewed", "Your cell report has been reviewed.")
        return Response(self._serialize_report(report))

    @action(detail=True, methods=["patch"])
    @transaction.atomic
    def approve(self, request, pk=None):
        report = self.get_object()
        self._ensure_role(request.user, User.Role.PASTOR, "Only pastors can approve reports.")
        if report.status != CellReport.Status.REVIEWED:
            return Response({"detail": "Report must be reviewed before approval."}, status=status.HTTP_400_BAD_REQUEST)

        self._update_report(
            report,
            status=CellReport.Status.APPROVED,
            approved_by=request.user,
            approved_at=timezone.now(),
        )

        self._log(report, ReportActivityLog.Action.APPROVED)
        self._notify(report, "Report Approved", "Your cell report has been approved.")
        return Response(self._serialize_report(report))

    @action(detail=True, methods=["patch"])
    @transaction.atomic
    def reject(self, request, pk=None):
        report = self.get_object()
        self._ensure_role(request.user, User.Role.PASTOR, "Only pastors can reject reports.")
        if report.status != CellReport.Status.REVIEWED:
            return Response({"detail": "Report must be reviewed before rejection."}, status=status.HTTP_400_BAD_REQUEST)

        self._update_report(
            report,
            status=CellReport.Status.REJECTED,
            approved_by=request.user,
        )

        self._log(report, ReportActivityLog.Action.REJECTED)
        self._notify(report, "Report Rejected", "Your cell report has been rejected.")
        return Response(self._serialize_report(report))

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def comment(self, request, pk=None):
        report = self.get_object()
        if request.user.role not in {User.Role.FELLOWSHIP_LEADER, User.Role.PASTOR}:
            raise PermissionDenied("Only fellowship leaders and pastors can comment.")
        if (
            request.user.role == User.Role.FELLOWSHIP_LEADER
            and report.cell.fellowship.leader_id != request.user.id
        ):
            raise PermissionDenied("You can only comment on reports in your fellowship.")

        serializer = ReportCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = ReportComment.objects.create(
            report=report,
            author=request.user,
            comment=serializer.validated_data["comment"],
        )

        self._log(report, ReportActivityLog.Action.COMMENTED, note=comment.comment)
        self._notify(report, "New Report Comment", "A comment has been added to your report.")

        return Response(ReportCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    def _log(self, report, action, note=""):
        ReportActivityLog.objects.create(report=report, actor=self.request.user, action=action, note=note)

    def _update_report(self, report, **changes):
        for field, value in changes.items():
            setattr(report, field, value)
        report.save(update_fields=[*changes.keys(), "updated_at"])

    def _serialize_report(self, report):
        return CellReportSerializer(report, context=self.get_serializer_context()).data

    def _notify(self, report, title, message):
        recipient_ids = {
            report.submitted_by_id,
            report.cell.leader_id,
            report.cell.fellowship.leader_id,
        }
        recipient_ids.discard(None)
        Notification.objects.bulk_create(
            [
                Notification(
                    user_id=user_id,
                    title=title,
                    message=message,
                    category=Notification.Category.REPORT,
                )
                for user_id in recipient_ids
                if user_id != self.request.user.id
            ]
        )
