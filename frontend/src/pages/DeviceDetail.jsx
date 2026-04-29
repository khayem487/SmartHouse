import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API, { isAdvanced, isAdmin, isChild } from "../api";
import { dash } from "../utils";

export default function DeviceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showReq, setShowReq] = useState(false);
  const [reason, setReason] = useState("");
  const advanced = isAdvanced();
  const admin = isAdmin();
  const child = isChild();

  const load = () => API.get(`/devices/${id}/`)
    .then((r) => setD(r.data))
    .catch(() => setError("Objet introuvable."));

  useEffect(() => { load(); }, [id]);

  const toggle = async () => {
    if (childCannotToggle) return;
    setError("");
    setBusy(true);
    try {
      await API.post(`/devices/${id}/toggle/`);
      setMsg("État modifié ✔");
      await load();
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur");
      setTimeout(() => setError(""), 3500);
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action, value = null) => {
    if (childCannotToggle) return;
    setError("");
    setBusy(true);
    try {
      const payload = { action };
      if (value !== null && value !== undefined) payload.value = value;
      await API.post(`/devices/${id}/toggle/`, payload);
      setMsg("Commande appliquée ✔");
      await load();
      setTimeout(() => setMsg(""), 2200);
    } catch (err) {
      setError(err.response?.data?.detail || "Commande impossible");
      setTimeout(() => setError(""), 3500);
    } finally {
      setBusy(false);
    }
  };

  const deleteDirect = async () => {
    if (!confirm(`Supprimer définitivement "${d.name}" ?`)) return;
    await API.delete(`/devices/${id}/`);
    nav("/devices");
  };

  const requestDeletion = async (e) => {
    e.preventDefault();
    await API.post("/deletion-requests/", { device: id, reason });
    setMsg("Demande envoyée à l'administrateur ✔");
    setShowReq(false);
    setReason("");
    setTimeout(() => setMsg(""), 3000);
  };

  if (error && !d) return <main className="container"><div className="alert error">{error}</div></main>;
  if (!d) return <main className="container"><p>Chargement…</p></main>;

  const horaire = (d.start_time || d.end_time)
    ? `${d.start_time || "—"} → ${d.end_time || "—"}`
    : "—";

  // Un enfant ne peut PAS toggle les objets de sécurité
  const childCannotToggle = child && d.is_security;

  const renderSmartControls = () => {
    if (!advanced) return null;

    if (d.type === "thermostat") {
      return (
        <div className="action-row">
          <button className="btn" disabled={busy} onClick={() => runAction("decrease")}>− 1°C</button>
          <button className="btn" disabled={busy} onClick={() => runAction("increase")}>+ 1°C</button>
          <button className="btn ghost" disabled={busy} onClick={() => runAction("set_value", 19)}>Eco 19°C</button>
          <button className="btn ghost" disabled={busy} onClick={() => runAction("set_value", 21)}>Confort 21°C</button>
        </div>
      );
    }

    if (d.type === "climatiseur") {
      return (
        <div className="action-row">
          <button className="btn" disabled={busy} onClick={() => runAction("decrease")}>− 1°C</button>
          <button className="btn" disabled={busy} onClick={() => runAction("increase")}>+ 1°C</button>
          <button className="btn ghost" disabled={busy} onClick={() => runAction("mode_froid")}>Mode Froid</button>
          <button className="btn ghost" disabled={busy} onClick={() => runAction("mode_chaud")}>Mode Chaud</button>
        </div>
      );
    }

    if (d.type === "volet") {
      return (
        <div className="action-row">
          <button className="btn" disabled={busy} onClick={() => runAction("open")}>Ouvrir</button>
          <button className="btn secondary" disabled={busy} onClick={() => runAction("set_value", 50)}>50%</button>
          <button className="btn danger" disabled={busy} onClick={() => runAction("close")}>Fermer</button>
        </div>
      );
    }

    if (d.type === "machine_cafe") {
      return (
        <div className="action-row">
          <button className="btn" disabled={busy} onClick={() => runAction("prepare")}>Préparer</button>
          <button className="btn ghost" disabled={busy} onClick={() => runAction("intensity", 1)}>Léger</button>
          <button className="btn ghost" disabled={busy} onClick={() => runAction("intensity", 2)}>Normal</button>
          <button className="btn ghost" disabled={busy} onClick={() => runAction("intensity", 3)}>Fort</button>
        </div>
      );
    }

    if (d.type === "aspirateur") {
      return (
        <div className="action-row">
          <button className="btn" disabled={busy} onClick={() => runAction("eco")}>Mode Eco</button>
          <button className="btn secondary" disabled={busy} onClick={() => runAction("turbo")}>Mode Turbo</button>
          <button className="btn danger" disabled={busy} onClick={() => runAction("stop")}>Stop</button>
        </div>
      );
    }

    if (d.type === "lave_linge") {
      return (
        <div className="action-row">
          <button className="btn" disabled={busy} onClick={() => runAction("eco")}>Eco</button>
          <button className="btn secondary" disabled={busy} onClick={() => runAction("rapide")}>Rapide</button>
          <button className="btn danger" disabled={busy} onClick={() => runAction("intensif")}>Intensif</button>
        </div>
      );
    }

    if (d.type === "alarme") {
      return (
        <div className="action-row">
          <button className="btn" disabled={busy || childCannotToggle} onClick={() => runAction("activate")}>Armer</button>
          <button className="btn secondary" disabled={busy || childCannotToggle} onClick={() => runAction("deactivate")}>Désarmer</button>
          <button className="btn danger" disabled={busy || childCannotToggle} onClick={() => runAction("panic")}>PANIC</button>
        </div>
      );
    }

    return (
      <div className="action-row">
        <button className="btn" onClick={toggle} disabled={busy || childCannotToggle}>
          {d.status === "on" ? "⏻ Désactiver" : "⏼ Activer"}
        </button>
      </div>
    );
  };

  return (
    <main className="container" id="main">
      <Link to="/devices">← Retour à la liste</Link>
      <h1>{d.name}</h1>

      {msg && <div className="alert success" role="status">{msg}</div>}
      {error && d && <div className="alert error" role="alert">{error}</div>}

      {d.needs_maintenance && (
        <div className="alert warning">
          ⚠ Cet objet nécessite une maintenance (batterie faible ou révision dépassée).
        </div>
      )}

      <article className="card details-card">
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
          <span className={"badge " + d.status + " ml-sm"}>{d.status_display}</span>
        </p>
        <p><strong>Créé le :</strong> {new Date(d.created_at).toLocaleString("fr-FR")}</p>

        {advanced && (
          <>
            <h3 className="mt-1">Commandes rapides</h3>
            {renderSmartControls()}

            <div className="action-row">
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
          </>
        )}
      </article>

      {showReq && !admin && (
        <form className="form mt-1" onSubmit={requestDeletion}>
          <h3>Demande de suppression</h3>
          <p className="meta-text">
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
