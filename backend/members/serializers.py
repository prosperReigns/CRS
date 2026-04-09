from rest_framework import serializers
from .models import MemberProfile, SoulWinning, Attendance

class MemberProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = MemberProfile
        fields = "__all__"

class SoulWinningSerializer(serializers.ModelSerializer):
    member = serializers.StringRelatedField()

    class Meta:
        model = SoulWinning
        fields = "__all__"

class AttendanceSerializer(serializers.ModelSerializer):
    member = serializers.StringRelatedField()

    class Meta:
        model = Attendance
        fields = "__all__"

class BulkAttendanceSerializer(serializers.Serializer):
    member = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )
    date = serializers.DateField()
    service_type = serializers.CharField()

    def validate_member_ids(self, value):
        if not value:
            raise serializers.ValidationError("At least one member is required.")
        return value

    def create(self, validated_data):
        member = validated_data["member"]
        date = validated_data["date"]
        service_type = validated_data["service_type"]

        attendances = []
        for member_id in member:
            attendance = Attendance(member_id=member_id, date=date, service_type=service_type)
            attendances.append(attendance)

        Attendance.objects.bulk_create(attendances)
        return attendances