from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import MemberProfile, SoulWinning, Attendance
from .serializers import MemberProfileSerializer, SoulWinningSerializer, AttendanceSerializer, BulkAttendanceSerializer
from django.utils.timezone import now
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framwork import status

class MemberProfileViewSet(viewsets.ModelViewSet):
    serializer_class = MemberProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role in ["pastor", "staff"]:
            return Attendance.objects.all()

        if user.role == "fellowship_leader":
            return Attendance.objects.filter(member__cell__fellowship__leader=user)

        if user.role == "cell_leader":
            return Attendance.objects.filter(member__cell__leader=user)

        return Attendance.objects.filter(member__user=user)

class SoulWinningViewSet(viewsets.ModelViewSet):
    queryset = SoulWinning.objects.all()
    serializer_class = SoulWinningSerializer
    permission_classes = [IsAuthenticated]

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def bulk_mark(self, request):
        serializer = BulkAttendanceSerializer(data=request.data)

        if serializer.is_valid():
            date = serializer.validated_data["date"]
            service_type = serializer.validated_data["service_type"]
            member_ids = serializer.validated_data["members"]

            created_records = []

            for member_id in member_ids:
                attendance, created = Attendance.objects.get_or_create(
                    member_id=member_id,
                    date=date,
                    service_type=service_type,
                    defaults={
                        "present": True,
                        "recorded_by": request.user
                    }
                )

                if created:
                    created_records.append(attendance)

                    # 🔥 Update last attended
                    member = attendance.member
                    member.last_attended = date
                    member.save()

            return Response({
                "message": "Attendance recorded",
                "count": len(created_records)
            })

        return Response(serializer.errors, status=400)