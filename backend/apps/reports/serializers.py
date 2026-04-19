import json

from django.db import IntegrityError, transaction
from django.db.models import Case, Count, DateField, F, Value, When
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from apps.accounts.models import User
from apps.members.models import MemberProfile, Person
from apps.members.services import ensure_cell_membership, evaluate_membership
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
    membership_status = serializers.CharField(source="member_profile.membership_status", read_only=True)
    cell_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Person
        fields = ["id", "first_name", "last_name", "phone", "email", "membership_status", "cell_name"]

    def get_cell_name(self, obj):
        profile = getattr(obj, "member_profile", None)
        if not profile or not profile.cell:
            return None
        return profile.cell.name


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
    first_timer_attendees = ReportAttendeeSerializer(many=True, read_only=True)
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
            "meeting_time",
            "meeting_duration_minutes",
            "report_type",
            "service",
            "service_name",
            "attendees",
            "first_timer_attendees",
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
    attendees = serializers.PrimaryKeyRelatedField(queryset=Person.objects.all(), many=True)
    first_timer_attendees = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.all(),
        many=True,
        required=False,
    )
    new_attendees = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True,
    )
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
            "meeting_time",
            "meeting_duration_minutes",
            "report_type",
            "service",
            "attendees",
            "first_timer_attendees",
            "new_attendees",
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
    def _update_last_attended(*, meeting_date, attendee_person_ids):
        if not attendee_person_ids:
            return
        MemberProfile.objects.filter(person_id__in=attendee_person_ids).update(
            last_attended=Case(
                When(last_attended__isnull=True, then=Value(meeting_date)),
                When(last_attended__lt=meeting_date, then=Value(meeting_date)),
                default=F("last_attended"),
                output_field=DateField(),
            )
        )

    @staticmethod
    def _resolve_new_attendees(new_attendees):
        people = []
        for entry in new_attendees:
            first_name = (entry.get("first_name") or "").strip()
            if not first_name:
                continue
            last_name = (entry.get("last_name") or "").strip()
            phone = (entry.get("phone") or "").strip()
            email = (entry.get("email") or "").strip()

            lookup = None
            if phone:
                lookup = Person.objects.filter(phone=phone).first()
            if lookup is None and email:
                lookup = Person.objects.filter(email__iexact=email).first()
            if lookup is None and first_name and last_name:
                name_matches = list(
                    Person.objects.filter(first_name__iexact=first_name, last_name__iexact=last_name)[:2]
                )
                if len(name_matches) == 1:
                    lookup = name_matches[0]
            if lookup is None:
                lookup = Person.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                    email=email,
                )
            people.append(lookup)
        return people

    @staticmethod
    def _sync_cell_memberships(*, people, cell):
        people = list(people)
        if not people:
            return

        person_by_id = {person.id: person for person in people}
        person_ids = list(person_by_id.keys())
        profile_cell_by_person_id = {
            person_id: cell_id
            for person_id, cell_id in MemberProfile.objects.filter(person_id__in=person_ids).values_list("person_id", "cell_id")
        }
        attendance_counts = {
            row["attendees"]: row["total"]
            for row in CellReport.objects.filter(cell=cell, attendees__in=person_ids)
            .values("attendees")
            .annotate(total=Count("id"))
        }

        for person_id, person in person_by_id.items():
            if profile_cell_by_person_id.get(person_id) == cell.id:
                ensure_cell_membership(person, cell)
                continue
            if attendance_counts.get(person_id, 0) >= 3:
                ensure_cell_membership(person, cell)

    @staticmethod
    def _is_duplicate_report_error(exc):
        cause = getattr(exc, "__cause__", None)
        if cause is not None:
            diag = getattr(cause, "diag", None)
            if getattr(diag, "constraint_name", None) == "uniq_report_per_cell_per_date":
                return True

        error_text = str(exc).lower()
        return "uniq_report_per_cell_per_date" in error_text

    @staticmethod
    def _apply_attendance_deltas(*, added_ids, removed_ids):
        for person in Person.objects.filter(id__in=added_ids):
            evaluate_membership(person, attendance_delta=1)
        for person in Person.objects.filter(id__in=removed_ids):
            evaluate_membership(person, attendance_delta=-1)

    @staticmethod
    def _infer_first_timer_ids(*, attendee_ids, exclude_report_id=None):
        attendee_ids = set(attendee_ids)
        if not attendee_ids:
            return set()
        previous_reports = CellReport.objects.filter(attendees__in=attendee_ids)
        if exclude_report_id:
            previous_reports = previous_reports.exclude(pk=exclude_report_id)
        seen_ids = set(previous_reports.values_list("attendees", flat=True))
        return attendee_ids - seen_ids

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        cell = attrs.get("cell") or getattr(self.instance, "cell", None)
        attendees = attrs.get("attendees")
        first_timer_attendees = attrs.get("first_timer_attendees")
        new_attendees = attrs.get("new_attendees", [])
        if isinstance(new_attendees, str):
            try:
                new_attendees = json.loads(new_attendees)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({"new_attendees": f"Invalid new attendee payload: {exc.msg}."}) from exc
            attrs["new_attendees"] = new_attendees
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
                if not new_attendees:
                    raise serializers.ValidationError({"attendees": "At least one attendee is required."})
                attendees = []
            else:
                attendees = list(self.instance.attendees.all())
        if len(attendees) < 1 and len(new_attendees) < 1:
            raise serializers.ValidationError({"attendees": "At least one attendee is required."})

        attendee_ids = list({attendee.id for attendee in attendees})
        active_cell_memberships = (
            MemberProfile.objects.filter(person_id__in=attendee_ids)
            .exclude(cell__isnull=True)
            .exclude(cell=cell)
            .values_list("person_id", flat=True)
        )
        invalid_attendee_ids = sorted(set(active_cell_memberships))
        if invalid_attendee_ids:
            raise serializers.ValidationError(
                {
                    "attendees": (
                        "Selected attendees are active in another cell. "
                        f"Invalid person IDs: {invalid_attendee_ids}"
                    )
                }
            )

        if first_timer_attendees is None:
            first_timer_attendees = []
        first_timer_ids = list({attendee.id for attendee in first_timer_attendees})
        invalid_first_timer_ids = sorted(set(first_timer_ids) - set(attendee_ids))
        if invalid_first_timer_ids:
            raise serializers.ValidationError(
                {
                    "first_timer_attendees": (
                        "First timer attendees must be selected from attendees list. "
                        f"Invalid IDs: {invalid_first_timer_ids}"
                    )
                }
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

        provided_report_type = attrs.get("report_type")
        if meeting_date:
            expected_type = CellReport.infer_report_type(meeting_date)
            if provided_report_type is None:
                attrs["report_type"] = expected_type
            elif provided_report_type != expected_type:
                raise serializers.ValidationError(
                    {
                        "report_type": (
                            f"Invalid report type for the selected date. "
                            f"Expected: {CellReport.ReportType(expected_type).label}, "
                            f"provided: {CellReport.ReportType(provided_report_type).label}."
                        )
                    }
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        images = validated_data.pop("images", [])
        attendees = list(validated_data.pop("attendees", []))
        first_timer_attendees = validated_data.pop("first_timer_attendees", [])
        new_attendees = validated_data.pop("new_attendees", [])
        request = self.context["request"]
        cell = validated_data["cell"]
        meeting_date = validated_data["meeting_date"]

        attendees.extend(self._resolve_new_attendees(new_attendees))
        attendees = list({person.id: person for person in attendees}.values())

        rejected_report = (
            CellReport.objects.select_for_update()
            .filter(cell=cell, meeting_date=meeting_date, status=CellReport.Status.REJECTED)
            .first()
        )

        if rejected_report:
            previous_attendee_ids = set(rejected_report.attendees.values_list("id", flat=True))
            rejected_report.service = validated_data.get("service")
            rejected_report.report_type = validated_data.get("report_type", CellReport.infer_report_type(meeting_date))
            rejected_report.meeting_time = validated_data.get("meeting_time")
            rejected_report.meeting_duration_minutes = validated_data.get("meeting_duration_minutes")
            rejected_report.attendee_names = validated_data.get("attendee_names", "")
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
                    "meeting_time",
                    "meeting_duration_minutes",
                    "attendee_names",
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

            attendee_person_ids = [attendee.id for attendee in attendees]
            inferred_first_timer_ids = self._infer_first_timer_ids(
                attendee_ids=attendee_person_ids,
                exclude_report_id=rejected_report.pk,
            )
            requested_first_timer_ids = {attendee.id for attendee in first_timer_attendees}
            final_first_timer_ids = requested_first_timer_ids | inferred_first_timer_ids
            first_timer_people = [attendee for attendee in attendees if attendee.id in final_first_timer_ids]

            rejected_report.attendees.set(attendees)
            rejected_report.first_timer_attendees.set(first_timer_people)
            rejected_report.sync_attendance_count(save=True)
            self._update_last_attended(
                meeting_date=rejected_report.meeting_date,
                attendee_person_ids=attendee_person_ids,
            )
            self._sync_cell_memberships(people=attendees, cell=cell)
            current_attendee_ids = set(attendee_person_ids)
            self._apply_attendance_deltas(
                added_ids=current_attendee_ids - previous_attendee_ids,
                removed_ids=previous_attendee_ids - current_attendee_ids,
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

        attendee_person_ids = [attendee.id for attendee in attendees]
        inferred_first_timer_ids = self._infer_first_timer_ids(attendee_ids=attendee_person_ids)
        requested_first_timer_ids = {attendee.id for attendee in first_timer_attendees}
        final_first_timer_ids = requested_first_timer_ids | inferred_first_timer_ids
        first_timer_people = [attendee for attendee in attendees if attendee.id in final_first_timer_ids]

        if attendees:
            report.attendees.set(attendees)
        report.first_timer_attendees.set(first_timer_people)
        report.sync_attendance_count(save=True)
        self._update_last_attended(
            meeting_date=report.meeting_date,
            attendee_person_ids=attendee_person_ids,
        )
        self._sync_cell_memberships(people=attendees, cell=cell)
        self._apply_attendance_deltas(added_ids=set(attendee_person_ids), removed_ids=set())

        ReportImage.objects.bulk_create([ReportImage(report=report, image=img) for img in images])
        return report

    @transaction.atomic
    def update(self, instance, validated_data):
        images = validated_data.pop("images", None)
        attendees = validated_data.pop("attendees", None)
        first_timer_attendees = validated_data.pop("first_timer_attendees", None)
        new_attendees = validated_data.pop("new_attendees", [])

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
            previous_attendee_ids = set(instance.attendees.values_list("id", flat=True))
            attendees = list(attendees) + self._resolve_new_attendees(new_attendees)
            attendees = list({person.id: person for person in attendees}.values())
            instance.attendees.set(attendees)
            attendee_person_ids = [attendee.id for attendee in attendees]
        else:
            attendee_person_ids = list(instance.attendees.values_list("id", flat=True))

        inferred_first_timer_ids = self._infer_first_timer_ids(
            attendee_ids=attendee_person_ids,
            exclude_report_id=instance.pk,
        )
        if first_timer_attendees is not None:
            requested_first_timer_ids = {attendee.id for attendee in first_timer_attendees}
        else:
            requested_first_timer_ids = set(instance.first_timer_attendees.values_list("id", flat=True))
        final_first_timer_ids = requested_first_timer_ids | inferred_first_timer_ids
        current_attendees = list(instance.attendees.all())
        instance.first_timer_attendees.set([attendee for attendee in current_attendees if attendee.id in final_first_timer_ids])

        instance.sync_attendance_count(save=True)
        self._update_last_attended(meeting_date=instance.meeting_date, attendee_person_ids=attendee_person_ids)
        self._sync_cell_memberships(people=instance.attendees.all(), cell=instance.cell)
        if attendees is not None:
            current_attendee_ids = set(attendee_person_ids)
            self._apply_attendance_deltas(
                added_ids=current_attendee_ids - previous_attendee_ids,
                removed_ids=previous_attendee_ids - current_attendee_ids,
            )

        if images:
            ReportImage.objects.bulk_create([ReportImage(report=instance, image=img) for img in images])

        return instance



class ReportCommentCreateSerializer(serializers.Serializer):
    comment = serializers.CharField(allow_blank=False, trim_whitespace=True)
