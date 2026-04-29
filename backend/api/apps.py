import os

from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        # Évite le double lancement avec autoreload Django en mode debug.
        if os.environ.get("RUN_MAIN") != "true" and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
            return

        try:
            from .scenario_engine import ScenarioScheduler
            ScenarioScheduler.start()
        except Exception as exc:
            print(f"[api] Scheduler non démarré: {exc}")
