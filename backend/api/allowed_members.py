"""
Liste des emails pré-autorisés à s'inscrire sur la plateforme.
Seuls les membres de la maison peuvent créer un compte.
Le rôle (parent/enfant) est défini ici, l'utilisateur ne le choisit pas.

Un VISITEUR n'a pas de compte — il navigue librement sans s'inscrire.
"""

ALLOWED_MEMBERS = {
    # Comptes déjà créés (seed)
    "alice@maison.fr":            "parent",
    "bob@maison.fr":              "parent",
    "charlie@maison.fr":          "enfant",
    "demo@maison.fr":             "parent",
    "admin@maison.fr":            "parent",
    # Emails pré-autorisés mais pas encore inscrits
    "acfiren12@gmail.com":        "parent",
    "famille.dupont@gmail.com":   "parent",
    "lucas.dupont@gmail.com":     "enfant",
    "marie.martin@gmail.com":     "parent",
}


def _db_lookup(email: str):
    """Retourne l'entrée whitelist en base si disponible (sinon None).
    Import local pour éviter les imports cycliques au démarrage Django.
    """
    try:
        from .models import AllowedMember
        return AllowedMember.objects.filter(email=email).first()
    except Exception:
        return None


def is_allowed(email: str) -> bool:
    """Vérifie si un email est autorisé à s'inscrire."""
    normalized = email.lower().strip()
    if normalized in ALLOWED_MEMBERS:
        return True
    return _db_lookup(normalized) is not None


def get_role(email: str) -> str:
    """Renvoie le rôle (parent/enfant) associé à l'email."""
    normalized = email.lower().strip()
    if normalized in ALLOWED_MEMBERS:
        return ALLOWED_MEMBERS.get(normalized, "parent")
    db_member = _db_lookup(normalized)
    if db_member:
        return db_member.role
    return "parent"
