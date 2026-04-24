import random
from datetime import date, time
from django.core.management.base import BaseCommand
from api.models import (User, Room, Device, Action, Stat,
                        Category, Service)


class Command(BaseCommand):
    help = "Remplit la BDD avec des données initiales."

    def handle(self, *args, **options):
        self.stdout.write("Nettoyage…")
        for m in (Stat, Action, Service, Device, Room, Category):
            m.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        # --- Catégories ---
        cats = {}
        for name, icon, desc in [
            ("Sécurité",       "🔒", "Caméras, alarmes, détecteurs"),
            ("Confort",        "🛋", "Thermostats, climatiseurs, volets"),
            ("Électroménager", "🍽", "Lave-linge, lave-vaisselle, machine à café"),
            ("Divertissement", "📺", "Télé, enceintes"),
            ("Extérieur",      "🌳", "Arrosage, portail, porte garage"),
        ]:
            cats[name] = Category.objects.create(name=name, icon=icon, description=desc)

        # --- Pièces ---
        rooms = [Room.objects.create(name=n, type=t) for n, t in [
            ("Salon", "salon"), ("Chambre parentale", "chambre"),
            ("Chambre enfant", "chambre"), ("Cuisine", "cuisine"),
            ("Salle de bain", "salle_bain"), ("Garage", "garage"),
            ("Jardin", "jardin"),
        ]]

        # --- Utilisateurs ---
        users_data = [
            # user, email, role, age, level, pts, gender, first, last, dob
            ("alice",   "alice@maison.fr",   "parent",  35, "expert",        20, "F", "Alice",   "Martin",  date(1990, 5, 12)),
            ("bob",     "bob@maison.fr",     "parent",  37, "avance",        12, "M", "Bob",     "Martin",  date(1988, 3, 8)),
            ("charlie", "charlie@maison.fr", "enfant",  10, "intermediaire",  6, "M", "Charlie", "Martin",  date(2015, 7, 19)),
            ("demo",    "demo@maison.fr",    "parent",  30, "debutant",       0, "N", "Demo",    "User",    date(1994, 1, 1)),
        ]
        users = []
        for u, e, r, age, lvl, pts, gen, fn, ln, dob in users_data:
            user = User.objects.create_user(username=u, email=e, password="demo1234",
                                            age=age, role=r, first_name=fn, last_name=ln)
            user.level, user.points = lvl, pts
            user.gender, user.date_naissance = gen, dob
            user.is_approved = True
            user.email_verified = True
            user.nb_connexions = random.randint(5, 40)
            user.nb_actions = random.randint(10, 100)
            user.save()
            users.append(user)

        # --- Objets connectés ---
        devices_data = [
            ("Thermostat Salon",    "thermostat",     rooms[0], cats["Confort"],        "on",  78, 21, 22, "Philips",    time(6,0),  time(23,0)),
            ("Caméra entrée",       "camera",         rooms[0], cats["Sécurité"],       "on",  90,  0,  0, "Hikvision",  None, None),
            ("Lave-linge",          "lave_linge",     rooms[5], cats["Électroménager"], "off", 100, 0,  0, "Bosch",      time(8,0),  time(20,0)),
            ("Lave-vaisselle",      "lave_vaisselle", rooms[3], cats["Électroménager"], "off",  95, 0,  0, "Bosch",      None, None),
            ("Aspirateur robot",    "aspirateur",     rooms[0], cats["Électroménager"], "off",  65, 0,  0, "Roomba",     time(10,0), time(12,0)),
            ("Volet salon",         "volet",          rooms[0], cats["Confort"],        "on",  100, 0,  0, "Somfy",      time(7,0),  time(22,0)),
            ("TV Salon",            "television",     rooms[0], cats["Divertissement"], "off", 100, 0,  0, "Samsung",    None, None),
            ("Climatiseur Chambre", "climatiseur",    rooms[1], cats["Confort"],        "on",   80, 19, 20, "Daikin",    time(22,0), time(6,0)),
            ("Machine à café",      "machine_cafe",   rooms[3], cats["Électroménager"], "on",  100, 0,  0, "Nespresso", time(6,0),  time(10,0)),
            ("Alarme",              "alarme",         rooms[0], cats["Sécurité"],       "on",  100, 0,  0, "Verisure",   None, None),
            ("Arrosage jardin",     "arrosage",       rooms[6], cats["Extérieur"],      "off",  15, 0,  0, "Gardena",   time(6,0),  time(7,0)),
            ("Porte garage",        "porte",          rooms[5], cats["Extérieur"],      "off", 100, 0,  0, "Sommer",     None, None),
            ("Enceinte Salon",      "enceinte",       rooms[0], cats["Divertissement"], "off",  85, 0,  0, "Sonos",      None, None),
            ("Détecteur Entrée",    "detecteur",      rooms[0], cats["Sécurité"],       "on",   18, 0,  0, "Netatmo",    None, None),
            ("Thermostat Chambre",  "thermostat",     rooms[1], cats["Confort"],        "on",   60, 19, 20, "Nest",      None, None),
        ]
        devices = []
        for name, t, room, cat, st, bat, val, tgt, brand, start, end in devices_data:
            d = Device.objects.create(
                name=name, type=t, room=room, category=cat, status=st, battery=bat,
                value=val, target_value=tgt, brand=brand,
                start_time=start, end_time=end,
                user=random.choice(users[:2]),
                description=f"{name} — marque {brand}. Connecté en Wi-Fi.",
                last_maintenance=date(2024, random.randint(1, 10), random.randint(1, 28)),
            )
            devices.append(d)

        # --- Services/outils variés ---
        services = [
            ("Suivi consommation électrique",
             "Visualise la consommation kWh de tous tes appareils en temps réel.",
             "energie", devices[2]),
            ("Alarme intrusion",
             "Notification instantanée dès qu'un mouvement suspect est détecté à l'entrée.",
             "securite", devices[9]),
            ("Surveillance vidéo",
             "Accède aux flux des caméras à distance depuis ton téléphone.",
             "securite", devices[1]),
            ("Mode nuit automatique",
             "Baisse le chauffage à 19°C et ferme les volets à 22h.",
             "confort", devices[0]),
            ("Planning machine à café",
             "Café prêt chaque matin à 6h30 du lundi au vendredi.",
             "confort", devices[8]),
            ("Streaming musical multiroom",
             "Diffusion de musique dans toutes les pièces depuis ton téléphone.",
             "divertissement", devices[12]),
            ("Rapport énergétique hebdomadaire",
             "Bilan hebdo envoyé chaque dimanche par email.",
             "energie", None),
            ("Arrosage intelligent",
             "Programmation automatique selon la météo.",
             "confort", devices[10]),
            ("Cinéma à la maison",
             "Lance la TV, baisse les volets, éteint la lumière en un clic.",
             "divertissement", devices[6]),
            ("Détection de fuite",
             "Alerte en cas d'anomalie de consommation d'eau.",
             "securite", None),
        ]
        for n, d, t, dev in services:
            Service.objects.create(name=n, description=d, type=t, related_device=dev)

        # --- Stats de consommation ---
        for d in devices:
            for _ in range(7):
                Stat.objects.create(device=d,
                                    consumption=round(random.uniform(0.1, 3.5), 2))

        # --- Historique ---
        for u in users:
            for _ in range(random.randint(3, 8)):
                Action.objects.create(user=u, action_type="login",
                                      description="Connexion à la plateforme")

        # --- Une demande de suppression de démo (pour tester la page admin) ---
        from api.models import DeletionRequest
        DeletionRequest.objects.create(
            device=devices[4],  # Aspirateur robot
            requested_by=users[1],  # bob
            reason="Batterie trop faible, on va le remplacer.",
            status="pending",
        )

        # --- Superuser ---
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin", email="admin@maison.fr",
                password="admin1234", role="parent",
                level="expert", points=100, age=40,
                first_name="Admin", last_name="System",
                is_approved=True, email_verified=True)

        self.stdout.write(self.style.SUCCESS("✔ Données générées !"))
        self.stdout.write(" Comptes : alice / bob / charlie / demo — mdp : demo1234")
        self.stdout.write(" Admin   : admin / admin1234")
