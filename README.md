# Maison Intelligente — Plateforme Web

Projet CY Tech ING1 2025-2026.
Plateforme complète de gestion d'une maison intelligente : objets connectés,
services domotiques, niveaux utilisateurs, historique, statistiques.

**Stack :** Django 5 + DRF + JWT · React 18 + Vite · SQLite · Gmail SMTP · Mobile-first.

---

## Lancement

### 1. Backend Django

```powershell
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
python manage.py makemigrations api
python manage.py migrate
python manage.py seed
python manage.py runserver
```

→ http://127.0.0.1:8000 (admin Django : http://127.0.0.1:8000/admin)

### 2. Frontend React

Dans un autre terminal :

```powershell
cd frontend
npm install
npm run dev
```

→ http://127.0.0.1:5173

---

## Inscription : qui peut s'inscrire ?

**Seuls les emails pré-autorisés** par l'administrateur peuvent créer un compte.
La liste est gérée via **Gestion → Gérer utilisateurs** (whitelist),
avec fallback dans `backend/api/allowed_members.py` pour les seeds.
Le **rôle (parent ou enfant) est attribué automatiquement** depuis cette liste — l'utilisateur ne le choisit pas.

**Visiteur** : navigue librement sans inscription (filtres, vue d'ensemble),
mais ne peut pas voir les détails des objets/services.

### Emails actuellement autorisés (pré-remplis)

| Email                       | Rôle    | Compte créé ? |
|-----------------------------|---------|---------------|
| alice@maison.fr             | parent  | ✔ (alice/demo1234)  |
| bob@maison.fr               | parent  | ✔ (bob/demo1234)    |
| charlie@maison.fr           | enfant  | ✔ (charlie/demo1234)|
| demo@maison.fr              | parent  | ✔ (demo/demo1234)   |
| admin@maison.fr             | parent  | ✔ (admin/admin1234) |
| acfiren12@gmail.com         | parent  | ❌ libre              |
| famille.dupont@gmail.com    | parent  | ❌ libre              |
| lucas.dupont@gmail.com      | enfant  | ❌ libre              |
| marie.martin@gmail.com      | parent  | ❌ libre              |

---

## Permissions par rôle

| Action                          | Visiteur | Enfant | Parent (déb/inter) | Parent (avancé/expert) | Admin |
|---------------------------------|----------|--------|--------------------|------------------------|-------|
| Voir liste objets/services      | ✔        | ✔      | ✔                  | ✔                      | ✔     |
| Voir détails (objet/service)    | ❌       | ✔      | ✔                  | ✔                      | ✔     |
| Modifier son profil             | -        | ✔      | ✔                  | ✔                      | ✔     |
| Toggle objet (non-sécurité)     | ❌       | ✔      | ✔                  | ✔                      | ✔     |
| Toggle objet sécurité (alarme,…)| ❌       | ❌     | ✔                  | ✔                      | ✔     |
| Ajouter / Modifier objet        | ❌       | ❌     | ❌                 | ✔                      | ✔     |
| Demander suppression objet      | ❌       | ❌     | ❌                 | ✔                      | -     |
| Maintenance / Stats / Historique| ❌       | ❌     | ❌                 | ✔                      | ✔     |
| Suppression directe objet       | ❌       | ❌     | ❌                 | ❌                     | ✔     |
| Approuver/refuser demandes      | ❌       | ❌     | ❌                 | ❌                     | ✔     |

**Objets de sécurité** : alarme, caméra, porte, détecteur — réservés aux parents.

---

## Niveaux et points

| Niveau         | Points | Module débloqué (sauf enfants) |
|----------------|--------|--------------------------------|
| Débutant       | 0      | Information, Visualisation     |
| Intermédiaire  | 5      | Information, Visualisation     |
| Avancé         | 10     | + Gestion                      |
| Expert         | 15     | + Gestion étendu               |

---

## Services domotiques personnalisés

- Les parents (connectés) peuvent créer des services multi-actions.
- Exemple: mode théâtre (fermer volets + activer TV/enceinte + couper autres appareils).
- Chaque service peut être exécuté depuis la page Services.

---

## 📁 Structure

```
smart_home_project/
├── backend/
│   ├── api/
│   │   ├── allowed_members.py   ← Liste des emails autorisés
│   │   ├── models.py            ← User, Device, Service, Action, Stat, …
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── management/commands/seed.py
│   ├── smart_home/settings.py   ← Config Gmail SMTP
│   └── manage.py
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx       ← Menus déroulants
│       │   └── ProtectedRoute.jsx
│       └── pages/               ← 17 pages React
└── README.md
```

---

