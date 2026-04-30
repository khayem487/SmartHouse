import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API, { isChild, isLoggedIn } from "../api";

const ACTION_LABELS = {
  turn_on: "Allumer",
  turn_off: "Éteindre",
  toggle: "Basculer",
  set_value: "Régler valeur",
  open: "Ouvrir",
  close: "Fermer",
};

export default function ServiceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const child = isChild();
  const logged = isLoggedIn();

  const load = () => API.get(`/services/${id}/`)
    .then((r) => setS(r.data))
    .catch((err) => {
      if (err?.response?.status === 401) {
        setError("Session expirée. Reconnecte-toi.");
        setTimeout(() => nav("/login"), 300);
        return;
      }
      setError("Service introuvable.");
    });

  useEffect(() => { load(); }, [id]);

  const toggle = async (action) => {
    setError(""); setMsg("");
    setBusy(true);
    try {
      const { data } = await API.post(`/services/${id}/toggle/`, { action });
      setMsg(data.detail);
      await load();
      setTimeout(() => setMsg(""), 3500);
    } catch (ex) {
      setError(ex.response?.data?.detail || "Erreur lors de l'action.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setBusy(false);
    }
  };

  const runDetailed = async () => {
    setError(""); setMsg("");
    setBusy(true);
    try {
      const { data } = await API.post(`/services/${id}/run/`, {});
      setMsg(data?.detail || "Service exécuté.");
      await load();
      setTimeout(() => setMsg(""), 3500);
    } catch (ex) {
      setError(ex.response?.data?.detail || "Erreur lors de l'exécution du service.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setBusy(false);
    }
  };

  if (error && !s) return <main className="container"><div className="alert error">{error}</div></main>;
  if (!s) return <main className="container"><p>Chargement…</p></main>;

  const devices = Array.isArray(s?.related_devices_info) ? s.related_devices_info : [];
  const actions = Array.isArray(s?.actions) ? s.actions : [];
  const allOn = s.all_devices_on;
  const childBlocked = child && s.has_security_device;
  const canRunDetailed = logged && !child;
  const deviceById = new Map(devices.map((d) => [d.id, d.name]));

  return (
    <main className="container" id="main">
      <Link to="/services">Retour aux services</Link>
      <h1>{s.name}</h1>

      {msg && <div className="alert success" role="status">{msg}</div>}
      {error && <div className="alert error" role="alert">{error}</div>}

      <article className="card" style={{ maxWidth: 900 }}>
        <p><strong>Type :</strong> {s.type_display}</p>
        <p><strong>Description :</strong></p>
        <p>{s.description}</p>
        <p>
          <strong>État global :</strong>
          <span className={"badge " + (allOn ? "on" : "off")} style={{ marginLeft: 8 }}>
            {devices.length === 0
              ? "Aucun objet lié"
              : (allOn ? "Tous les objets actifs" : "Inactif ou partiellement actif")}
          </span>
        </p>

        <p><strong>Actions configurées :</strong> {actions.length}</p>
        {actions.length > 0 ? (
          <ul style={{ marginTop: "0.4rem", paddingLeft: "1rem" }}>
            {actions.map((a) => (
              <li key={a.id}>
                {deviceById.get(a.device) || a.device_name || `Objet #${a.device}`} → {ACTION_LABELS[a.action_type] || a.action_type}
                {a.action_value != null ? ` (${a.action_value})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucune action détaillée configurée (mode basique on/off global).</p>
        )}

        <p><strong>Créé le :</strong> {new Date(s.created_at).toLocaleString("fr-FR")}</p>

        {devices.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            {childBlocked ? (
              <div className="alert info">
                Ce service contient des objets de sécurité. Réservé aux parents.
              </div>
            ) : (
              <>
                <button className="btn success"
                        onClick={() => toggle("on")}
                        disabled={busy || allOn}>
                  {busy ? "..." : "Tout activer"}
                </button>
                <button className="btn danger"
                        onClick={() => toggle("off")}
                        disabled={busy || (devices.length > 0 && devices.every(d => d.status === "off"))}>
                  {busy ? "..." : "Tout désactiver"}
                </button>
              </>
            )}
          </div>
        )}

        {actions.length > 0 && canRunDetailed && (
          <div style={{ marginTop: "0.8rem" }}>
            <button className="btn" onClick={runDetailed} disabled={busy}>
              {busy ? "..." : "Exécuter les actions détaillées"}
            </button>
          </div>
        )}
      </article>

      <h2>Objets liés à ce service ({devices.length})</h2>
      {devices.length === 0 ? (
        <p>Aucun objet lié à ce service.</p>
      ) : (
        <div className="cards">
          {devices.map((d) => (
            <Link key={d.id} to={`/devices/${d.id}`} className="card">
              <h3>{d.name}</h3>
              <p><strong>Type :</strong> {d.type_display}</p>
              <p>
                <span className={"badge " + d.status}>{d.status_display}</span>
                {d.is_security && (
                  <span className="badge info" style={{ marginLeft: 5 }}>Sécurité</span>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
