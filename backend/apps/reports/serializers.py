from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.accounts.models import User
from .models import CellReport, ReportActivityLog, ReportComment, ReportImage


class ReportImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportImage
        fields = ["id", "image", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class ReportUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "role"]


class ReportCommentSerializer(serializers.ModelSerializer):
    author = ReportUserSerializer(read_only=True)

    class Meta:
        model = ReportComment
        fields = ["id", "author", "comment", "created_at"]
        read_only_fields = ["id", "author", "created_at"]


class ReportActivityLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = ReportActivityLog
        fields = ["id", "action", "note", "actor", "actor_username", "created_at"]
        read_only_fields = ["id", "created_at", "actor", "actor_username"]


class CellReportSerializer(serializers.ModelSerializer):
    author = ReportUserSerializer(source="submitted_by", read_only=True)
    reviewer = ReportUserSerializer(source="reviewed_by", read_only=True)
    approver = ReportUserSerializer(source="approved_by", read_only=True)
    cell_name = serializers.CharField(source="cell.name", read_only=True)
    images = ReportImageSerializer(many=True, read_only=True)
    comments = ReportCommentSerializer(many=True, read_only=True)
    activity_logs = ReportActivityLogSerializer(many=True, read_only=True)

    class Meta:
        model = CellReport
        fields = [
            "id",
            "cell",
            "cell_name",
            "submitted_by",
            "author",
            "meeting_date",
            "attendance_count",
            "new_members",
            "offering_amount",
            "summary",
            "status",
            "reviewed_by",
            "reviewer",
            "approved_by",
            "approver",
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
            "cell_name",
            "author",
            "reviewer",
            "approver",
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

    def _extract_images(self):
        request = self.context["request"]
        images = []
        images.extend(request.FILES.getlist("images"))
        images.extend(request.FILES.getlist("images[]"))
        return images

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        cell = attrs.get("cell") or getattr(self.instance, "cell", None)
        extracted_images = self._extract_images()
        if extracted_images and "images" not in attrs:
            attrs["images"] = extracted_images

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
