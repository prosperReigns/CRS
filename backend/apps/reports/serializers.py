from django.db import IntegrityError, transaction
from django.db.models import Case, DateField, F, Value, When
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from apps.accounts.models import User
from apps.members.models import MemberProfile
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


class ReportAttendeeSerializer(serializers.ModelSerializer):
    user = ReportUserSerializer(read_only=True)
    cell_name = serializers.CharField(source="cell.name", read_only=True)

    class Meta:
        model = MemberProfile
        fields = ["id", "user", "cell", "cell_name"]


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
    fellowship_name = serializers.CharField(source="cell.fellowship.name", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)
    attendees = ReportAttendeeSerializer(many=True, read_only=True)
    images = ReportImageSerializer(many=True, read_only=True)
    comments = ReportCommentSerializer(many=True, read_only=True)
    activity_logs = ReportActivityLogSerializer(many=True, read_only=True)

    class Meta:
        model = CellReport
        fields = [
            "id",
            "cell",
            "cell_name",
            "fellowship_name",
            "submitted_by",
            "author",
            "meeting_date",
            "report_type",
            "service",
            "service_name",
            "attendees",
            "attendance_count",
            "attendee_names",
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
            "fellowship_name",
            "author",
            "reviewer",
            "approver",
            "service_name",
            "reviewed_at",
            "approved_at",
            "attendance_count",
            "created_at",
            "updated_at",
            "images",
            "comments",
            "activity_logs",
        ]


class CellReportCreateUpdateSerializer(serializers.ModelSerializer):
    attendees = serializers.PrimaryKeyRelatedField(queryset=MemberProfile.objects.select_related("cell"), many=True)
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
            "report_type",
            "service",
            "attendees",
            "attendee_names",
            "new_members",
            "offering_amount",
            "summary",
            "images",
        ]
        read_only_fields = ["id"]
        validators = [
            UniqueTogetherValidator(
                queryset=CellReport.objects.exclude(status=CellReport.Status.REJECTED),
                fields=["cell", "meeting_date"],
                message="A report for this cell and meeting date already exists.",
            )
        ]

    def _extract_images(self):
        request = self.context["request"]
        images = [*request.FILES.getlist("images"), *request.FILES.getlist("images[]")]
        unique_images = []
        seen = set()
        for image in images:
            key = (image.name, image.size)
            if key in seen:
                continue
            seen.add(key)
            unique_images.append(image)
        return unique_images

    @staticmethod
    def _update_last_attended(*, meeting_date, attendee_ids):
        if not attendee_ids:
            return
        MemberProfile.objects.filter(id__in=attendee_ids).update(
            last_attended=Case(
                When(last_attended__isnull=True, then=Value(meeting_date)),
                When(last_attended__lt=meeting_date, then=Value(meeting_date)),
                default=F("last_attended"),
                output_field=DateField(),
            )
        )

    @staticmethod
    def _is_duplicate_report_error(exc):
        cause = getattr(exc, "__cause__", None)
        if cause is not None:
            diag = getattr(cause, "diag", None)
            if getattr(diag, "constraint_name", None) == "uniq_report_per_cell_per_date":
                return True

        error_text = str(exc).lower()
        return "uniq_report_per_cell_per_date" in error_text

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        cell = attrs.get("cell") or getattr(self.instance, "cell", None)
        attendees = attrs.get("attendees")
        meeting_date = attrs.get("meeting_date") or getattr(self.instance, "meeting_date", None)
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
        if cell is None:
            raise serializers.ValidationError({"cell": "Cell is required."})
        if cell.leader_id is None:
            raise serializers.ValidationError(
                {"cell": "This cell does not have an assigned leader. Please contact an administrator."}
            )

        if attendees is None:
            if self.instance is None:
                raise serializers.ValidationError({"attendees": "At least one attendee is required."})
            attendees = list(self.instance.attendees.all())
        if len(attendees) < 1:
            raise serializers.ValidationError({"attendees": "At least one attendee is required."})

        attendee_ids = list({attendee.id for attendee in attendees})
        valid_attendee_ids = set(MemberProfile.objects.filter(id__in=attendee_ids, cell=cell).values_list("id", flat=True))
        invalid_attendee_ids = sorted(set(attendee_ids) - valid_attendee_ids)
        if invalid_attendee_ids:
            raise serializers.ValidationError(
                {"attendees": f"All attendees must belong to the selected cell. Invalid IDs: {invalid_attendee_ids}"}
            )

        if cell and meeting_date:
            duplicate_qs = CellReport.objects.filter(cell=cell, meeting_date=meeting_date)
            if self.instance:
                duplicate_qs = duplicate_qs.exclude(pk=self.instance.pk)
            if duplicate_qs.exclude(status=CellReport.Status.REJECTED).exists():
                raise serializers.ValidationError(
                    {"non_field_errors": ["A report for this cell and meeting date already exists."]}
                )

        service = attrs.get("service", getattr(self.instance, "service", None))
        if service and meeting_date and service.day_of_week.lower() != meeting_date.strftime("%A").lower():
            raise serializers.ValidationError(
                {"service": f"Selected service runs on {service.day_of_week}, but meeting date is {meeting_date.strftime('%A')}."}
            )

        report_type = attrs.get("report_type", getattr(self.instance, "report_type", None))
        if meeting_date and report_type:
            expected_type = CellReport.infer_report_type(meeting_date)
            if report_type != expected_type:
                raise serializers.ValidationError(
                    {
                        "report_type": (
                            f"Invalid report type for the selected date. "
                            f"Expected: {CellReport.ReportType(expected_type).label}."
                        )
                    }
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        images = validated_data.pop("images", [])
        attendees = validated_data.pop("attendees", [])
        request = self.context["request"]
        cell = validated_data["cell"]
        meeting_date = validated_data["meeting_date"]

        rejected_report = (
            CellReport.objects.select_for_update()
            .filter(cell=cell, meeting_date=meeting_date, status=CellReport.Status.REJECTED)
            .first()
        )

        if rejected_report:
            rejected_report.service = validated_data.get("service")
            rejected_report.report_type = validated_data["report_type"]
            rejected_report.new_members = validated_data["new_members"]
            rejected_report.offering_amount = validated_data["offering_amount"]
            rejected_report.summary = validated_data["summary"]
            rejected_report.submitted_by = request.user
            rejected_report.leader = cell.leader
            rejected_report.status = CellReport.Status.PENDING
            rejected_report.reviewed_by = None
            rejected_report.reviewed_at = None
            rejected_report.approved_by = None
            rejected_report.approved_at = None
            rejected_report.save(
                update_fields=[
                    "service",
                    "report_type",
                    "new_members",
                    "offering_amount",
                    "summary",
                    "submitted_by",
                    "leader",
                    "status",
                    "reviewed_by",
                    "reviewed_at",
                    "approved_by",
                    "approved_at",
                    "updated_at",
                ]
            )

            rejected_report.attendees.set(attendees)
            rejected_report.sync_attendance_count(save=True)
            self._update_last_attended(
                meeting_date=rejected_report.meeting_date,
                attendee_ids=[attendee.id for attendee in attendees],
            )

            rejected_report.images.all().delete()
            ReportImage.objects.bulk_create([ReportImage(report=rejected_report, image=img) for img in images])
            return rejected_report

        try:
            report = CellReport.objects.create(submitted_by=request.user, leader=cell.leader, **validated_data)
        except IntegrityError as exc:
            if self._is_duplicate_report_error(exc):
                raise serializers.ValidationError(
                    {"non_field_errors": ["A report for this cell and meeting date already exists."]}
                ) from exc
            raise

        if attendees:
            report.attendees.set(attendees)
        report.sync_attendance_count(save=True)
        self._update_last_attended(
            meeting_date=report.meeting_date,
            attendee_ids=[attendee.id for attendee in attendees],
        )

        ReportImage.objects.bulk_create([ReportImage(report=report, image=img) for img in images])
        return report

    @transaction.atomic
    def update(self, instance, validated_data):
        images = validated_data.pop("images", None)
        attendees = validated_data.pop("attendees", None)

        if "cell" in validated_data:
            validated_data["leader"] = validated_data["cell"].leader

        for key, value in validated_data.items():
            setattr(instance, key, value)

        try:
            instance.save()
        except IntegrityError as exc:
            if self._is_duplicate_report_error(exc):
                raise serializers.ValidationError(
                    {"non_field_errors": ["A report for this cell and meeting date already exists."]}
                ) from exc
            raise

        if attendees is not None:
            instance.attendees.set(attendees)
            attendee_ids = [attendee.id for attendee in attendees]
        else:
            attendee_ids = list(instance.attendees.values_list("id", flat=True))

        instance.sync_attendance_count(save=True)
        self._update_last_attended(meeting_date=instance.meeting_date, attendee_ids=attendee_ids)

        if images:
            ReportImage.objects.bulk_create([ReportImage(report=instance, image=img) for img in images])

        return instance


class ReportCommentCreateSerializer(serializers.Serializer):
    comment = serializers.CharField(allow_blank=False, trim_whitespace=True)
