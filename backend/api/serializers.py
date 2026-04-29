from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (User, Room, Device, Action, Stat,
                     Category, Service, ServiceAction, DeletionRequest, Scenario, AllowedMember)
from .allowed_members import is_allowed, get_role


class UserRegisterSerializer(serializers.ModelSerializer):
    """Inscription : le rôle est déterminé par l'email pré-autorisé,
    pas choisi par l'utilisateur."""
    password = serializers.CharField(write_only=True, required=True,
                                     validators=[validate_password])

    class Meta:
        model = User
        fields = ("id", "username", "email", "password",
                  "first_name", "last_name",
                  "age", "gender", "date_naissance")

    def validate_email(self, value):
        v = value.lower().strip()
        # 1. Vérifier que l'email est dans la liste des membres autorisés
        if not is_allowed(v):
            raise serializers.ValidationError(
                "Cet email n'est pas autorisé. Seuls les membres de la maison "
                "peuvent s'inscrire. Contactez l'administrateur si vous pensez "
                "que c'est une erreur.")
        # 2. Vérifier qu'aucun compte n'existe déjà avec cet email
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(
                "Un compte existe déjà avec cet email.")
        return v

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        email = validated_data["email"]
        # Le rôle est déterminé automatiquement
        role = get_role(email)
        # Désactivé jusqu'à validation email
        user = User.objects.create_user(
            password=pwd,
            role=role,
            email_verified=False,
            is_approved=True,  # déjà approuvé car email pré-autorisé
            **validated_data,
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    max_level = serializers.CharField(source="max_level_allowed", read_only=True)
    photo_url = serializers.SerializerMethodField()
    is_child = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name",
                  "age", "role", "gender", "date_naissance",
                  "photo", "photo_url",
                  "level", "points", "max_level",
                  "nb_connexions", "nb_actions",
                  "is_approved", "email_verified", "is_staff", "is_child")
        # Le rôle est read_only : impossible de devenir parent en modifiant son profil
        read_only_fields = ("level", "points", "nb_connexions", "nb_actions",
                            "is_approved", "email_verified", "max_level",
                            "is_staff", "role", "is_child")

    def get_photo_url(self, obj):
        request = self.context.get("request")
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, min_length=6, max_length=6)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__"


class DeviceSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source="room.name", read_only=True)
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    needs_maintenance = serializers.BooleanField(read_only=True)
    is_security = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = ("id", "name", "type", "type_display", "description",
                  "category", "category_name",
                  "room", "room_name",
                  "status", "status_display",
                  "battery", "value", "target_value", "brand",
                  "start_time", "end_time", "last_maintenance",
                  "needs_maintenance", "is_security",
                  "user", "created_at")
        read_only_fields = ("created_at", "user")

    def get_is_security(self, obj):
        return obj.type in User.SECURITY_DEVICE_TYPES


class ServiceSerializer(serializers.ModelSerializer):
    actions = serializers.SerializerMethodField()
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    related_devices = serializers.PrimaryKeyRelatedField(queryset=Device.objects.all(), many=True, required=False)
    related_device = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    related_device_names = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Service
        fields = ("id", "name", "description", "type", "type_display",
                  "related_device", "related_devices", "related_device_names", "active",
                  "created_by", "created_by_name", "actions", "created_at")
        read_only_fields = ("created_by", "created_at")

    def get_actions(self, obj):
        return ServiceActionSerializer(obj.actions.all(), many=True).data

    def get_related_device_names(self, obj):
        return [d.name for d in obj.related_devices.all()]

    def validate(self, attrs):
        single = attrs.pop("related_device", None)
        if single and not attrs.get("related_devices"):
            try:
                attrs["related_devices"] = [Device.objects.get(pk=single)]
            except Device.DoesNotExist:
                raise serializers.ValidationError({"related_device": "Objet lié introuvable."})
        return attrs


class ServiceActionSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)

    class Meta:
        model = ServiceAction
        fields = ("id", "device", "device_name", "action_type", "action_value", "order")


class ActionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    device_name = serializers.CharField(source="device.name", read_only=True)
    action_type_display = serializers.CharField(source="get_action_type_display", read_only=True)

    class Meta:
        model = Action
        fields = ("id", "user", "user_name", "action_type", "action_type_display",
                  "description", "device", "device_name", "date")


class StatSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)

    class Meta:
        model = Stat
        fields = ("id", "device", "device_name", "consumption", "date")


class DeletionRequestSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.username", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = DeletionRequest
        fields = ("id", "device", "device_name",
                  "requested_by", "requested_by_name",
                  "reason", "status", "status_display",
                  "created_at", "resolved_at")
        read_only_fields = ("requested_by", "status", "created_at", "resolved_at")


class ScenarioSerializer(serializers.ModelSerializer):
    trigger_device_name = serializers.CharField(source="trigger_device.name", read_only=True)
    action_device_name = serializers.CharField(source="action_device.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Scenario
        fields = ("id", "name", "description", "trigger_type", "trigger_time",
                  "trigger_device", "trigger_device_name",
                  "action_type", "action_device", "action_device_name",
                  "action_value", "active", "last_run",
                  "created_by", "created_by_name")
        read_only_fields = ("created_by", "last_run")


class AllowedMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = AllowedMember
        fields = ("id", "email", "role", "created_at")
        read_only_fields = ("created_at",)
