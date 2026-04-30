import random
from datetime import date, time, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (User, Room, Device, Action, Stat,
                        Category, Service, ServiceAction, DeletionRequest, Scenario, AllowedMember)


class Command(BaseCommand):
    help = "Remplit la BDD SmartHouse avec des données initiales."

    def handle(self, *args, **options):
        self.stdout.write("Nettoyage…")
        for m in (ServiceAction, DeletionRequest, Stat, Action, Scenario, Service, Device, Room, Category, AllowedMember):
            m.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        User.objects.filter(username="admin").delete()

        # --- MEMBERS AUTORISÉS (whitelist en base) ---
        self.stdout.write("Création des membres autorisés…")
        allowed_members_data = [
            ("alice@maison.fr", "parent"),
            ("bob@maison.fr", "parent"),
            ("charlie@maison.fr", "enfant"),
            ("demo@maison.fr", "parent"),
            ("admin@maison.fr", "parent"),
            ("acfiren12@gmail.com", "parent"),
            ("famille.dupont@gmail.com", "parent"),
            ("lucas.dupont@gmail.com", "enfant"),
            ("marie.martin@gmail.com", "parent"),
        ]
        for email, role in allowed_members_data:
            AllowedMember.objects.get_or_create(email=email, role=role)

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

        # --- Utilisateurs (rôle = parent ou enfant, déterminé par allowed_members) ---
        users_data = [
            # user, email, role, age, level, pts, gender, first, last, dob
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
            user.email_verified = True  # déjà validés (seed)
            user.nb_connexions = random.randint(5, 40)
            user.nb_actions = random.randint(10, 100)
            user.save()
            users.append(user)

        # (AllowedMember déjà rempli plus haut)

        # --- Objets connectés (TOUS à 100% batterie au départ) ---
        devices_data = [
            # name, type, room, cat, status, value, target, brand, start, end
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
                battery=100,  # ✅ Tous à 100% au départ
                value=val, target_value=tgt, brand=brand,
                start_time=start, end_time=end,
                user=random.choice(users[:2]),
                description=f"{name} — marque {brand}. Connecté en Wi-Fi.",
                last_maintenance=date(2025, 10, 15),  # maintenance récente
            )
            devices.append(d)

        # --- 2 objets avec maintenance ancienne (>6 mois) pour la démo ---
        # On garde la batterie à 100% mais on met une date de maintenance ancienne
        devices[4].last_maintenance = date(2024, 1, 15)  # Aspirateur robot
        devices[4].save()
        devices[10].last_maintenance = date(2023, 8, 10)  # Arrosage
        devices[10].save()

        # --- 4 services essentiels, chacun relié à plusieurs objets ---
        thermostat_salon = devices[0]
        camera_entree = devices[1]
        lave_linge = devices[2]
        lave_vaisselle = devices[3]
        aspirateur = devices[4]
        volet = devices[5]
        tv = devices[6]
        climatiseur = devices[7]
        cafe = devices[8]
        alarme = devices[9]
        arrosage = devices[10]
        porte_garage = devices[11]
        enceinte = devices[12]
        detecteur = devices[13]
        thermostat_chambre = devices[14]

        services = [
            {
                "name": "Suivi consommation électrique",
                "description": "Pilotage énergie groupé (électroménager + CVC) pour réduire la conso.",
                "type": "energie",
                "related": [
                    lave_linge, lave_vaisselle, aspirateur,
                    climatiseur, thermostat_salon, thermostat_chambre, arrosage,
                ],
                "actions": [
                    (thermostat_salon, "set_value", 20),
                    (thermostat_chambre, "set_value", 19),
                    (climatiseur, "set_value", 24),
                    (lave_linge, "turn_off", None),
                    (lave_vaisselle, "turn_off", None),
                    (aspirateur, "turn_off", None),
                    (arrosage, "turn_off", None),
                ],
            },
            {
                "name": "Alarme intrusion",
                "description": "Active le pack sécurité complet : alarme, caméra, détecteur et accès garage.",
                "type": "securite",
                "related": [alarme, camera_entree, detecteur, porte_garage],
                "actions": [
                    (alarme, "turn_on", None),
                    (camera_entree, "turn_on", None),
                    (detecteur, "turn_on", None),
                    (porte_garage, "turn_on", None),
                ],
            },
            {
                "name": "Mode nuit automatique",
                "description": "Prépare la maison pour la nuit : ambiance calme, sécurité et confort thermique.",
                "type": "confort",
                "related": [
                    thermostat_salon, thermostat_chambre, climatiseur,
                    volet, tv, enceinte, cafe,
                ],
                "actions": [
                    (thermostat_salon, "set_value", 19),
                    (thermostat_chambre, "set_value", 19),
                    (climatiseur, "set_value", 24),
                    (volet, "close", None),
                    (tv, "turn_off", None),
                    (enceinte, "turn_off", None),
                    (cafe, "turn_off", None),
                ],
            },
            {
                "name": "Cinéma à la maison",
                "description": "Scène cinéma complète : immersion, son, lumière et coupure des équipements parasites.",
                "type": "divertissement",
                "related": [tv, enceinte, volet, cafe, arrosage, thermostat_salon],
                "actions": [
                    (volet, "close", None),
                    (tv, "turn_on", None),
                    (enceinte, "turn_on", None),
                    (thermostat_salon, "set_value", 21),
                    (cafe, "turn_off", None),
                    (arrosage, "turn_off", None),
                ],
            },
        ]

        created_services = {}
        for spec in services:
            svc = Service.objects.create(
                name=spec["name"],
                description=spec["description"],
                type=spec["type"],
                created_by=users[0],
            )
            svc.related_devices.add(*spec["related"])
            for order, (dev, action_type, action_value) in enumerate(spec["actions"]):
                ServiceAction.objects.create(
                    service=svc,
                    device=dev,
                    action_type=action_type,
                    action_value=action_value,
                    order=order,
                )
            created_services[spec["name"]] = svc

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

        # --- Une demande de suppression de démo ---
        DeletionRequest.objects.create(
            device=devices[4],  # Aspirateur robot
            requested_by=users[1],  # bob
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

        self.stdout.write(self.style.SUCCESS("Done: donnees generees."))
        self.stdout.write("Tous les objets ont 100% de batterie au depart.")
        self.stdout.write("2 objets ont une maintenance ancienne (demo Maintenance).")
        self.stdout.write("Comptes : alice / bob / charlie / demo (mdp : demo1234)")
        self.stdout.write("Admin   : admin / admin1234")
        self.stdout.write("")
        self.stdout.write("Emails pre-autorises a s'inscrire :")
        self.stdout.write("   - acfiren12@gmail.com (parent)")
        self.stdout.write("   - famille.dupont@gmail.com (parent)")
        self.stdout.write("   - lucas.dupont@gmail.com (enfant)")
        self.stdout.write("   - marie.martin@gmail.com (parent)")
