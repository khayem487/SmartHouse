import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API, { isLoggedIn, isAdvanced } from "../api";

export default function DeviceDetail() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [showReq, setShowReq] = useState(false);
  const [reason, setReason] = useState("");
  const advanced = isAdvanced();

  const load = () => API.get(`/devices/${id}/`)
    .then((r) => setD(r.data))
    .catch(() => setError("Objet introuvable."));

  useEffect(() => { load(); }, [id]);

  const toggle = async () => {
    await API.post(`/devices/${id}/toggle/`);
    setMsg("État modifié ✔");
    load();
    setTimeout(() => setMsg(""), 2000);
  };

  const requestDeletion = async (e) => {
    e.preventDefault();
    await API.post("/deletion-requests/", { device: id, reason });
    setMsg("Demande de suppression envoyée à l'administrateur ✔");
    setShowReq(false);
    setReason("");
    setTimeout(() => setMsg(""), 3000);
  };

  if (error) return <main className="container"><div className="alert error">{error}</div></main>;
  if (!d) return <main className="container"><p>Chargement…</p></main>;

  return (
    <main className="container" id="main">
      <Link to="/devices">← Retour à la liste</Link>
      <h1>{d.name}</h1>

      {msg && <div className="alert success" role="status">{msg}</div>}
      {d.needs_maintenance && (
        <div className="alert warning">
          ⚠ Cet objet nécessite une maintenance (batterie faible ou révision dépassée).
        </div>
      )}

      <article className="card" style={{ maxWidth: 700 }}>
        <p><strong>Type :</strong> {d.type_display}</p>
        <p><strong>Catégorie :</strong> {d.category_name || "—"}</p>
        <p><strong>Pièce :</strong> {d.room_name || "—"}</p>
        <p><strong>Marque :</strong> {d.brand || "—"}</p>
        <p><strong>Description :</strong> {d.description || "—"}</p>
        <p><strong>Batterie :</strong> {d.battery}%</p>
        <p><strong>Valeur courante :</strong> {d.value}</p>
        <p><strong>Valeur cible :</strong> {d.target_value}</p>
        {(d.start_time || d.end_time) && (
          <p><strong>Horaire :</strong> {d.start_time || "—"} → {d.end_time || "—"}</p>
        )}
        <p><strong>Dernière maintenance :</strong> {d.last_maintenance || "—"}</p>
        <p><strong>État :</strong>
          <span className={"badge " + d.status} style={{ marginLeft: 8 }}>{d.status_display}</span>
        </p>
        <p><strong>Créé le :</strong> {new Date(d.created_at).toLocaleString("fr-FR")}</p>

        {isLoggedIn() && advanced && (
          <div style={{ marginTop: "1rem" }}>
            <button className="btn" onClick={toggle}>
              {d.status === "on" ? "⏻ Désactiver" : "⏼ Activer"}
            </button>
            <Link to={`/devices/${id}/edit`} className="btn secondary">✎ Modifier</Link>
            <button className="btn danger" onClick={() => setShowReq(!showReq)}>
              🗑 Demander suppression
            </button>
          </div>
        )}
        {!isLoggedIn() && (
          <p style={{ marginTop: 15, color: "#666" }}>
            <Link to="/login">Connectez-vous</Link> pour interagir avec cet objet.
          </p>
        )}
      </article>

      {showReq && (
        <form className="form" onSubmit={requestDeletion} style={{ marginTop: "1rem" }}>
          <h3>Demande de suppression</h3>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            Votre demande sera envoyée à l'administrateur pour validation.
          </p>
          <label htmlFor="reason">Motif (optionnel)</label>
          <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="submit">Envoyer la demande</button>
        </form>
      )}
    </main>
  );
}
