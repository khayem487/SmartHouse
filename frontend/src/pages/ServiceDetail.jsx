import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API, { getUser, isLoggedIn } from "../api";

export default function ServiceDetail() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const user = getUser();
  const canRun = isLoggedIn() && user?.role !== "enfant";

  const load = () => API.get(`/services/${id}/`)
    .then((r) => setS(r.data))
    .catch(() => setError("Service introuvable."));

  useEffect(() => { load(); }, [id]);

  const runService = async () => {
    setError("");
    setMsg("");
    try {
      const { data } = await API.post(`/services/${id}/run/`);
      setMsg(data?.detail || "Service exécuté ✔");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible d'exécuter ce service.");
    }
  };

  if (error && !s) return <main className="container"><div className="alert error">{error}</div></main>;
  if (!s) return <main className="container"><p>Chargement…</p></main>;

  return (
    <main className="container" id="main">
      <Link to="/services">← Retour aux services</Link>
      <h1>{s.name}</h1>
      {msg && <div className="alert success">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      <article className="card details-card">
        <p><strong>Type :</strong> {s.type_display}</p>
        <p><strong>Statut :</strong>
          <span className={"badge " + (s.active ? "on" : "off") + " ml-sm"}>
            {s.active ? "Actif" : "Inactif"}
          </span>
        </p>
        <p><strong>Description :</strong></p>
        <p>{s.description}</p>

        <p><strong>Actions configurées :</strong> {s.actions?.length || 0}</p>
        {s.actions?.length > 0 && (
          <ul style={{ marginTop: "0.4rem", paddingLeft: "1rem" }}>
            {s.actions.map((a) => (
              <li key={a.id}>
                {a.device_name} → {a.action_type}
                {a.action_value != null ? ` (${a.action_value})` : ""}
              </li>
            ))}
          </ul>
        )}

        {Array.isArray(s.related_device_names) && s.related_device_names.length > 0 && (
          <p><strong>Objets liés :</strong> {s.related_device_names.join(", ")}</p>
        )}

        {canRun && <button className="btn" type="button" onClick={runService}>Exécuter ce service</button>}
        <p><strong>Créé le :</strong> {new Date(s.created_at).toLocaleString("fr-FR")}</p>
      </article>
    </main>
  );
}
