import uuid
import random
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


# ============================================================
# USER
# ============================================================
class User(AbstractUser):
    ROLE_CHOICES = [("parent", "Parent"), ("enfant", "Enfant"), ("visiteur", "Visiteur")]
    LEVEL_CHOICES = [("debutant", "Débutant"), ("intermediaire", "Intermédiaire"),
                     ("avance", "Avancé"), ("expert", "Expert")]
    GENDER_CHOICES = [("M", "Masculin"), ("F", "Féminin"), ("N", "Non précisé")]

    # Profil public
    age = models.PositiveIntegerField(default=18)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="parent")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default="N")
    date_naissance = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to="photos/", blank=True, null=True)

    # Niveaux et points
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default="debutant")
    points = models.FloatField(default=0)
    nb_connexions = models.PositiveIntegerField(default=0)
    nb_actions = models.PositiveIntegerField(default=0)

    # Validation inscription
    is_approved = models.BooleanField(default=True)
    email_verified = models.BooleanField(default=True)
    verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    verification_code = models.CharField(max_length=6, blank=True, default="")
    verification_code_sent_at = models.DateTimeField(null=True, blank=True)

    LEVEL_THRESHOLDS = {"debutant": 0, "intermediaire": 5, "avance": 10, "expert": 15}
    LEVEL_ORDER = ["debutant", "intermediaire", "avance", "expert"]

    # Types d'objets dont les ENFANTS ne peuvent pas modifier l'état
    SECURITY_DEVICE_TYPES = {"alarme", "camera", "porte", "detecteur"}

    def is_child(self):
        return self.role == "enfant"

    def can_toggle_device(self, device):
        """Un enfant ne peut pas toggle les objets de sécurité."""
        if self.is_child() and device.type in self.SECURITY_DEVICE_TYPES:
            return False
        return True

    def can_access_management(self):
        """Un enfant n'accède pas au module Gestion, même au niveau avancé."""
        if self.is_child():
            return False
        return self.level in ("avance", "expert")

    def max_level_allowed(self):
        pts = self.points or 0
        for lvl in reversed(self.LEVEL_ORDER):
            if pts >= self.LEVEL_THRESHOLDS[lvl]:
                return lvl
        return "debutant"

    def can_set_level(self, target):
        if target not in self.LEVEL_THRESHOLDS:
            return False
        return self.LEVEL_ORDER.index(target) <= self.LEVEL_ORDER.index(self.max_level_allowed())

    def __str__(self):
        return self.username

    def regenerate_verification_code(self):
        self.verification_code = f"{random.randint(0, 999999):06d}"
        self.verification_code_sent_at = timezone.now()


# ============================================================
# CATEGORY / ROOM / DEVICE / SERVICE
# ============================================================
class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, blank=True, default="📦")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Categories"


class Room(models.Model):
    ROOM_TYPES = [
        ("salon", "Salon"), ("chambre", "Chambre"), ("cuisine", "Cuisine"),
        ("salle_bain", "Salle de bain"), ("toilettes", "Toilettes"),
        ("garage", "Garage"), ("jardin", "Jardin"),
    ]
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=ROOM_TYPES)

    def __str__(self):
        return self.name


class Device(models.Model):
    TYPE_CHOICES = [
        ("thermostat", "Thermostat"), ("camera", "Caméra"), ("alarme", "Alarme"),
        ("lave_linge", "Lave-linge"), ("lave_vaisselle", "Lave-vaisselle"),
        ("television", "Télévision"), ("aspirateur", "Aspirateur"),
        ("volet", "Volet"), ("porte", "Porte"), ("climatiseur", "Climatiseur"),
        ("machine_cafe", "Machine à café"), ("arrosage", "Arrosage"),
        ("enceinte", "Enceinte"), ("detecteur", "Détecteur mouvement"),
        ("reveil", "Réveil"),
    ]
    STATUS_CHOICES = [("on", "Actif"), ("off", "Inactif")]

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="devices")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="off")
    battery = models.PositiveIntegerField(default=100)
    value = models.FloatField(default=0)
    target_value = models.FloatField(default=0)
    brand = models.CharField(max_length=50, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="devices",
                             null=True, blank=True)
    # Horaires de fonctionnement (PDF §Gestion)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    # Maintenance
    last_maintenance = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def needs_maintenance(self):
        if self.battery < 20:
            return True
        if self.last_maintenance:
            if (timezone.now().date() - self.last_maintenance).days > 180:
                return True
        return False

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"


class Service(models.Model):
    """Outils/services variés proposés par la plateforme.
    Un service peut être lié à plusieurs objets connectés simultanément.
    Activer le service active tous ses objets ; désactiver les éteint tous."""
    TYPE_CHOICES = [
        ("energie", "Consommation énergétique"),
        ("securite", "Sécurité"),
        ("confort", "Confort"),
        ("divertissement", "Divertissement"),
        ("sante", "Santé & bien-être"),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField()
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    related_devices = models.ManyToManyField(Device, blank=True,
                                              related_name="services")
    active = models.BooleanField(default=True)
    created_by = models.ForeignKey("User", on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name="created_services")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def has_security_device(self):
        """True si ce service contient au moins un objet de sécurité."""
        SECURITY_TYPES = {"alarme", "camera", "porte", "detecteur"}
        return self.related_devices.filter(type__in=SECURITY_TYPES).exists()


# ============================================================
# DEMANDE DE SUPPRESSION (PDF §Gestion)
# ============================================================
class DeletionRequest(models.Model):
    STATUS_CHOICES = [("pending", "En attente"), ("approved", "Approuvée"),
                      ("rejected", "Refusée")]
    device = models.ForeignKey(Device, on_delete=models.SET_NULL,
                               null=True, blank=True)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE,
                                     related_name="deletion_requests")
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Suppression {self.device.name} par {self.requested_by.username}"


# ============================================================
# HISTORIQUE & STATS
# ============================================================
class Action(models.Model):
    ACTION_TYPES = [
        ("login", "Connexion"), ("consult", "Consultation"),
        ("create", "Création"), ("update", "Modification"),
        ("toggle", "Activation/Désactivation"),
        ("level_change", "Changement de niveau"),
        ("deletion_request", "Demande de suppression"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="actions")
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    description = models.CharField(max_length=255, blank=True)
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]


class Stat(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="stats")
    consumption = models.FloatField(help_text="kWh")
    date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]


# ============================================================
# SCENARIOS (automations)
# ============================================================
class Scenario(models.Model):
    TRIGGER_CHOICES = [
        ("time", "Horaire fixe"),
        ("device_on", "Quand un objet s'allume"),
        ("device_off", "Quand un objet s'éteint"),
        ("manual", "Manuel uniquement"),
    ]
    ACTION_CHOICES = [
        ("toggle", "Basculer l'état"),
        ("turn_on", "Allumer"),
        ("turn_off", "Éteindre"),
        ("set_value", "Régler une valeur"),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_CHOICES, default="manual")
    trigger_time = models.TimeField(null=True, blank=True, help_text="Heure de déclenchement (si trigger Horaire)")
    trigger_device = models.ForeignKey("Device", on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name="trigger_scenarios")
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    action_device = models.ForeignKey("Device", on_delete=models.CASCADE, related_name="scenarios")
    action_value = models.FloatField(null=True, blank=True, help_text="Valeur pour set_value (ex: 22°C)")
    active = models.BooleanField(default=True)
    last_run = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey("User", on_delete=models.CASCADE, related_name="scenarios")

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class ServiceAction(models.Model):
    ACTION_CHOICES = [
        ("turn_on", "Allumer"),
        ("turn_off", "Éteindre"),
        ("toggle", "Basculer"),
        ("set_value", "Régler une valeur"),
        ("open", "Ouvrir (volet)"),
        ("close", "Fermer (volet)"),
    ]

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="actions")
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="service_actions")
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    action_value = models.FloatField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.service.name} -> {self.device.name} ({self.action_type})"


# ============================================================
# ALLOWED MEMBERS (admin-managed whitelist)
# ============================================================
class AllowedMember(models.Model):
    ROLE_CHOICES = [
        ("parent", "Parent"),
        ("enfant", "Enfant"),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="parent")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["email"]

    def save(self, *args, **kwargs):
        self.email = (self.email or "").lower().strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.role})"
