# 🏠 Maison Intelligente — Plateforme Web

Projet CY Tech ING1 2025-2026 — Développement Web.
Plateforme complète de gestion d'une maison intelligente avec objets connectés,
services domotiques, niveaux utilisateurs, historique et statistiques.

**Stack :** Django 5 + DRF + JWT · React 18 + Vite · SQLite · Responsive (mobile-first).

---

## 📦 Architecture

```
smart_home_project/
├── backend/          # Django + DRF + JWT (port 8000)
│   ├── api/          # App principale (models, views, serializers)
│   ├── smart_home/   # Config Django
│   └── requirements.txt
├── frontend/         # React + Vite (port 5173)
│   └── src/
│       ├── components/   # Navbar, ProtectedRoute
│       └── pages/        # Toutes les pages
└── README.md
```

---

## 🚀 Lancement rapide

### 1. Backend (Django)

```bash
cd backend
python -m venv venv

# Linux/Mac
source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt
python manage.py makemigrations api
python manage.py migrate
python manage.py seed
python manage.py runserver
```

Backend : http://127.0.0.1:8000 · Admin Django : http://127.0.0.1:8000/admin

### 2. Frontend (React)

Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

Frontend : http://127.0.0.1:5173

---

## 👤 Comptes de test

| Username | Password    | Niveau         | Accès                                 |
|----------|-------------|----------------|----------------------------------------|
| alice    | demo1234    | expert         | Tous les modules                       |
| bob      | demo1234    | avancé         | Information + Visualisation + Gestion  |
| charlie  | demo1234    | intermédiaire  | Information + Visualisation            |
| demo     | demo1234    | débutant       | Information + Visualisation            |
| admin    | admin1234   | superuser      | Django admin (gestion globale)         |

---

## ✅ Fonctionnalités (alignées sur le cahier des charges PDF)

### Module Information (visiteur)
- Page d'accueil avec présentation ("free tour")
- Liste des objets connectés en lecture seule
- Recherche avec filtres : nom/description/marque, type, pièce, catégorie, état
- Liste des services/outils proposés (5 types : énergie, sécurité, confort, divertissement, santé)
- Bouton inscription

### Module Visualisation (débutant/intermédiaire)
- Inscription complète (pseudo, email, prénom/nom, âge, genre, date de naissance, rôle)
- Envoi d'email de validation (simulé) avec token UUID
- Vérification login/mot de passe via JWT
- Profil public : pseudo, âge, genre, date de naissance, rôle, photo, niveau, points
- Profil privé : nom, prénom, changement mot de passe
- **Upload de photo de profil**
- Consulter le profil des autres membres
- Consulter en détail les objets et les services (attributs : température, état, batterie,
  connectivité, marque, horaires, valeurs, dernière maintenance)
- Recherche avec ≥ 2 filtres (objets ET services)
- Système de points : +0.25/connexion, +0.5/consultation
- **Choix manuel de niveau** (page `/level`) parmi ceux débloqués
- Compteur de connexions et d'actions
- Historique personnel des actions

### Module Gestion (avancé/expert)
- Ajouter un objet connecté (avec horaires de fonctionnement + catégorie)
- Modifier un objet (tous ses attributs + horaires)
- **Demander la suppression d'un objet** (envoie une requête à l'admin)
- Suivi de ses propres demandes de suppression (seules celles en attente sont listées)
- Activer / désactiver un objet (toggle)
- **Détection automatique des objets nécessitant maintenance** (batterie < 20% ou > 6 mois sans révision)
- Page Maintenance dédiée avec **bouton "Marquer comme réparé"** (recharge batterie + datation maintenance)
- **Historique global** des actions sur les objets (tous utilisateurs confondus)
- Statistiques : nombre d'objets, actifs, consommation kWh, répartition par type et pièce
- **Export CSV** des objets et de la consommation

### Module Administration (admin uniquement)
- Page **"🛡 Gérer demandes"** (accessible via le menu Gestion)
- Boutons **"Supprimer"** (approuve + supprime l'objet) et **"Refuser"** (conserve l'objet)
- Une fois traitée, la demande disparaît pour l'admin ET l'utilisateur
- **Suppression directe** depuis la page détail d'un objet (bouton "Supprimer (admin)" au lieu de "Demander")

### Gestion par l'administrateur (Django Admin)
- Approuver/refuser les demandes de suppression (actions groupées)
- Valider les inscriptions (champ `is_approved`)
- Gérer utilisateurs, catégories, objets, services, pièces
- Ajuster manuellement points et niveaux

---

## 🏆 Système de niveaux et points

| Niveau         | Points requis | Module débloqué        |
|----------------|---------------|------------------------|
| Débutant       | 0             | Information, Visualisation |
| Intermédiaire  | 5             | Information, Visualisation |
| Avancé         | 10            | + Gestion              |
| Expert         | 15            | + Gestion étendu       |

**Cumul de points :** +0.25 par connexion, +0.5 par consultation d'un objet ou service.
L'utilisateur peut **choisir manuellement** son niveau parmi ceux débloqués via `/level`.

---

## 🔧 API REST — Endpoints principaux

### Auth
| Méthode | URL                          | Description                         |
|---------|------------------------------|-------------------------------------|
| POST    | `/api/register/`             | Inscription                         |
| POST    | `/api/login/`                | Connexion → JWT                     |
| POST    | `/api/token/refresh/`        | Rafraîchir le token                 |
| POST    | `/api/change-password/`      | Changer mot de passe                |
| GET     | `/api/verify/<token>/`       | Valider email                       |

### Profil
| Méthode | URL                          | Description                         |
|---------|------------------------------|-------------------------------------|
| GET/PUT | `/api/profile/`              | Voir/modifier profil (+ upload photo)|
| POST    | `/api/profile/set-level/`    | Choisir son niveau                  |
| GET     | `/api/users/`                | Liste des autres membres            |

### Objets
| Méthode | URL                          | Description                         |
|---------|------------------------------|-------------------------------------|
| GET     | `/api/devices/`              | Liste (filtres : `type`, `room`, `category`, `status`, `brand`, `q`) |
| GET     | `/api/devices/<id>/`         | Détail (+0.5 pts si connecté)       |
| POST    | `/api/devices/`              | Créer (auth)                        |
| PUT     | `/api/devices/<id>/`         | Modifier (auth)                     |
| POST    | `/api/devices/<id>/toggle/`  | Activer/désactiver                  |
| GET     | `/api/maintenance/`          | Objets à réviser                    |

### Services, Pièces, Catégories
| Méthode | URL                          | Description                         |
|---------|------------------------------|-------------------------------------|
| GET     | `/api/services/`             | Liste (filtres : `type`, `active`, `q`) |
| GET     | `/api/services/<id>/`        | Détail                              |
| GET     | `/api/rooms/`                | Liste pièces                        |
| GET     | `/api/categories/`           | Liste catégories                    |

### Historique / Stats / Exports
| Méthode | URL                                | Description                  |
|---------|------------------------------------|------------------------------|
| GET     | `/api/actions/me/`                 | Mon historique               |
| GET     | `/api/actions/history/`            | Historique global (auth)     |
| GET     | `/api/stats/summary/`              | Résumé stats                 |
| GET     | `/api/stats/export/devices/`       | Export CSV objets            |
| GET     | `/api/stats/export/consumption/`   | Export CSV consommation      |

### Demandes de suppression
| Méthode | URL                          | Description                         |
|---------|------------------------------|-------------------------------------|
| GET     | `/api/deletion-requests/`    | Mes demandes (user) / toutes (admin)|
| POST    | `/api/deletion-requests/`    | Créer une demande                   |

---

## 📐 Modèles (UML simplifié)

```
User (AbstractUser personnalisé)
├─ username, email, password, first_name, last_name
├─ age, role (parent/enfant/visiteur), gender, date_naissance, photo
├─ level, points, nb_connexions, nb_actions
└─ is_approved, email_verified, verification_token

Category          Room              Service
├─ name            ├─ name            ├─ name, description
├─ icon            └─ type            ├─ type (énergie/sécurité/…)
└─ description                        └─ related_device (FK Device)

Device                                 Action               Stat
├─ name, type, description              ├─ user (FK)          ├─ device (FK)
├─ category (FK), room (FK)             ├─ action_type        ├─ consumption
├─ status, battery, value, target       ├─ device (FK)        └─ date
├─ brand, start_time, end_time          ├─ description
├─ last_maintenance                     └─ date
└─ user (FK)

DeletionRequest
├─ device (FK), requested_by (FK)
├─ reason, status (pending/approved/rejected)
└─ created_at, resolved_at
```

## 🧪 Scénario de test recommandé

1. Lance backend + frontend
2. Va sur http://localhost:5173 en visiteur → teste filtres sur `/devices` et `/services`
3. Connecte-toi avec `demo / demo1234` (débutant, 0 pts)
4. Consulte 10 objets → tu passes intermédiaire automatiquement (5 pts)
5. Continue → avance à 10 pts → module Gestion débloqué
6. Va sur `/level` pour choisir manuellement ton niveau
7. Avec `alice / demo1234` (expert) teste :
   - `/devices/add` (ajouter objet avec horaires)
   - `/devices/:id/edit` (modifier)
   - Demander suppression d'un objet → voir dans `/my-requests`
   - `/maintenance` (objets à réviser)
   - `/history` (log global)
   - `/stats` → télécharger CSV
8. Admin : http://localhost:8000/admin (`admin / admin1234`) → approuver une demande

---
