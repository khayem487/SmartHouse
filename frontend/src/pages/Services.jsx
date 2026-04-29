import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const ICONS = {
  energie: "⚡", securite: "🔒", confort: "🛋", divertissement: "📺", sante: "❤",
};

const emptyAction = { device: "", action_type: "turn_off", action_value: "", order: 0 };

export default function Services() {
  const [services, setServices] = useState([]);
  const [devices, setDevices] = useState([]);
  const [filters, setFilters] = useState({ type: "", active: "", q: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const user = getUser();
  const logged = isLoggedIn();
  const canManage = logged && user?.role !== "enfant";

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "confort",
    active: true,
    actions: [{ ...emptyAction }],
  });

  const loadServices = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== "" && params.append(k, v));
    const { data } = await API.get("/services/?" + params.toString());
    setServices(data);
  };

  useEffect(() => {
    loadServices().catch(() => setError("Impossible de charger les services."));
  }, [filters]);

  useEffect(() => {
    if (!canManage) return;
    API.get("/devices/").then((r) => setDevices(r.data)).catch(() => {});
  }, [canManage]);

  const set = (k, v) => setFilters({ ...filters, [k]: v });

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
    setLoading(true);
    try {
      const payload = {
        ...form,
        related_devices: [...new Set(form.actions.filter((a) => a.device).map((a) => Number(a.device)))],
        actions: form.actions
          .filter((a) => a.device && a.action_type)
          .map((a, i) => ({
            device: Number(a.device),
            action_type: a.action_type,
            action_value: a.action_type === "set_value" && a.action_value !== "" ? Number(a.action_value) : null,
            order: i,
          })),
      };
      await API.post("/services/", payload);
      setMsg("Service créé ✔");
      setForm({ name: "", description: "", type: "confort", active: true, actions: [{ ...emptyAction }] });
      await loadServices();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la création du service.");
    } finally {
      setLoading(false);
    }
  };

  const runService = async (id) => {
    setError("");
    setMsg("");
    try {
      const { data } = await API.post(`/services/${id}/run/`);
      setMsg(data?.detail || "Service exécuté ✔");
      await loadServices();
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible d'exécuter ce service.");
    }
  };

  return (
    <main className="container" id="main">
      <h1>Services & automatisations</h1>
      <p className="muted-text">Crée un mode personnalisé (ex: théâtre) avec plusieurs actions en un clic.</p>

      {msg && <div className="alert success">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

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

      {canManage && (
        <form className="form form-wide service-builder" onSubmit={createService}>
          <h2>Créer un service personnalisé</h2>
          <label>Nom</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />

          <label>Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <h3 className="mt-1">Actions du service</h3>
          {form.actions.map((a, idx) => (
            <div key={idx} className="service-action-row">
              <p className="service-action-title">Action {idx + 1}</p>
              <label>Objet</label>
              <select value={a.device} onChange={(e) => updateAction(idx, "device", e.target.value)} required>
                <option value="">Choisir un objet…</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              <label>Action</label>
              <select value={a.action_type} onChange={(e) => updateAction(idx, "action_type", e.target.value)}>
                {ACTION_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>

              {a.action_type === "set_value" && (
                <>
                  <label>Valeur</label>
                  <input type="number" value={a.action_value}
                         onChange={(e) => updateAction(idx, "action_value", e.target.value)} required />
                </>
              )}

              {form.actions.length > 1 && (
                <button className="btn danger" type="button" onClick={() => removeAction(idx)}>Supprimer action</button>
              )}
            </div>
          ))}

          <button className="btn secondary" type="button" onClick={addAction}>+ Ajouter une action</button>
          <button type="submit" disabled={loading}>{loading ? "Création..." : "Créer le service"}</button>
        </form>
      )}

      {!canManage && logged && user?.role === "enfant" && (
        <div className="alert info">Le mode enfant peut consulter les services mais ne peut pas en créer.</div>
      )}

      <p className="muted-text"><strong>{services.length}</strong> service(s) trouvé(s)</p>

      <div className="cards">
        {services.map((s) => (
          <div key={s.id} className="card">
            <p className="icon" aria-hidden="true">{ICONS[s.type] || "🔧"}</p>
            <h3>{s.name}</h3>
            <p>{s.description.slice(0, 100)}{s.description.length > 100 ? "…" : ""}</p>
            <p><strong>Type :</strong> {s.type_display}</p>
            <p><strong>Actions :</strong> {s.actions?.length || 0}</p>
            {Array.isArray(s.related_device_names) && s.related_device_names.length > 0 && (
              <p><strong>Objets :</strong> {s.related_device_names.join(", ")}</p>
            )}
            <span className={"badge " + (s.active ? "on" : "off")}>{s.active ? "Actif" : "Inactif"}</span>
            <div className="action-row">
              <Link className="btn ghost" to={`/services/${s.id}`}>Détails</Link>
              {canManage && (
                <button className="btn" onClick={() => runService(s.id)} type="button">Exécuter</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
