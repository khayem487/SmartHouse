import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API, { isChild } from "../api";

export default function ServiceDetail() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const child = isChild();

  const load = () => API.get(`/services/${id}/`)
    .then((r) => setS(r.data))
    .catch(() => setError("Service introuvable."));

  useEffect(() => { load(); }, [id]);

  const toggle = async (action) => {
    setError(""); setMsg("");
    setBusy(true);
    try {
      const { data } = await API.post(`/services/${id}/toggle/`, { action });
      setMsg(data.detail);
      load();
      setTimeout(() => setMsg(""), 3500);
    } catch (ex) {
      setError(ex.response?.data?.detail || "Erreur lors de l'action.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setBusy(false);
    }
  };

  if (error && !s) return <main className="container"><div className="alert error">{error}</div></main>;
  if (!s) return <main className="container"><p>Chargement…</p></main>;

  const devices = s.related_devices_info || [];
  const allOn = s.all_devices_on;
  const childBlocked = child && s.has_security_device;

  return (
    <main className="container" id="main">
      <Link to="/services">Retour aux services</Link>
      <h1>{s.name}</h1>

      {msg && <div className="alert success" role="status">{msg}</div>}
      {error && <div className="alert error" role="alert">{error}</div>}

      <article className="card" style={{ maxWidth: 800 }}>
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
        <p><strong>Créé le :</strong> {new Date(s.created_at).toLocaleString("fr-FR")}</p>

        {/* Boutons d'action */}
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
                        disabled={busy || (devices.every(d => d.status === "off"))}>
                  {busy ? "..." : "Tout désactiver"}
                </button>
              </>
            )}
          </div>
        )}
      </article>

      {/* Liste des objets liés */}
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
