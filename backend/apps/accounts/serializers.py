from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password

from .models import StaffResponsibility, User

MISSING = object()


class UserSerializer(serializers.ModelSerializer):
    responsibilities = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "bio",
            "profile_picture",
            "role",
            "responsibilities",
            "is_frozen",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def get_responsibilities(self, obj):
        prefetched = getattr(obj, "_prefetched_objects_cache", {}).get("staff_responsibilities")
        if prefetched is not None:
            return [responsibility.code for responsibility in prefetched]
        return list(obj.staff_responsibilities.values_list("code", flat=True))


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    responsibilities = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "password",
            "responsibilities",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        responsibility_codes = attrs.get("responsibilities") or []
        role = attrs.get("role")
        normalized_codes = list(dict.fromkeys(code.strip() for code in responsibility_codes if code.strip()))

        if role != User.Role.STAFF and normalized_codes:
            raise serializers.ValidationError(
                {"responsibilities": "Only users with the staff role can be assigned responsibilities."}
            )

        responsibility_map = {}
        if normalized_codes:
            responsibility_map = {
                item.code: item for item in StaffResponsibility.objects.filter(code__in=normalized_codes)
            }
            missing_codes = sorted(set(normalized_codes) - set(responsibility_map.keys()))
            if missing_codes:
                raise serializers.ValidationError(
                    {"responsibilities": f"Unknown responsibility codes: {', '.join(missing_codes)}."}
                )

        attrs["responsibilities"] = normalized_codes
        attrs["_responsibility_objects"] = [responsibility_map[code] for code in normalized_codes]
        return attrs

    def create(self, validated_data):
        responsibilities = validated_data.pop("_responsibility_objects", [])
        validated_data.pop("responsibilities", None)
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if user.role == User.Role.STAFF and responsibilities:
            user.staff_responsibilities.set(responsibilities)
        return user


class StaffResponsibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffResponsibility
        fields = ["id", "name", "code", "description"]
        read_only_fields = ["id"]


class LoginTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class UserSettingsSerializer(serializers.ModelSerializer):
    cell_meeting_venue = serializers.CharField(required=False, allow_blank=True)
    responsibilities = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "bio",
            "profile_picture",
            "role",
            "responsibilities",
            "cell_meeting_venue",
        ]
        read_only_fields = ["id", "username", "role", "responsibilities"]

    def _get_linked_cell(self, user):
        led_cell = user.led_cells.order_by("id").first()
        if led_cell:
            return led_cell

        member_profile = getattr(user, "member_profile", None)
        if member_profile and member_profile.cell_id:
            return member_profile.cell

        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        cell = self._get_linked_cell(instance)
        data["cell_meeting_venue"] = cell.venue if cell else ""
        return data

    def get_responsibilities(self, obj):
        prefetched = getattr(obj, "_prefetched_objects_cache", {}).get("staff_responsibilities")
        if prefetched is not None:
            return [responsibility.code for responsibility in prefetched]
        return list(obj.staff_responsibilities.values_list("code", flat=True))

    def validate(self, attrs):
        if "cell_meeting_venue" in attrs:
            if not attrs["cell_meeting_venue"].strip():
                raise serializers.ValidationError({"cell_meeting_venue": "Cell meeting venue cannot be empty."})
            cell = self._get_linked_cell(self.instance)
            if not cell:
                raise serializers.ValidationError({"cell_meeting_venue": "No linked cell found for this account."})
        return attrs

    def validate_profile_picture(self, value):
        if not value:
            return value
        content_type = getattr(value, "content_type", "")
        if content_type and not content_type.startswith("image/"):
            raise serializers.ValidationError("Profile picture must be a valid image file.")
        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("Profile picture size must not exceed 5MB.")
        return value

    def update(self, instance, validated_data):
        cell_meeting_venue = validated_data.pop("cell_meeting_venue", MISSING)
        updated_user = super().update(instance, validated_data)

        if cell_meeting_venue is not MISSING:
            cell = self._get_linked_cell(updated_user)
            normalized_venue = cell_meeting_venue.strip()
            if cell and normalized_venue and cell.venue != normalized_venue:
                cell.venue = normalized_venue
                cell.save(update_fields=["venue"])

        return updated_user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        user = self.context["request"].user
        old_password = attrs["old_password"]
        new_password = attrs["new_password"]
        confirm_password = attrs["confirm_password"]

        if not user.check_password(old_password):
            raise serializers.ValidationError({"old_password": "Current password is incorrect."})
        if new_password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Password confirmation does not match."})
        validate_password(new_password, user=user)
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class AssignCellLeaderSerializer(serializers.Serializer):
    member_id = serializers.IntegerField(min_value=1)
    cell_id = serializers.IntegerField(min_value=1)


class AssignFellowshipLeaderSerializer(serializers.Serializer):
    member_id = serializers.IntegerField(min_value=1)
    fellowship_id = serializers.IntegerField(min_value=1)


class CreateLeaderSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[User.Role.FELLOWSHIP_LEADER, User.Role.CELL_LEADER])
    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True, min_length=8)
    fellowship_id = serializers.IntegerField(required=False, min_value=1)
    cell_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        role = attrs.get("role")
        if role == User.Role.FELLOWSHIP_LEADER and not attrs.get("fellowship_id"):
            raise serializers.ValidationError({"fellowship_id": "fellowship_id is required for fellowship leaders."})
        if role == User.Role.CELL_LEADER and not attrs.get("cell_id"):
            raise serializers.ValidationError({"cell_id": "cell_id is required for cell leaders."})
        return attrs
