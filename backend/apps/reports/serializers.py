from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.accounts.models import User
from .models import CellReport, ReportActivityLog, ReportComment, ReportImage


class ReportImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportImage
        fields = ["id", "image", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class ReportCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = ReportComment
        fields = ["id", "author", "author_username", "comment", "created_at"]
        read_only_fields = ["id", "author", "author_username", "created_at"]


class ReportActivityLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = ReportActivityLog
        fields = ["id", "action", "note", "actor", "actor_username", "created_at"]
        read_only_fields = ["id", "created_at", "actor", "actor_username"]


class CellReportSerializer(serializers.ModelSerializer):
    images = ReportImageSerializer(many=True, read_only=True)
    comments = ReportCommentSerializer(many=True, read_only=True)
    activity_logs = ReportActivityLogSerializer(many=True, read_only=True)

    class Meta:
        model = CellReport
        fields = [
            "id",
            "cell",
            "submitted_by",
            "meeting_date",
            "attendance_count",
            "new_members",
            "offering_amount",
            "summary",
            "status",
            "reviewed_by",
            "approved_by",
            "reviewed_at",
            "approved_at",
            "created_at",
            "updated_at",
            "images",
            "comments",
            "activity_logs",
        ]
        read_only_fields = [
            "id",
            "submitted_by",
            "status",
            "reviewed_by",
            "approved_by",
            "reviewed_at",
            "approved_at",
            "created_at",
            "updated_at",
            "images",
            "comments",
            "activity_logs",
        ]


class CellReportCreateUpdateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = CellReport
        fields = [
            "id",
            "cell",
            "meeting_date",
            "attendance_count",
            "new_members",
            "offering_amount",
            "summary",
            "images",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        cell = attrs.get("cell") or getattr(self.instance, "cell", None)

        if self.instance and self.instance.status == CellReport.Status.APPROVED:
            raise serializers.ValidationError("Approved reports cannot be edited.")
        if self.instance and self.instance.status in {CellReport.Status.REVIEWED, CellReport.Status.REJECTED}:
            raise serializers.ValidationError("Only pending reports can be edited.")

        if self.instance is None:
            images = attrs.get("images") or []
            if len(images) < 1:
                raise serializers.ValidationError({"images": "At least one image is required."})
        else:
            incoming_images = attrs.get("images")
            if incoming_images is not None and len(incoming_images) < 1 and not self.instance.images.exists():
                raise serializers.ValidationError({"images": "At least one image is required."})

        if user.role == User.Role.CELL_LEADER and cell and cell.leader_id != user.id:
            raise serializers.ValidationError({"cell": "Cell leaders can only submit for their own cell."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        images = validated_data.pop("images", [])
        request = self.context["request"]

        try:
            report = CellReport.objects.create(submitted_by=request.user, **validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"non_field_errors": ["A report for this cell and meeting date already exists."]}
            ) from exc

        ReportImage.objects.bulk_create([ReportImage(report=report, image=img) for img in images])
        return report

    @transaction.atomic
    def update(self, instance, validated_data):
        images = validated_data.pop("images", None)

        for key, value in validated_data.items():
            setattr(instance, key, value)

        try:
            instance.save()
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"non_field_errors": ["A report for this cell and meeting date already exists."]}
            ) from exc

        if images:
            ReportImage.objects.bulk_create([ReportImage(report=instance, image=img) for img in images])

        return instance


class ReportCommentCreateSerializer(serializers.Serializer):
    comment = serializers.CharField(allow_blank=False, trim_whitespace=True)
