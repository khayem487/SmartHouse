import csv
from django.http import HttpResponse
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import generics, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (User, Room, Device, Action, Stat,
                     Category, Service, DeletionRequest)
from .serializers import (UserRegisterSerializer, UserSerializer,
                          RoomSerializer, DeviceSerializer, ActionSerializer,
                          StatSerializer, CategorySerializer, ServiceSerializer,
                          DeletionRequestSerializer, PasswordChangeSerializer)


# ============================================================
# AUTH
# ============================================================
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        user.points = (user.points or 0) + 0.25
        user.nb_connexions = (user.nb_connexions or 0) + 1
        user.save()
        Action.objects.create(user=user, action_type="login",
                              description="Connexion à la plateforme")
        data["user"] = UserSerializer(user, context={"request": self.context.get("request")}).data
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


@api_view(["GET"])
@permission_classes([AllowAny])
def verify_email(request, token):
    try:
        user = User.objects.get(verification_token=token)
    except User.DoesNotExist:
        return Response({"detail": "Token invalide"}, status=400)
    user.email_verified = True
    user.save()
    return Response({"detail": f"Email vérifié pour {user.username}"})


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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_users(request):
    users = User.objects.exclude(id=request.user.id)
    return Response(UserSerializer(users, many=True, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_level(request):
    """L'utilisateur choisit son niveau parmi ceux qu'il a débloqués."""
    target = request.data.get("level")
    u = request.user
    if not u.can_set_level(target):
        return Response({"detail": f"Pas assez de points pour accéder au niveau '{target}'."},
                        status=400)
    old = u.level
    u.level = target
    u.save()
    Action.objects.create(user=u, action_type="level_change",
                          description=f"Niveau changé : {old} → {target}")
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
        if self.action in ("list", "retrieve"): return [AllowAny()]
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
        if request.user.is_authenticated:
            u = request.user
            u.points = (u.points or 0) + 0.5
            u.nb_actions = (u.nb_actions or 0) + 1
            u.save()
            Action.objects.create(user=u, action_type="consult", device=instance,
                                  description=f"Consultation de {instance.name}")
        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        device = serializer.save(user=self.request.user)
        self.request.user.nb_actions += 1
        self.request.user.save()
        Action.objects.create(user=self.request.user, action_type="create",
                              device=device, description=f"Création de {device.name}")

    def perform_update(self, serializer):
        device = serializer.save()
        self.request.user.nb_actions += 1
        self.request.user.save()
        Action.objects.create(user=self.request.user, action_type="update",
                              device=device, description=f"Modification de {device.name}")

    def destroy(self, request, *args, **kwargs):
        # PDF §Gestion : l'utilisateur complexe DEMANDE la suppression, il ne supprime pas
        if not request.user.is_staff:
            return Response(
                {"detail": "Vous devez créer une demande de suppression. "
                           "Seul l'administrateur peut supprimer directement."},
                status=403)
        return super().destroy(request, *args, **kwargs)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_device(request, pk):
    try:
        device = Device.objects.get(pk=pk)
    except Device.DoesNotExist:
        return Response({"detail": "Non trouvé"}, status=404)
    device.status = "on" if device.status == "off" else "off"
    device.save()
    request.user.nb_actions += 1
    request.user.save()
    Action.objects.create(user=request.user, action_type="toggle", device=device,
                          description=f"{device.name} → {device.get_status_display()}")
    return Response(DeviceSerializer(device).data)


# ============================================================
# SERVICES (outils/services variés, PDF §Visualisation)
# ============================================================
class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"): return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("type"):   qs = qs.filter(type=p["type"])
        if p.get("active") is not None:
            qs = qs.filter(active=(p["active"].lower() == "true"))
        if p.get("q"):
            q = p["q"]
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated:
            u = request.user
            u.points = (u.points or 0) + 0.5
            u.nb_actions = (u.nb_actions or 0) + 1
            u.save()
            Action.objects.create(user=u, action_type="consult",
                                  description=f"Consultation du service {instance.name}")
        return Response(self.get_serializer(instance).data)


# ============================================================
# DEMANDES DE SUPPRESSION
# ============================================================
class DeletionRequestViewSet(viewsets.ModelViewSet):
    serializer_class = DeletionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return DeletionRequest.objects.all()
        return DeletionRequest.objects.filter(requested_by=self.request.user)

    def perform_create(self, serializer):
        dr = serializer.save(requested_by=self.request.user)
        Action.objects.create(
            user=self.request.user, action_type="deletion_request", device=dr.device,
            description=f"Demande de suppression pour {dr.device.name}")


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
    """Historique global des objets (PDF §Gestion)."""
    qs = Action.objects.filter(device__isnull=False)[:100]
    return Response(ActionSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maintenance_devices(request):
    """Objets nécessitant une maintenance (PDF §Gestion)."""
    to_maintain = [d for d in Device.objects.all() if d.needs_maintenance()]
    return Response(DeviceSerializer(to_maintain, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stats_summary(request):
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
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="objets_connectes.csv"'
    response.write("\ufeff")  # BOM pour Excel FR
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
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="consommation.csv"'
    response.write("\ufeff")
    w = csv.writer(response, delimiter=";")
    w.writerow(["Date", "Objet", "Consommation (kWh)"])
    for s in Stat.objects.all():
        w.writerow([s.date, s.device.name, s.consumption])
    return response
