import threading
import time
from datetime import timedelta

from django.utils import timezone

from .models import Action, Scenario


def execute_scenario(scenario: Scenario, actor=None, source: str = "auto"):
    dev = scenario.action_device
    if scenario.action_type == "toggle":
        dev.status = "on" if dev.status == "off" else "off"
    elif scenario.action_type == "turn_on":
        dev.status = "on"
    elif scenario.action_type == "turn_off":
        dev.status = "off"
    elif scenario.action_type == "set_value" and scenario.action_value is not None:
        dev.value = scenario.action_value
        dev.target_value = scenario.action_value
        if dev.type in ("thermostat", "climatiseur", "volet", "machine_cafe"):
            dev.status = "on" if (dev.value or 0) > 0 else "off"

    dev.save()
    scenario.last_run = timezone.now()
    scenario.save(update_fields=["last_run"])

    if actor:
        Action.objects.create(
            user=actor,
            action_type="toggle",
            device=dev,
            description=f"Scénario '{scenario.name}' exécuté ({source})",
        )
    return dev


def run_due_scenarios():
    now = timezone.localtime()
    due = Scenario.objects.filter(active=True, trigger_type="time", trigger_time__isnull=False)
    for scenario in due.select_related("action_device", "created_by"):
        if not scenario.trigger_time:
            continue
        # Déclenche exactement à l'heure/minute locale
        if scenario.trigger_time.hour != now.hour or scenario.trigger_time.minute != now.minute:
            continue

        # Évite les doubles exécutions dans la même minute
        if scenario.last_run:
            last_local = timezone.localtime(scenario.last_run)
            if abs((now - last_local).total_seconds()) < 50:
                continue

        execute_scenario(scenario, actor=scenario.created_by, source="auto-time")


class ScenarioScheduler:
    _started = False
    _lock = threading.Lock()

    @classmethod
    def start(cls):
        with cls._lock:
            if cls._started:
                return
            cls._started = True

        def loop():
            # Tick léger : exécution toutes les 20 secondes
            while True:
                try:
                    run_due_scenarios()
                except Exception as exc:
                    print(f"[scenario-scheduler] Erreur: {exc}")
                time.sleep(20)

        thread = threading.Thread(target=loop, daemon=True, name="scenario-scheduler")
        thread.start()
