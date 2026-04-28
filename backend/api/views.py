import csv
import random
from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import generics, viewsets, status, serializers as drf_serializers
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (User, Room, Device, Action, Stat,
                     Category, Service, DeletionRequest, WhitelistEntry)
from .serializers import (UserRegisterSerializer, UserSerializer,
                          RoomSerializer, DeviceSerializer, ActionSerializer,
                          StatSerializer, CategorySerializer, ServiceSerializer,
                          DeletionRequestSerializer, PasswordChangeSerializer,
                          OTPVerifySerializer, WhitelistEntrySerializer)
from .allowed_members import requires_email_verification


# ============================================================
# HELPER : génération et envoi du code OTP
# ============================================================
def generate_otp():
    return f"{random.randint(0, 999999):06d}"


def send_otp_email(user):
    code = generate_otp()
    user.otp_code = code
    user.otp_created_at = timezone.now()
    user.save()

    subject = "Votre code d'activation SmartHouse"
    message = f"""Bonjour {user.first_name or user.username},

Bienvenue sur SmartHouse !

Voici votre code d'activation à 6 chiffres :

    {code}

Saisissez ce code sur la page d'activation pour finaliser votre inscription.

Ce code est valable 30 minutes.

Si vous n'êtes pas à l'origine de cette inscription, ignorez ce mail.

— L'équipe SmartHouse (CY Tech ING1 2025-2026)
"""

    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #065f46, #059669);
                  color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0;">SmartHouse</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Code d'activation</p>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;
                  border-top: none; border-radius: 0 0 12px 12px;">
        <p>Bonjour <strong>{user.first_name or user.username}</strong>,</p>
        <p>Voici votre code d'activation à saisir dans la page d'inscription :</p>
        <p style="text-align: center; margin: 30px 0;">
          <span style="font-size: 2.5em; letter-spacing: 0.4em; font-weight: bold;
                       color: #065f46; background: #d1fae5; padding: 20px 30px;
                       border-radius: 8px; display: inline-block; font-family: monospace;">
            {code}
          </span>
        </p>
        <p style="color: #666; font-size: 0.9em; text-align: center;">
          Code valable 30 minutes.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #666; font-size: 0.85em;">
          <strong>Vos informations :</strong><br>
          Pseudo : {user.username}<br>
          Rôle attribué : <strong>{user.get_role_display()}</strong>
        </p>
        <p style="color: #999; font-size: 0.8em; margin-top: 30px;">
          Si vous n'êtes pas à l'origine de cette inscription, ignorez ce mail.<br>
          — SmartHouse · CY Tech ING1 2025-2026
        </p>
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
        print(f"Erreur envoi OTP à {user.email} : {e}")
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
        needs_mail = getattr(user, "_needs_mail", False)

        sent = False
        if needs_mail:
            sent = send_otp_email(user)
            message = ("Inscription reussie. Un code à 6 chiffres a été envoyé "
                       "par mail. Saisissez-le pour activer votre compte.")
        else:
            message = ("Inscription reussie. Votre compte sera activé "
                       "automatiquement à votre première connexion.")

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "needs_mail": needs_mail,
            "email_sent": sent,
            "message": message,
        }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp(request):
    """Vérifie le code OTP à 6 chiffres et active le compte."""
    s = OTPVerifySerializer(data=request.data)
    s.is_valid(raise_exception=True)
    email = s.validated_data["email"].lower().strip()
    code = s.validated_data["code"].strip()

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"detail": "Aucun compte avec cet email."}, status=400)

    if user.email_verified:
        return Response({"detail": "Ce compte est déjà activé.", "already": True})

    if not user.otp_code or user.otp_code != code:
        return Response({"detail": "Code incorrect. Vérifiez votre mail."}, status=400)

    # Vérifier expiration (30 min)
    if user.otp_created_at:
        elapsed = (timezone.now() - user.otp_created_at).total_seconds()
        if elapsed > 30 * 60:
            return Response(
                {"detail": "Code expiré. Demandez un nouveau code."},
                status=400)

    user.email_verified = True
    user.otp_code = ""
    user.save()
    return Response({
        "detail": f"Compte activé pour {user.username}. Vous pouvez vous connecter.",
        "username": user.username,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_otp(request):
    """Renvoie un nouveau code OTP."""
    email = request.data.get("email", "").lower().strip()
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"detail": "Aucun compte avec cet email."}, status=404)
    if user.email_verified:
        return Response({"detail": "Ce compte est déjà activé."}, status=400)
    sent = send_otp_email(user)
    return Response({"detail": "Nouveau code envoyé." if sent else "Erreur d'envoi.",
                     "sent": sent})


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        if not user.email_verified and not user.is_superuser:
            if not requires_email_verification(user.email):
                user.email_verified = True
                user.save()
            else:
                raise drf_serializers.ValidationError(
                    "Votre email n'a pas encore été validé. "
                    "Saisissez le code reçu par mail pour activer votre compte.")

        user.points = (user.points or 0) + 0.25
        user.nb_connexions = (user.nb_connexions or 0) + 1
        user.save()
        Action.objects.create(user=user, action_type="login",
                              description="Connexion à la plateforme")
        ctx = {"request": self.context.get("request")}
        data["user"] = UserSerializer(user, context=ctx).data
        return data


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
    users = User.objects.exclude(id=request.user.id)
    return Response(UserSerializer(users, many=True, context={"request": request}).data)


# ----- ADMIN actions sur utilisateurs ---------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_suspend_user(request, user_id):
    if not request.user.is_staff:
        return Response({"detail": "Admin uniquement"}, status=403)
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable"}, status=404)
    if user.is_superuser:
        return Response({"detail": "Impossible de suspendre un super-utilisateur"},
                        status=400)
    user.email_verified = False
    user.save()
    return Response({"detail": f"Utilisateur {user.username} suspendu."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_unsuspend_user(request, user_id):
    if not request.user.is_staff:
        return Response({"detail": "Admin uniquement"}, status=403)
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable"}, status=404)
    user.email_verified = True
    user.save()
    return Response({"detail": f"Utilisateur {user.username} réactivé."})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, user_id):
    """Supprime définitivement un utilisateur (l'email reste en whitelist)."""
    if not request.user.is_staff:
        return Response({"detail": "Admin uniquement"}, status=403)
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable"}, status=404)
    if user.is_superuser:
        return Response({"detail": "Impossible de supprimer un super-utilisateur"},
                        status=400)
    if user.id == request.user.id:
        return Response({"detail": "Impossible de se supprimer soi-même"},
                        status=400)
    username = user.username
    user.delete()
    return Response({"detail": f"Utilisateur {username} supprimé définitivement."})


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
# WHITELIST (admin uniquement)
# ============================================================
class WhitelistViewSet(viewsets.ModelViewSet):
    queryset = WhitelistEntry.objects.all()
    serializer_class = WhitelistEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_staff:
            return WhitelistEntry.objects.none()
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement"}, status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement"}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement"}, status=403)
        return super().destroy(request, *args, **kwargs)


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
        if self.request.user.is_child():
            raise drf_serializers.ValidationError(
                "Les enfants ne peuvent pas ajouter d'objets.")
        device = serializer.save(user=self.request.user)
        self.request.user.nb_actions += 1
        self.request.user.save()
        Action.objects.create(user=self.request.user, action_type="create",
                              device=device, description=f"Création de {device.name}")

    def perform_update(self, serializer):
        if self.request.user.is_child():
            raise drf_serializers.ValidationError(
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
            {"detail": "Les enfants ne peuvent pas activer ou désactiver "
                       "les objets de sécurité (alarme, caméra, porte, détecteur)."},
            status=403)
    device.status = "on" if device.status == "off" else "off"
    device.save()
    request.user.nb_actions += 1
    request.user.save()
    Action.objects.create(user=request.user, action_type="toggle", device=device,
                          description=f"{device.name} -> {device.get_status_display()}")
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
        u.points = (u.points or 0) + 0.5
        u.nb_actions = (u.nb_actions or 0) + 1
        u.save()
        Action.objects.create(user=u, action_type="consult",
                              description=f"Consultation du service {instance.name}")
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        """Active ou désactive tous les objets liés au service.
        Body : { "action": "on" } ou { "action": "off" }"""
        service = self.get_object()
        target = request.data.get("action")
        if target not in ("on", "off"):
            return Response({"detail": "Paramètre 'action' invalide ('on' ou 'off')."},
                            status=400)

        # Restriction enfant : si le service contient un objet de sécurité,
        # un enfant ne peut PAS l'activer ni le désactiver
        if request.user.is_child() and service.has_security_device():
            return Response({
                "detail": "Ce service contient des objets de sécurité. "
                          "Réservé aux parents."
            }, status=403)

        devices = list(service.related_devices.all())
        if not devices:
            return Response({"detail": "Aucun objet lié à ce service."}, status=400)

        # Bascule tous les objets liés
        updated = []
        for d in devices:
            # Skip silencieusement les objets de sécurité pour les enfants
            # (déjà bloqué plus haut, mais double sécurité)
            if request.user.is_child() and d.type in {"alarme", "camera", "porte", "detecteur"}:
                continue
            d.status = target
            d.save()
            updated.append(d.name)

        # Une seule action de log pour le service entier
        request.user.nb_actions += 1
        request.user.save()
        action_label = "activé" if target == "on" else "désactivé"
        Action.objects.create(
            user=request.user,
            action_type="toggle",
            description=f"Service '{service.name}' {action_label} ({len(updated)} objet(s) modifié(s))",
        )

        return Response({
            "detail": f"Service « {service.name} » {action_label}. "
                      f"{len(updated)} objet(s) modifié(s).",
            "action": target,
            "devices_updated": updated,
            "service": ServiceSerializer(service).data,
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
            raise drf_serializers.ValidationError(
                "Les enfants ne peuvent pas demander de suppression.")
        dr = serializer.save(requested_by=self.request.user)
        Action.objects.create(
            user=self.request.user, action_type="deletion_request", device=dr.device,
            description=f"Demande de suppression pour {dr.device.name}")

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"detail": "Admin uniquement"}, status=403)
        dr = self.get_object()
        if dr.status != "pending":
            return Response({"detail": "Demande déjà traitée"}, status=400)
        device_name = dr.device.name
        device_id = dr.device.id
        dr.status = "approved"
        dr.resolved_at = timezone.now()
        device = dr.device
        dr.save()
        Action.objects.create(
            user=request.user, action_type="update",
            description=f"Suppression de {device_name} (demande approuvée)")
        device.delete()
        return Response({
            "detail": f"Objet « {device_name} » supprimé. Demande traitée.",
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
            "detail": f"Demande pour « {device_name} » refusée. L'objet est conservé.",
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
    """Historique global réservé à l'administrateur."""
    if not request.user.is_staff:
        return Response(
            {"detail": "L'historique global est réservé à l'administrateur."},
            status=403)
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
