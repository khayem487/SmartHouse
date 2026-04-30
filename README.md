# SmartHouse — Plateforme Web de Maison Intelligente

Projet CY Tech ING1 (2025-2026)

Application complète de gestion d’une maison connectée avec:
- objets IoT,
- services domotiques multi-actions,
- authentification + vérification email OTP,
- gestion des rôles et niveaux,
- historique, maintenance et statistiques.

---

## Stack technique

- **Backend**: Django 5, Django REST Framework, JWT
- **Frontend**: React 18, Vite
- **Base**: SQLite (développement)
- **Email OTP**: SMTP Gmail
- **Style**: UI responsive (mobile-first)

---

## Fonctionnalités principales

### 1) Authentification & sécurité
- Inscription restreinte aux emails autorisés (whitelist)
- Rôle attribué automatiquement (parent/enfant)
- Vérification email par **code OTP 6 chiffres**
- Connexion possible avec **pseudo ou email**
- JWT (access/refresh)

### 2) Gestion des objets connectés
- CRUD des objets (nom, type, pièce, catégorie, état, batterie, valeurs)
- Contrôles rapides par type d’appareil (thermostat, climatiseur, volet, etc.)
- Règles de sécurité sur objets sensibles (alarme/caméra/porte/détecteur)

### 3) Services domotiques personnalisés
- Création de services avec plusieurs actions liées à plusieurs appareils
- Exécution d’un service en 1 clic (ex: “Cinéma à la maison”)

### 4) Gouvernance utilisateur
- Niveaux: débutant / intermédiaire / avancé / expert
- Points, connexions, historique des actions
- Gestion admin des utilisateurs + whitelist via écran dédié

### 5) Supervision
- Maintenance (batterie faible / maintenance ancienne)
- Statistiques de consommation
- Exports CSV

---

## Rôles & permissions (résumé)

| Action | Visiteur | Enfant | Parent (déb/inter) | Parent (avancé/expert) | Admin |
|---|---|---|---|---|---|
| Voir liste objets/services | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir détails | ❌ | ✅ | ✅ | ✅ | ✅ |
| Modifier profil | — | ✅ | ✅ | ✅ | ✅ |
| Toggle objet non-sécurité | ❌ | ✅ | ✅ | ✅ | ✅ |
| Toggle objet sécurité | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ajouter / modifier objet | ❌ | ❌ | ❌ | ✅ | ✅ |
| Demander suppression | ❌ | ❌ | ❌ | ✅ | — |
| Maintenance / Stats | ❌ | ❌ | ❌ | ✅ | ✅ |
| Suppression directe | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gérer whitelist/utilisateurs | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Démarrage rapide

## Prérequis
- Python 3.11+
- Node.js 18+
- npm 9+

### 1) Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations api
python manage.py migrate
python manage.py seed
python manage.py runserver
```

Backend: `http://127.0.0.1:8000`
Admin Django: `http://127.0.0.1:8000/admin`

### 2) Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

---

## Comptes de démo (seed)

- `alice / demo1234`
- `bob / demo1234`
- `charlie / demo1234`
- `demo / demo1234`
- `admin / admin1234`

Emails autorisés préchargés (whitelist) :
- `alice@maison.fr` (parent)
- `bob@maison.fr` (parent)
- `charlie@maison.fr` (enfant)
- `demo@maison.fr` (parent)
- `admin@maison.fr` (parent)
- `acfiren12@gmail.com` (parent)
- `famille.dupont@gmail.com` (parent)
- `lucas.dupont@gmail.com` (enfant)
- `marie.martin@gmail.com` (parent)

---

## Configuration OTP / Email (important)

Le backend lit `backend/.env` automatiquement.

Exemple minimal:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your_16_char_app_password
DEFAULT_FROM_EMAIL=SmartHouse <your@gmail.com>
FRONTEND_URL=http://127.0.0.1:5173
```

⚠️ Pour Gmail, utiliser un **mot de passe d’application** (pas le mot de passe du compte).

---

## Endpoints API clés

### Auth
- `POST /api/register/`
- `POST /api/login/`
- `POST /api/token/refresh/`
- `POST /api/verify-code/`
- `POST /api/resend-verification/`
- `GET  /api/verify/<token>/`

### Profil / utilisateurs
- `GET/PATCH /api/profile/`
- `GET /api/users/`
- `POST /api/change-password/`
- `POST /api/admin/users/<id>/`
- `DELETE /api/admin/users/<id>/delete/`

### Devices / services
- `GET/POST /api/devices/`
- `POST /api/devices/<id>/toggle/`
- `GET/POST /api/services/`
- `POST /api/services/<id>/run/`

### Supervision
- `GET /api/maintenance/`
- `GET /api/actions/me/`
- `GET /api/actions/history/`
- `GET /api/stats/summary/`
- `GET /api/stats/export/devices/`
- `GET /api/stats/export/consumption/`

---

## Structure du projet

```text
SmartHouse/
├─ backend/
│  ├─ api/
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ views.py
│  │  ├─ urls.py
│  │  ├─ scenario_engine.py
│  │  └─ management/commands/seed.py
│  ├─ smart_home/settings.py
│  └─ manage.py
└─ frontend/
   └─ src/
      ├─ components/
      └─ pages/
```

---

## Dépannage rapide

### OTP non reçu
1. Vérifier `backend/.env`
2. Vérifier `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD`
3. Relancer le backend après changement `.env`
4. Utiliser “Renvoyer le code” dans l’inscription

### Whitelist vide
- Lancer:
```powershell
python manage.py migrate
python manage.py seed
```

### Erreurs après pull
- Refaire:
```powershell
python manage.py makemigrations api
python manage.py migrate
```

---

## Notes

- Ce README documente l’état actuel de la branche principale.
- Les choix de design/architecture peuvent évoluer avec les itérations du projet.
