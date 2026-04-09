from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import CellReport, ReportComment
from .serializers import (
    CellReportSerializer,
    CreateReportSerializer,
    ReportCommentSerializer
)

class CellReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role in ["pastor", "staff"]:
            return CellReport.objects.all()

        if user.role == "fellowship_leader":
            return CellReport.objects.filter(cell__fellowship__leader=user)

        if user.role == "cell_leader":
            return CellReport.objects.filter(submitted_by=user)

        return CellReport.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return CreateReportSerializer
        return CellReportSerializer

    @action(detail=True, methods=["patch"])
    def review(self, request, pk=None):
        report = self.get_object()

        if request.user.role != "fellowship_leader":
            return Response({"error": "Not allowed"}, status=403)

        report.status = "reviewed"
        report.reviewed_by = request.user
        report.save()

        return Response({"status": "Report reviewed"})

    @action(detail=True, methods=["patch"])
    def approve(self, request, pk=None):
        report = self.get_object()

        if request.user.role != "pastor":
            return Response({"error": "Not allowed"}, status=403)

        report.status = "approved"
        report.approved_by = request.user
        report.save()

        return Response({"status": "Report approved"})

    @action(detail=True, methods=["patch"])
    def reject(self, request, pk=None):
        report = self.get_object()

        if request.user.role not in ["fellowship_leader", "pastor"]:
            return Response({"error": "Not allowed"}, status=403)

        report.status = "rejected"
        report.save()

        return Response({"status": "Report rejected"})
    
    @action(detail=True, methods=["post"])
    def comment(self, request, pk=None):
        report = self.get_object()

        serializer = ReportCommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(author=request.user, report=report)
            return Response(serializer.data)

        return Response(serializer.errors, status=400)
    

⚠️ IMPORTANT IMPROVEMENTS (DO THIS NEXT)
1. Restrict Cell Leader to their cell

Inside perform_create:


2. Prevent editing after approval

Override update:

def update(self, request, *args, **kwargs):
    report = self.get_object()
    if report.status == "approved":
        return Response({"error": "Cannot edit approved report"}, status=400)
    return super().update(request, *args, **kwargs)