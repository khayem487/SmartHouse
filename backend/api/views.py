import csv
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import generics, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (User, Room, Device, Action, Stat,
                     Category, Service, ServiceAction, DeletionRequest, Scenario, AllowedMember)
from .serializers import (UserRegisterSerializer, UserSerializer,
                          RoomSerializer, DeviceSerializer, ActionSerializer,
                          StatSerializer, CategorySerializer, ServiceSerializer,
                          DeletionRequestSerializer, PasswordChangeSerializer,
                          ScenarioSerializer, AllowedMemberSerializer)
from .scenario_engine import execute_scenario


# ============================================================
# HELPER : envoi de l'email de validation
# ============================================================
def send_verification_email(user):
    """Envoie un code de vérification à 6 chiffres."""
    user.regenerate_verification_code()
    user.save(update_fields=["verification_code", "verification_code_sent_at"])

    subject = "Code de verification - Maison Intelligente"
    message = f"""Bonjour {user.first_name or user.username},

Votre code de verification est : {user.verification_code}

Ce code expire dans 15 minutes.

Pseudo : {user.username}
Role attribue : {user.get_role_display()}

Si vous n'etes pas a l'origine de cette inscription, ignorez cet email.
"""

    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #26215C, #4f46e5); color: white; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0;">Maison Intelligente</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">Verification de compte</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p>Bonjour <strong>{user.first_name or user.username}</strong>,</p>
        <p>Utilisez ce code a 6 chiffres dans le formulaire d'inscription :</p>
        <p style="font-size: 34px; letter-spacing: 8px; font-weight: 700; text-align: center; margin: 20px 0;">{user.verification_code}</p>
        <p style="color: #555;">Ce code expire dans <strong>15 minutes</strong>.</p>
      </div>
    </div>
    """

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        # On log mais on n'empêche pas l'inscription
        print(f"⚠ Erreur envoi email à {user.email} : {e}")
        return False


# ============================================================
# AUTH
# ============================================================
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Envoie le mail de validation
        sent = send_verification_email(user)
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "email_sent": sent,
            "message": (
                "Inscription réussie ! Un code de vérification à 6 chiffres a été envoyé. "
                "Saisissez ce code pour activer votre compte."
            ),
        }, status=status.HTTP_201_CREATED)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        # Bloquer si email pas vérifié
        if not user.email_verified and not user.is_superuser:
            raise serializers.ValidationError(
                "Votre email n'a pas encore été validé. "
                "Saisissez le code a 6 chiffres recu par email pour activer votre compte.")
        user.points = (user.points or 0) + 0.25
        user.nb_connexions = (user.nb_connexions or 0) + 1
        user.save()
        Action.objects.create(user=user, action_type="login",
                              description="Connexion à la plateforme")
        ctx = {"request": self.context.get("request")}
        data["user"] = UserSerializer(user, context=ctx).data
        return data


# Import nécessaire pour l'erreur ci-dessus
from rest_framework import serializers


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    s = PasswordChangeSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    if not request.user.check_password(s.validated_data["old_password"]):
        return Response({"detail": "Ancien mot de passe incorrect."}, status=400)
    request.user.set_password(s.validated_data["new_password"])
    request.user.save()
    return Response({"detail": "Mot de passe modifié avec succès."})


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def verify_email(request, token):
    try:
        user = User.objects.get(verification_token=token)
    except User.DoesNotExist:
        return Response({"detail": "Lien de validation invalide ou expiré."},
                        status=400)
    if user.email_verified:
        return Response({"detail": "Cet email est déjà validé.", "already": True})
    user.email_verified = True
    user.save()
    return Response({
        "detail": f"✔ Email validé pour {user.username}. Vous pouvez maintenant vous connecter.",
        "username": user.username,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_code(request):
    email = request.data.get("email", "").lower().strip()
    code = str(request.data.get("code", "")).strip()
    if not email or not code:
        return Response({"detail": "Email et code requis."}, status=400)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"detail": "Aucun compte trouvé pour cet email."}, status=404)

    if user.email_verified:
        return Response({"detail": "Cet email est déjà validé.", "already": True})

    if not user.verification_code:
        return Response({"detail": "Aucun code actif. Demandez un nouveau code."}, status=400)

    if not user.verification_code_sent_at or timezone.now() - user.verification_code_sent_at > timedelta(minutes=15):
        return Response({"detail": "Code expiré. Demandez un nouveau code."}, status=400)

    if code != user.verification_code:
        return Response({"detail": "Code invalide."}, status=400)

    user.email_verified = True
    user.verification_code = ""
    user.save(update_fields=["email_verified", "verification_code"])
    return Response({
        "detail": f"Email validé pour {user.username}. Vous pouvez maintenant vous connecter.",
        "username": user.username,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_verification(request):
    """Renvoie le code de validation 6 chiffres."""
    email = request.data.get("email", "").lower().strip()
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"detail": "Aucun compte trouvé avec cet email."}, status=404)
    if user.email_verified:
        return Response({"detail": "Cet email est déjà validé."}, status=400)
    sent = send_verification_email(user)
    return Response({"detail": "Code renvoyé par email." if sent else "Erreur d'envoi.",
                     "sent": sent})


# ============================================================
# PROFILE
# ============================================================
class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_users(request):
    if not request.user.is_staff:
        return Response({"detail": "Admin uniquement."}, status=403)
    users = User.objects.exclude(id=request.user.id)
    return Response(UserSerializer(users, many=True, context={"request": request}).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_toggle_user(request, user_id):
    """Admin only: approve or suspend any user account."""
    if not request.user.is_staff:
        return Response({"detail": "Admin uniquement."}, status=403)
    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable."}, status=404)
    approved = request.data.get("approved")
    if approved is None:
        return Response({"detail": "Champ 'approved' requis."}, status=400)
    target.is_approved = bool(approved)
    target.save()
    return Response({
        "detail": f"{'Compte approuvé' if target.is_approved else 'Compte suspendu'}.",
        "is_approved": target.is_approved,
        "username": target.username,
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, user_id):
    if not request.user.is_staff:
        return Response({"detail": "Admin uniquement."}, status=403)
    if request.user.id == user_id:
        return Response({"detail": "Impossible de supprimer votre propre compte admin."}, status=400)
    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable."}, status=404)
    username = target.username
    target.delete()
    return Response({"detail": f"Utilisateur '{username}' supprimé."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_level(request):
    target = request.data.get("level")
    u = request.user
    if not u.can_set_level(target):
        return Response({"detail": f"Pas assez de points pour le niveau '{target}'."},
                        status=400)
    old = u.level
    u.level = target
    u.save()
    Action.objects.create(user=u, action_type="level_change",
                          description=f"Niveau changé : {old} -> {target}")
    return Response(UserSerializer(u, context={"request": request}).data)


# ============================================================
# CATEGORIES / ROOMS
# ============================================================
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"): return [AllowAny()]
        return [IsAuthenticated()]


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"): return [AllowAny()]
        return [IsAuthenticated()]


# ============================================================
# DEVICES
# ============================================================
class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer

    def get_permissions(self):
        if self.action == "list": return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("type"):     qs = qs.filter(type=p["type"])
        if p.get("room"):     qs = qs.filter(room_id=p["room"])
        if p.get("category"): qs = qs.filter(category_id=p["category"])
        if p.get("status"):   qs = qs.filter(status=p["status"])
        if p.get("brand"):    qs = qs.filter(brand__icontains=p["brand"])
        if p.get("q"):
            q = p["q"]
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q)
                           | Q(brand__icontains=q))
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        u = request.user
        u.points = (u.points or 0) + 0.5
        u.nb_actions = (u.nb_actions or 0) + 1
        u.save()
        Action.objects.create(user=u, action_type="consult", device=instance,
                              description=f"Consultation de {instance.name}")
        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        # Restriction enfant
        if self.request.user.is_child():
            raise serializers.ValidationError(
                "Les enfants ne peuvent pas ajouter d'objets.")
        device = serializer.save(user=self.request.user)
        self.request.user.nb_actions += 1
        self.request.user.save()
        Action.objects.create(user=self.request.user, action_type="create",
                              device=device, description=f"Création de {device.name}")

    def perform_update(self, serializer):
        if self.request.user.is_child():
            raise serializers.ValidationError(
                "Les enfants ne peuvent pas modifier les objets.")
        device = serializer.save()
        self.request.user.nb_actions += 1
        self.request.user.save()
        Action.objects.create(user=self.request.user, action_type="update",
                              device=device, description=f"Modification de {device.name}")

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {"detail": "Vous devez créer une demande de suppression. "
                           "Seul l'administrateur peut supprimer directement."},
                status=403)
        device = self.get_object()
        Action.objects.create(
            user=request.user, action_type="update",
            description=f"Suppression directe de {device.name} par l'admin")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="repair")
    def repair(self, request, pk=None):
        if request.user.is_child():
            return Response({"detail": "Les enfants ne peuvent pas effectuer de maintenance."},
                            status=403)
        device = self.get_object()
        device.last_maintenance = timezone.now().date()
        device.battery = 100
        device.save()
        Action.objects.create(
            user=request.user, action_type="update", device=device,
            description=f"Maintenance effectuée sur {device.name}")
        return Response(DeviceSerializer(device).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_device(request, pk):
    try:
        device = Device.objects.get(pk=pk)
    except Device.DoesNotExist:
        return Response({"detail": "Non trouvé"}, status=404)
    if not request.user.can_toggle_device(device):
        return Response(
            {"detail": "🔒 Les enfants ne peuvent pas activer/désactiver "
                       "les objets de sécurité (alarme, caméra, porte, détecteur)."},
            status=403)

    # Support specific actions per type
    action_type = request.data.get("action")
    if action_type:
        value = request.data.get("value")
        # Thermostat
        if device.type == "thermostat" and action_type in ("increase", "decrease"):
            delta = 1.0 if action_type == "increase" else -1.0
            device.value = max(10, min(35, (device.value or 20) + delta))
            device.target_value = device.value
            device.save()
            Action.objects.create(user=request.user, action_type="toggle", device=device,
                                  description=f"Thermostat réglé à {device.value}°C")
        elif device.type == "thermostat" and action_type == "set_value":
            if value is None:
                return Response({"detail": "'value' requis pour set_value."}, status=400)
            try:
                temp = float(value)
            except (TypeError, ValueError):
                return Response({"detail": "Valeur invalide."}, status=400)
            device.value = max(10, min(35, temp))
            device.target_value = device.value
            device.status = "on"
            device.save()
            Action.objects.create(user=request.user, action_type="toggle", device=device,
                                  description=f"Thermostat (slider) → {device.value}°C")
        # Lave-linge
        elif device.type == "lave_linge" and action_type in ("eco", "rapide", "intensif"):
            device.value = {"eco": 1, "rapide": 2, "intensif": 3}.get(action_type, 1)
            if device.status == "off":
                device.status = "on"
            device.save()
            Action.objects.create(user=request.user, action_type="toggle", device=device,
                                  description=f"Lave-linge → mode {action_type}")
        # Machine à café
        elif device.type == "machine_cafe" and action_type in ("prepare", "refill", "intensity"):
            if action_type == "intensity":
                if value is None:
                    return Response({"detail": "'value' requis pour intensity."}, status=400)
                try:
                    intensity = int(float(value))
                except (TypeError, ValueError):
                    return Response({"detail": "Valeur invalide."}, status=400)
                intensity = max(1, min(3, intensity))
                device.value = intensity
                device.target_value = intensity
                device.status = "on"
                label = {1: "léger", 2: "normal", 3: "fort"}.get(intensity, "normal")
                desc = f"Machine à café → intensité {label}"
            else:
                device.value = 2 if action_type == "prepare" else 1
                device.status = "on"
                desc = f"Machine à café → {action_type}"
            device.save()
            Action.objects.create(user=request.user, action_type="toggle", device=device,
                                  description=desc)
        # Aspirateur
        elif device.type == "aspirateur" and action_type in ("eco", "turbo", "stop"):
            device.value = {"eco": 1, "turbo": 2}.get(action_type, 0)
            device.status = "off" if action_type == "stop" else "on"
            device.save()
            Action.objects.create(user=request.user, action_type="toggle", device=device,
                                  description=f"Aspirateur → {action_type}")
        # Climatiseur
        elif device.type == "climatiseur" and action_type in ("increase", "decrease", "mode_chaud", "mode_froid"):
            if action_type == "mode_chaud":
                device.value = 26
            elif action_type == "mode_froid":
                device.value = 18
            else:
                delta = 1 if action_type == "increase" else -1
                device.value = max(16, min(30, (device.value or 20) + delta))
            device.target_value = device.value
            device.status = "on"
            device.save()
            Action.objects.create(user=request.user, action_type="toggle", device=device,
                                  description=f"Climatiseur → {device.value}°C")
        elif device.type == "climatiseur" and action_type == "set_value":
            if value is None:
                return Response({"detail": "'value' requis pour set_value."}, status=400)
            try:
                temp = float(value)
            except (TypeError, ValueError):
                return Response({"detail": "Valeur invalide."}, status=400)
            device.value = max(16, min(30, temp))
            device.target_value = device.value
            device.status = "on"
            device.save()
            Action.objects.create(user=request.user, action_type="toggle", device=device,
                                  description=f"Climatiseur (slider) → {device.value}°C")
        # Volets
        elif device.type == "volet" and action_type in ("open", "close", "set_value"):
            if action_type == "set_value":
                if value is None:
                    return Response({"detail": "'value' requis pour set_value."}, status=400)
                try:
                    opening = float(value)
                except (TypeError, ValueError):
                    return Response({"detail": "Valeur invalide."}, status=400)
                device.value = max(0, min(100, opening))
            else:
                device.value = 100 if action_type == "open" else 0
            device.status = "on" if (device.value or 0) > 0 else "off"
            device.target_value = device.value
            device.save()
            Action.objects.create(user=request.user, action_type="toggle", device=device,
                                  description=f"Volet → {round(device.value or 0)}%")
        # Alarme
        elif device.type == "alarme" and action_type in ("activate", "deactivate", "panic"):
            device.status = "on"
            device.value = {"activate": 1, "deactivate": 0, "panic": 2}.get(action_type, 0)
            device.save()
            Action.objects.create(user=request.user, action_type="toggle", device=device,
                                  description=f"Alarme → {action_type}")
        else:
            return Response({"detail": f"Action '{action_type}' non supportée pour ce type."}, status=400)
    else:
        # Default: simple toggle
        device.status = "on" if device.status == "off" else "off"
        device.save()
        Action.objects.create(user=request.user, action_type="toggle", device=device,
                              description=f"{device.name} → {device.get_status_display()}")

    request.user.nb_actions += 1
    request.user.save()
    return Response(DeviceSerializer(device).data)


# ============================================================
# SERVICES
# ============================================================
class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

    def get_permissions(self):
        if self.action == "list": return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("type"):   qs = qs.filter(type=p["type"])
        if p.get("active") is not None and p.get("active") != "":
            qs = qs.filter(active=(p["active"].lower() == "true"))
        if p.get("q"):
            q = p["q"]
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        u = request.user
        if not getattr(u, "is_authenticated", False):
            return Response(self.get_serializer(instance).data)
        u.points = (u.points or 0) + 0.5
        u.nb_actions = (u.nb_actions or 0) + 1
        u.save()
        Action.objects.create(user=u, action_type="consult",
                              description=f"Consultation du service {instance.name}")
        return Response(self.get_serializer(instance).data)

    def _sync_actions(self, service, actions_payload):
        service.actions.all().delete()
        if not actions_payload:
            return
        touched_ids = []
        for idx, item in enumerate(actions_payload):
            device_id = item.get("device")
            action_type = item.get("action_type")
            action_value = item.get("action_value")
            if not device_id or not action_type:
                continue
            touched_ids.append(device_id)
            ServiceAction.objects.create(
                service=service,
                device_id=device_id,
                action_type=action_type,
                action_value=action_value if action_type == "set_value" else None,
                order=item.get("order", idx),
            )
        if touched_ids:
            service.related_devices.set(Device.objects.filter(id__in=touched_ids))

    def create(self, request, *args, **kwargs):
        if request.user.is_child():
            return Response({"detail": "Les enfants ne peuvent pas créer de service."}, status=403)
        payload = request.data.copy()
        if payload.get("related_device") and not payload.get("related_devices"):
            payload["related_devices"] = [payload.get("related_device")]
        actions = payload.pop("actions", []) if isinstance(payload, dict) else []
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        service = serializer.save(created_by=request.user)
        self._sync_actions(service, actions)
        Action.objects.create(user=request.user, action_type="create",
                              description=f"Service créé : {service.name}")
        return Response(self.get_serializer(service).data, status=201)

    def update(self, request, *args, **kwargs):
        service = self.get_object()
        if service.created_by and service.created_by_id != request.user.id and not request.user.is_staff:
            return Response({"detail": "Vous ne pouvez modifier que vos services."}, status=403)
        payload = request.data.copy()
        if payload.get("related_device") and not payload.get("related_devices"):
            payload["related_devices"] = [payload.get("related_device")]
        actions = payload.pop("actions", None) if isinstance(payload, dict) else None
        serializer = self.get_serializer(service, data=payload, partial=kwargs.get("partial", False))
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        if actions is not None:
            self._sync_actions(updated, actions)
        Action.objects.create(user=request.user, action_type="update",
                              description=f"Service modifié : {updated.name}")
        return Response(self.get_serializer(updated).data)

    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        service = self.get_object()
        if request.user.is_child():
            return Response({"detail": "Les enfants ne peuvent pas exécuter ce service."}, status=403)
        if not service.active:
            return Response({"detail": "Service inactif."}, status=400)

        actions = list(service.actions.select_related("device").all())
        if not actions:
            related = list(service.related_devices.all())
            if not related:
                return Response({"detail": "Ce service n'a aucune action configurée."}, status=400)
            actions = [ServiceAction(service=service, device=d, action_type="toggle") for d in related]

        touched = []
        for sa in actions:
            d = sa.device
            if sa.action_type == "turn_on":
                d.status = "on"
            elif sa.action_type == "turn_off":
                d.status = "off"
            elif sa.action_type == "toggle":
                d.status = "on" if d.status == "off" else "off"
            elif sa.action_type == "set_value":
                if sa.action_value is None:
                    continue
                d.value = sa.action_value
                d.target_value = sa.action_value
                d.status = "on" if (d.value or 0) > 0 else "off"
            elif sa.action_type == "open":
                d.value = 100
                d.target_value = 100
                d.status = "on"
            elif sa.action_type == "close":
                d.value = 0
                d.target_value = 0
                d.status = "off"
            d.save()
            touched.append(d)

        Action.objects.create(
            user=request.user,
            action_type="toggle",
            description=f"Service exécuté : {service.name} ({len(touched)} action(s))",
        )
        request.user.nb_actions = (request.user.nb_actions or 0) + len(touched)
        request.user.save(update_fields=["nb_actions"])

        return Response({
            "detail": f"Service exécuté : {service.name}",
            "updated_devices": DeviceSerializer(touched, many=True).data,
        })


class AllowedMemberViewSet(viewsets.ModelViewSet):
    queryset = AllowedMember.objects.all()
    serializer_class = AllowedMemberSerializer
    permission_classes = [IsAuthenticated]

    def _check_admin(self):
        if not self.request.user.is_staff:
            raise serializers.ValidationError("Admin uniquement.")

    def list(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement."}, status=403)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement."}, status=403)
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement."}, status=403)
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement."}, status=403)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement."}, status=403)
        return super().partial_update(request, *args, **kwargs)


# ============================================================
# SCENARIOS
# ============================================================
class ScenarioViewSet(viewsets.ModelViewSet):
    serializer_class = ScenarioSerializer

    def get_permissions(self):
        if self.action == "list":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Scenario.objects.all()
        p = self.request.query_params
        if p.get("active") is not None:
            qs = qs.filter(active=(p["active"].lower() == "true"))
        if p.get("trigger_type"):
            qs = qs.filter(trigger_type=p["trigger_type"])
        return qs

    def perform_create(self, serializer):
        if self.request.user.is_child():
            raise serializers.ValidationError("Les enfants ne peuvent pas créer de scénarios.")
        serializer.save(created_by=self.request.user)
        Action.objects.create(user=self.request.user, action_type="create",
                              description=f"Scénario créé : {serializer.instance.name}")

    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        scenario = self.get_object()
        if request.user.is_child():
            return Response({"detail": "Les enfants ne peuvent pas exécuter de scénarios."}, status=403)
        if not scenario.active:
            return Response({"detail": "Scénario désactivé."}, status=400)
        dev = execute_scenario(scenario, actor=request.user, source="manual")
        return Response({
            "detail": f"Scénario exécuté : {dev.name} → {dev.get_status_display()}",
            "device": DeviceSerializer(dev).data,
        })


# ============================================================
# DEMANDES DE SUPPRESSION
# ============================================================
class DeletionRequestViewSet(viewsets.ModelViewSet):
    serializer_class = DeletionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return DeletionRequest.objects.filter(status="pending")
        return DeletionRequest.objects.filter(
            requested_by=self.request.user, status="pending")

    def perform_create(self, serializer):
        if self.request.user.is_child():
            raise serializers.ValidationError(
                "Les enfants ne peuvent pas demander de suppression.")
        dr = serializer.save(requested_by=self.request.user)
        Action.objects.create(
            user=self.request.user, action_type="deletion_request", device=dr.device,
            description=f"Demande de suppression pour {dr.device.name}")

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Admin approuve : supprime l'objet, marque la demande comme approuvée.
        Bug fix : on capture le nom AVANT toute suppression, et on traite la
        demande dans un ordre qui ne casse pas les références."""
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement"}, status=403)
        dr = self.get_object()
        if dr.status != "pending":
            return Response({"detail": "Demande déjà traitée"}, status=400)
        device_name = dr.device.name
        device_id = dr.device.id
        # 1. Marquer la demande comme approuvée AVANT de supprimer le device
        #    (sinon le CASCADE supprime aussi la demande et on perd l'info)
        dr.status = "approved"
        dr.resolved_at = timezone.now()
        # On détache le device de la demande pour éviter le CASCADE
        device = dr.device
        dr.save()
        # 2. Créer l'action AVANT de supprimer le device (sans FK device)
        Action.objects.create(
            user=request.user, action_type="update",
            description=f"Suppression de {device_name} (demande approuvée)")
        # 3. Maintenant on peut supprimer le device en toute sécurité
        device.delete()
        return Response({
            "detail": f"✔ Objet « {device_name} » supprimé. Demande traitée.",
            "device_name": device_name,
            "device_id": device_id,
        })

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement"}, status=403)
        dr = self.get_object()
        if dr.status != "pending":
            return Response({"detail": "Demande déjà traitée"}, status=400)
        device_name = dr.device.name
        dr.status = "rejected"
        dr.resolved_at = timezone.now()
        dr.save()
        return Response({
            "detail": f"✔ Demande pour « {device_name} » refusée. L'objet est conservé.",
            "device_name": device_name,
        })


# ============================================================
# HISTORIQUE / STATS / EXPORTS
# ============================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_actions(request):
    return Response(ActionSerializer(
        Action.objects.filter(user=request.user)[:50], many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def global_history(request):
    if request.user.is_child():
        return Response({"detail": "Accès interdit aux enfants."}, status=403)
    qs = Action.objects.filter(device__isnull=False)[:100]
    return Response(ActionSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maintenance_devices(request):
    if request.user.is_child():
        return Response({"detail": "Accès interdit aux enfants."}, status=403)
    to_maintain = [d for d in Device.objects.all() if d.needs_maintenance()]
    return Response(DeviceSerializer(to_maintain, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stats_summary(request):
    if request.user.is_child():
        return Response({"detail": "Accès interdit aux enfants."}, status=403)
    devices = Device.objects.all()
    total = Stat.objects.aggregate(t=Sum("consumption"))["t"] or 0
    by_type, by_room = {}, {}
    for d in devices:
        by_type[d.get_type_display()] = by_type.get(d.get_type_display(), 0) + 1
        rn = d.room.name if d.room else "—"
        by_room[rn] = by_room.get(rn, 0) + 1
    return Response({
        "total_devices": devices.count(),
        "active_devices": devices.filter(status="on").count(),
        "total_consumption_kwh": round(total, 2),
        "devices_by_type": by_type,
        "devices_by_room": by_room,
        "maintenance_count": sum(1 for d in devices if d.needs_maintenance()),
        "total_users": User.objects.count(),
        "total_connexions": sum(u.nb_connexions for u in User.objects.all()),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_devices_csv(request):
    if request.user.is_child():
        return Response({"detail": "Accès interdit aux enfants."}, status=403)
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="objets_connectes.csv"'
    response.write("\ufeff")
    w = csv.writer(response, delimiter=";")
    w.writerow(["ID", "Nom", "Type", "Pièce", "Marque", "État",
                "Batterie (%)", "Valeur", "Cible", "Début", "Fin"])
    for d in Device.objects.all():
        w.writerow([d.id, d.name, d.get_type_display(),
                    d.room.name if d.room else "",
                    d.brand, d.get_status_display(),
                    d.battery, d.value, d.target_value,
                    d.start_time or "", d.end_time or ""])
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_stats_csv(request):
    if request.user.is_child():
        return Response({"detail": "Accès interdit aux enfants."}, status=403)
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="consommation.csv"'
    response.write("\ufeff")
    w = csv.writer(response, delimiter=";")
    w.writerow(["Date", "Objet", "Consommation (kWh)"])
    for s in Stat.objects.all():
        w.writerow([s.date, s.device.name, s.consumption])
    return response
