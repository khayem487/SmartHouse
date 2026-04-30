import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { getUser, isLoggedIn } from "../api";

const TYPES = [
  ["energie", "Consommation énergétique"],
  ["securite", "Sécurité"],
  ["confort", "Confort"],
  ["divertissement", "Divertissement"],
  ["sante", "Santé & bien-être"],
];

const ACTION_TYPES = [
  ["turn_on", "Allumer"],
  ["turn_off", "Éteindre"],
  ["toggle", "Basculer"],
  ["set_value", "Régler une valeur"],
  ["open", "Ouvrir (volet)"],
  ["close", "Fermer (volet)"],
];

const emptyAction = { device: "", action_type: "turn_off", action_value: "", order: 0 };

export default function Services() {
  const nav = useNavigate();
  const [services, setServices] = useState([]);
  const [devices, setDevices] = useState([]);
  const [filters, setFilters] = useState({ type: "", active: "", q: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "confort",
    active: true,
    related_devices: [],
    actions: [{ ...emptyAction }],
  });

  const logged = isLoggedIn();
  const user = getUser();
  const canCreate = logged && user?.role !== "enfant";

  const loadServices = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== "" && params.append(k, v));
    const r = await API.get("/services/?" + params.toString());
    setServices(r.data);
  };

  useEffect(() => {
    loadServices().catch(() => setError("Impossible de charger les services."));
  }, [filters]);

  useEffect(() => {
    if (!canCreate) return;
    API.get("/devices/")
      .then((r) => setDevices(r.data))
      .catch(() => setDevices([]));
  }, [canCreate]);

  const deviceMap = useMemo(() => {
    const m = new Map();
    devices.forEach((d) => m.set(d.id, d));
    return m;
  }, [devices]);

  const set = (k, v) => setFilters({ ...filters, [k]: v });

  const handleClick = (id) => {
    nav(`/services/${id}`);
  };

  const onDeviceSelect = (e) => {
    const vals = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
    setForm((prev) => ({ ...prev, related_devices: vals }));
  };

  const addAction = () => {
    setForm((prev) => ({
      ...prev,
      actions: [...prev.actions, { ...emptyAction, order: prev.actions.length }],
    }));
  };

  const removeAction = (idx) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== idx).map((a, i) => ({ ...a, order: i })),
    }));
  };

  const updateAction = (idx, key, value) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.map((a, i) => (i === idx ? { ...a, [key]: value } : a)),
    }));
  };

  const createService = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    setSaving(true);
    try {
      const actionPayload = form.actions
        .filter((a) => a.device && a.action_type)
        .map((a, i) => ({
          device: Number(a.device),
          action_type: a.action_type,
          action_value: a.action_type === "set_value" && a.action_value !== "" ? Number(a.action_value) : null,
          order: i,
        }));

      const fromActions = [...new Set(actionPayload.map((a) => a.device))];
      const linked = fromActions.length > 0 ? fromActions : form.related_devices;

      await API.post("/services/", {
        name: form.name,
        description: form.description,
        type: form.type,
        active: form.active,
        related_devices: linked,
        actions: actionPayload,
      });

      setMsg("Service détaillé ajouté ✔");
      setForm({
        name: "",
        description: "",
        type: "confort",
        active: true,
        related_devices: [],
        actions: [{ ...emptyAction }],
      });
      await loadServices();
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible d'ajouter le service.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container" id="main">
      <h1>Services & outils SmartHouse</h1>
      <p>
        Chaque service peut contenir plusieurs objets et des actions détaillées (on/off, valeur, ouverture/fermeture).
      </p>

      {!logged && (
        <div className="alert info">
          Vous êtes en mode visiteur. Vous pouvez consulter les détails; <Link to="/login">connectez-vous</Link> pour exécuter/créer des services.
        </div>
      )}

      {msg && <div className="alert success">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      {canCreate && (
        <form className="form form-wide" onSubmit={createService}>
          <h2>Ajouter un service détaillé</h2>
          <label>Nom</label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />

          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            required
          />

          <label>Type</label>
          <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <label>Objets liés (optionnel si actions configurées)</label>
          <select multiple value={form.related_devices.map(String)} onChange={onDeviceSelect} style={{ minHeight: 120 }}>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <h3 style={{ marginTop: "1rem" }}>Actions détaillées</h3>
          {form.actions.map((a, idx) => {
            const selectedDevice = a.device ? deviceMap.get(Number(a.device)) : null;
            const isVolet = selectedDevice?.type === "volet";
            return (
              <div key={idx} className="card" style={{ marginBottom: "0.8rem" }}>
                <p><strong>Action {idx + 1}</strong></p>
                <label>Objet</label>
                <select
                  value={a.device}
                  onChange={(e) => updateAction(idx, "device", e.target.value)}
                  required
                >
                  <option value="">Choisir un objet…</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <label>Commande</label>
                <select
                  value={a.action_type}
                  onChange={(e) => updateAction(idx, "action_type", e.target.value)}
                >
                  {ACTION_TYPES.filter(([v]) => isVolet || !["open", "close"].includes(v)).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>

                {a.action_type === "set_value" && (
                  <>
                    <label>Valeur</label>
                    <input
                      type="number"
                      value={a.action_value}
                      onChange={(e) => updateAction(idx, "action_value", e.target.value)}
                      required
                    />
                  </>
                )}

                {form.actions.length > 1 && (
                  <button className="btn danger" type="button" onClick={() => removeAction(idx)}>
                    Supprimer cette action
                  </button>
                )}
              </div>
            );
          })}

          <button className="btn secondary" type="button" onClick={addAction}>+ Ajouter une action</button>

          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
            />{" "}
            Service actif
          </label>

          <button type="submit" disabled={saving}>{saving ? "Ajout..." : "Ajouter le service"}</button>
        </form>
      )}

      <section aria-label="Filtres">
        <div className="filters">
          <input placeholder="Recherche nom ou description" value={filters.q}
                 onChange={(e) => set("q", e.target.value)}
                 aria-label="Recherche texte" />
          <select value={filters.type} onChange={(e) => set("type", e.target.value)} aria-label="Type">
            <option value="">Tous les types</option>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filters.active} onChange={(e) => set("active", e.target.value)} aria-label="Statut">
            <option value="">Tous les statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>
        </div>
      </section>

      <p><strong>{services.length}</strong> service(s) trouvé(s)</p>

      <div className="cards">
        {services.map((s) => {
          const nbDevices = s.related_devices_info?.length || 0;
          const nbActions = s.actions?.length || 0;
          return (
            <article key={s.id} className="card"
                     role="button" tabIndex={0}
                     style={{ cursor: "pointer" }}
                     onClick={() => handleClick(s.id)}
                     onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick(s.id)}
                     aria-label={`Voir ${s.name}`}>
              <h3>{s.name}</h3>
              <p>{s.description.slice(0, 100)}{s.description.length > 100 ? "…" : ""}</p>
              <p><strong>Type :</strong> {s.type_display}</p>
              <p><strong>Objets liés :</strong> {nbDevices}</p>
              <p><strong>Actions :</strong> {nbActions}</p>
              <span className={"badge " + (s.all_devices_on ? "on" : "off")}>
                {nbDevices === 0 ? "Aucun objet" : (s.all_devices_on ? "Tous actifs" : "Inactif / partiel")}
              </span>
            </article>
          );
        })}
      </div>
    </main>
  );
}
