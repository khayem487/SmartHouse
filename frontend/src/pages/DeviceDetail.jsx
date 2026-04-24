import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API, { isAdvanced, isAdmin } from "../api";
import { dash } from "../utils";

export default function DeviceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [showReq, setShowReq] = useState(false);
  const [reason, setReason] = useState("");
  const advanced = isAdvanced();
  const admin = isAdmin();

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

  // Admin : suppression directe
  const deleteDirect = async () => {
    if (!confirm(`Supprimer définitivement "${d.name}" ?`)) return;
    await API.delete(`/devices/${id}/`);
    nav("/devices");
  };

  // Utilisateur avancé : demande de suppression
  const requestDeletion = async (e) => {
    e.preventDefault();
    await API.post("/deletion-requests/", { device: id, reason });
    setMsg("Demande envoyée à l'administrateur ✔");
    setShowReq(false);
    setReason("");
    setTimeout(() => setMsg(""), 3000);
  };

  if (error) return <main className="container"><div className="alert error">{error}</div></main>;
  if (!d) return <main className="container"><p>Chargement…</p></main>;

  const horaire = (d.start_time || d.end_time)
    ? `${d.start_time || "—"} → ${d.end_time || "—"}`
    : "—";

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
        <p><strong>Type :</strong> {dash(d.type_display)}</p>
        <p><strong>Catégorie :</strong> {dash(d.category_name)}</p>
        <p><strong>Pièce :</strong> {dash(d.room_name)}</p>
        <p><strong>Marque :</strong> {dash(d.brand)}</p>
        <p><strong>Description :</strong> {dash(d.description)}</p>
        <p><strong>Batterie :</strong> {d.battery}%</p>
        <p><strong>Valeur courante :</strong> {dash(d.value)}</p>
        <p><strong>Valeur cible :</strong> {dash(d.target_value)}</p>
        <p><strong>Horaire :</strong> {horaire}</p>
        <p><strong>Dernière maintenance :</strong> {dash(d.last_maintenance)}</p>
        <p><strong>État :</strong>
          <span className={"badge " + d.status} style={{ marginLeft: 8 }}>{d.status_display}</span>
        </p>
        <p><strong>Créé le :</strong> {new Date(d.created_at).toLocaleString("fr-FR")}</p>

        {advanced && (
          <div style={{ marginTop: "1rem" }}>
            <button className="btn" onClick={toggle}>
              {d.status === "on" ? "⏻ Désactiver" : "⏼ Activer"}
            </button>
            <Link to={`/devices/${id}/edit`} className="btn secondary">✎ Modifier</Link>
            {admin ? (
              <button className="btn danger" onClick={deleteDirect}>
                🗑 Supprimer (admin)
              </button>
            ) : (
              <button className="btn danger" onClick={() => setShowReq(!showReq)}>
                🗑 Demander suppression
              </button>
            )}
          </div>
        )}
      </article>

      {showReq && !admin && (
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
