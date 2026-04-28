import random
from datetime import date, time, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (User, Room, Device, Action, Stat,
                        Category, Service, DeletionRequest, WhitelistEntry)


class Command(BaseCommand):
    help = "Remplit la BDD SmartHouse avec des données initiales."

    def handle(self, *args, **options):
        self.stdout.write("Nettoyage…")
        for m in (DeletionRequest, Stat, Action, Service, Device, Room, Category):
            m.objects.all().delete()
        WhitelistEntry.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        User.objects.filter(username="admin").delete()

        # --- WHITELIST ---
        self.stdout.write("Création de la whitelist…")
        whitelist_data = [
            # email, role, require_email_verification
            ("alice@maison.fr",            "parent", False),
            ("bob@maison.fr",              "parent", False),
            ("charlie@maison.fr",          "enfant", False),
            ("demo@maison.fr",             "parent", False),
            ("admin@maison.fr",            "parent", False),
            ("acfiren12@gmail.com",        "parent", True),   # OTP requis
            ("famille.dupont@gmail.com",   "parent", False),
            ("lucas.dupont@gmail.com",     "enfant", False),
            ("marie.martin@gmail.com",     "parent", False),
        ]
        for email, role, req in whitelist_data:
            WhitelistEntry.objects.create(
                email=email, role=role, require_email_verification=req)

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
            ("alice",   "alice@maison.fr",   "parent", 35, "expert",        20, "F", "Alice",   "Martin",  date(1990, 5, 12)),
            ("bob",     "bob@maison.fr",     "parent", 37, "avance",        12, "M", "Bob",     "Martin",  date(1988, 3, 8)),
            ("charlie", "charlie@maison.fr", "enfant", 10, "intermediaire",  6, "M", "Charlie", "Martin",  date(2015, 7, 19)),
            ("demo",    "demo@maison.fr",    "parent", 30, "debutant",       0, "N", "Demo",    "User",    date(1994, 1, 1)),
        ]
        users = []
        for u, e, r, age, lvl, pts, gen, fn, ln, dob in users_data:
            user = User.objects.create_user(
                username=u, email=e, password="demo1234",
                age=age, role=r, first_name=fn, last_name=ln)
            user.level, user.points = lvl, pts
            user.gender, user.date_naissance = gen, dob
            user.is_approved = True
            user.email_verified = True
            user.save()
            users.append(user)

        # --- Objets connectés (TOUS à 100% batterie) ---
        devices_data = [
            ("Thermostat Salon",    "thermostat",     rooms[0], cats["Confort"],        "on",  21, 22, "Philips",    time(6,0),  time(23,0)),
            ("Caméra entrée",       "camera",         rooms[0], cats["Sécurité"],       "on",   0,  0, "Hikvision",  None, None),
            ("Lave-linge",          "lave_linge",     rooms[5], cats["Électroménager"], "off",  0,  0, "Bosch",      time(8,0),  time(20,0)),
            ("Lave-vaisselle",      "lave_vaisselle", rooms[3], cats["Électroménager"], "off",  0,  0, "Bosch",      None, None),
            ("Aspirateur robot",    "aspirateur",     rooms[0], cats["Électroménager"], "off",  0,  0, "Roomba",     time(10,0), time(12,0)),
            ("Volet salon",         "volet",          rooms[0], cats["Confort"],        "on",   0,  0, "Somfy",      time(7,0),  time(22,0)),
            ("TV Salon",            "television",     rooms[0], cats["Divertissement"], "off",  0,  0, "Samsung",    None, None),
            ("Climatiseur Chambre", "climatiseur",    rooms[1], cats["Confort"],        "on",  19, 20, "Daikin",     time(22,0), time(6,0)),
            ("Machine à café",      "machine_cafe",   rooms[3], cats["Électroménager"], "on",   0,  0, "Nespresso",  time(6,0),  time(10,0)),
            ("Alarme",              "alarme",         rooms[0], cats["Sécurité"],       "on",   0,  0, "Verisure",   None, None),
            ("Arrosage jardin",     "arrosage",       rooms[6], cats["Extérieur"],      "off",  0,  0, "Gardena",    time(6,0),  time(7,0)),
            ("Porte garage",        "porte",          rooms[5], cats["Extérieur"],      "off",  0,  0, "Sommer",     None, None),
            ("Enceinte Salon",      "enceinte",       rooms[0], cats["Divertissement"], "off",  0,  0, "Sonos",      None, None),
            ("Détecteur Entrée",    "detecteur",      rooms[0], cats["Sécurité"],       "on",   0,  0, "Netatmo",    None, None),
            ("Thermostat Chambre",  "thermostat",     rooms[1], cats["Confort"],        "on",  19, 20, "Nest",       None, None),
        ]
        devices = []
        for name, t, room, cat, st, val, tgt, brand, start, end in devices_data:
            d = Device.objects.create(
                name=name, type=t, room=room, category=cat, status=st,
                battery=100,
                value=val, target_value=tgt, brand=brand,
                start_time=start, end_time=end,
                user=random.choice(users[:2]),
                description=f"{name} — marque {brand}. Connecté en Wi-Fi.",
                last_maintenance=date(2025, 10, 15),
            )
            devices.append(d)

        # --- 7 objets en maintenance (sur 15) : moitié à réviser ---
        # Indices : Lave-linge, Aspirateur, Climatiseur, Alarme,
        #          Arrosage jardin, Détecteur entrée, Thermostat Chambre
        # On varie : certains avec batterie faible, d'autres maintenance ancienne
        maintenance_setup = [
            (2,  15, date(2025, 6, 10)),   # Lave-linge : batterie faible
            (4,   8, date(2024, 1, 15)),   # Aspirateur : batterie + maintenance ancienne
            (7,  12, date(2025, 5, 20)),   # Climatiseur : batterie faible
            (9, 100, date(2024, 6, 5)),    # Alarme : maintenance ancienne (>6 mois)
            (10, 18, date(2023, 8, 10)),   # Arrosage : batterie + maintenance très ancienne
            (13, 100, date(2024, 8, 20)),  # Détecteur : maintenance ancienne (>6 mois)
            (14,  5, date(2025, 9, 1)),    # Thermostat Chambre : batterie très faible
        ]
        for idx, bat, last_maint in maintenance_setup:
            devices[idx].battery = bat
            devices[idx].last_maintenance = last_maint
            devices[idx].save()

        # --- 5 SERVICES M2M (chacun lié à plusieurs objets) ---
        # Format : (name, description, type, [indices_devices])
        services_data = [
            (
                "Mode sécurité maison",
                "Activez tout le système de sécurité en un clic : alarme, "
                "caméra de surveillance, détecteur d'entrée et porte du garage.",
                "securite",
                [9, 1, 13, 11],  # Alarme, Caméra entrée, Détecteur Entrée, Porte garage
            ),
            (
                "Confort & ambiance",
                "Réglez l'ambiance idéale : thermostats au bon niveau, "
                "climatiseur en marche, volets ouverts.",
                "confort",
                [0, 14, 7, 5],  # Thermostat Salon, Thermostat Chambre, Climatiseur, Volet salon
            ),
            (
                "Cinéma à la maison",
                "Lancez le mode cinéma : TV allumée, enceinte connectée, "
                "volets fermés pour l'immersion.",
                "divertissement",
                [6, 12, 5],  # TV Salon, Enceinte Salon, Volet salon
            ),
            (
                "Routine matinale",
                "Réveil en douceur : café préparé, volets ouverts, "
                "thermostat du salon réglé.",
                "confort",
                [8, 5, 0],  # Machine à café, Volet salon, Thermostat Salon
            ),
            (
                "Entretien quotidien",
                "Lancez tous les appareils ménagers : lave-linge, "
                "lave-vaisselle, aspirateur robot et arrosage du jardin.",
                "energie",
                [2, 3, 4, 10],  # Lave-linge, Lave-vaisselle, Aspirateur, Arrosage jardin
            ),
        ]
        for name, desc, type_, dev_indices in services_data:
            srv = Service.objects.create(name=name, description=desc, type=type_)
            for idx in dev_indices:
                srv.related_devices.add(devices[idx])

        # --- Stats de consommation ---
        for d in devices:
            for _ in range(7):
                Stat.objects.create(device=d,
                                    consumption=round(random.uniform(0.1, 3.5), 2))

        # --- Historique varié ---
        now = timezone.now()
        user_profiles = {
            users[0].id: 25, users[1].id: 18,
            users[2].id: 8,  users[3].id: 4,
        }
        realistic_hours = [
            (7, 30), (8, 15), (12, 5), (12, 45),
            (18, 20), (19, 30), (20, 45), (21, 15), (22, 0),
        ]

        for user in users:
            n_logins = user_profiles[user.id]
            user_actions = []
            for _ in range(n_logins):
                days_ago = random.randint(0, 20)
                hour, minute = random.choice(realistic_hours)
                minute_offset = random.randint(-15, 15)
                date_login = now - timedelta(days=days_ago)
                date_login = date_login.replace(
                    hour=hour, minute=max(0, min(59, minute + minute_offset)),
                    second=random.randint(0, 59), microsecond=0)
                user_actions.append(date_login)
            user_actions.sort()
            for d_login in user_actions:
                a = Action.objects.create(
                    user=user, action_type="login",
                    description="Connexion à la plateforme")
                Action.objects.filter(pk=a.pk).update(date=d_login)

            for _ in range(random.randint(3, 8)):
                days_ago = random.randint(0, 14)
                hour, minute = random.choice(realistic_hours)
                date_consult = now - timedelta(days=days_ago)
                date_consult = date_consult.replace(
                    hour=hour, minute=minute,
                    second=random.randint(0, 59), microsecond=0)
                device = random.choice(devices)
                a = Action.objects.create(
                    user=user, action_type="consult",
                    device=device, description=f"Consultation de {device.name}")
                Action.objects.filter(pk=a.pk).update(date=date_consult)

            user.nb_connexions = n_logins
            user.nb_actions = n_logins + random.randint(3, 8)
            user.save()

        # --- Demande de suppression de démo ---
        DeletionRequest.objects.create(
            device=devices[4],
            requested_by=users[1],
            reason="Batterie en fin de vie, on va le remplacer.",
            status="pending",
        )

        # --- Superuser admin ---
        User.objects.create_superuser(
            username="admin", email="admin@maison.fr",
            password="admin1234", role="parent",
            level="expert", points=100, age=40,
            first_name="Admin", last_name="System",
            is_approved=True, email_verified=True)

        self.stdout.write(self.style.SUCCESS("Données SmartHouse générées."))
        self.stdout.write(" 15 objets connectés : 8 en bon état, 7 nécessitant maintenance.")
        self.stdout.write(" 5 services regroupant plusieurs objets (M2M).")
        self.stdout.write(" Comptes : alice / bob / charlie / demo (mdp : demo1234)")
        self.stdout.write(" Admin   : admin / admin1234")
        self.stdout.write("")
        self.stdout.write(" Whitelist :")
        self.stdout.write("   - acfiren12@gmail.com (parent) -> OTP par mail requis")
        self.stdout.write("   - famille.dupont@gmail.com (parent) -> activation auto")
        self.stdout.write("   - lucas.dupont@gmail.com (enfant) -> activation auto")
        self.stdout.write("   - marie.martin@gmail.com (parent) -> activation auto")
