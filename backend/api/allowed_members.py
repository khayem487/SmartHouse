"""
Liste des emails pré-autorisés à s'inscrire sur SmartHouse.

Désormais GÉRÉE PAR LA BDD via le modèle WhitelistEntry.
L'admin peut ajouter/supprimer des entrées depuis l'interface.
"""


def is_allowed(email: str) -> bool:
    from .models import WhitelistEntry
    return WhitelistEntry.objects.filter(email__iexact=email.strip()).exists()


def get_role(email: str) -> str:
    from .models import WhitelistEntry
    entry = WhitelistEntry.objects.filter(email__iexact=email.strip()).first()
    return entry.role if entry else "parent"


def requires_email_verification(email: str) -> bool:
    from .models import WhitelistEntry
    entry = WhitelistEntry.objects.filter(email__iexact=email.strip()).first()
    return entry.require_email_verification if entry else False
