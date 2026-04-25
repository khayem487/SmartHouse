import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { isAdmin } from "../api";

export default function AdminRequests() {
  const nav = useNavigate();
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isAdmin()) {
      nav("/dashboard");
      return;
    }
    load();
  }, []);

  const load = () => API.get("/deletion-requests/").then((r) => setRequests(r.data));

  const approve = async (id, deviceName) => {
    if (!confirm(`Supprimer définitivement "${deviceName}" ?\n\nCela supprimera l'objet ET la demande.`)) return;
    setErr(""); setMsg("");
    try {
      await API.post(`/deletion-requests/${id}/approve/`);
      setMsg(`✔ Objet "${deviceName}" supprimé. Demande traitée.`);
      load();
      setTimeout(() => setMsg(""), 3000);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Erreur");
    }
  };

  const reject = async (id, deviceName) => {
    if (!confirm(`Refuser la demande de suppression de "${deviceName}" ?`)) return;
    setErr(""); setMsg("");
    try {
      await API.post(`/deletion-requests/${id}/reject/`);
      setMsg(`✔ Demande pour "${deviceName}" refusée. L'objet est conservé.`);
      load();
      setTimeout(() => setMsg(""), 3000);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Erreur");
    }
  };

  if (!isAdmin()) return null;

  return (
    <main className="container" id="main">
      <h1>🛡 Gestion des demandes de suppression</h1>
      <p>
        En tant qu'administrateur, vous pouvez approuver (supprime l'objet)
        ou refuser chaque demande. Dans les deux cas, la demande disparaît
        ensuite de toutes les listes.
      </p>

      {msg && <div className="alert success" role="status">{msg}</div>}
      {err && <div className="alert error" role="alert">{err}</div>}

      {requests.length === 0 ? (
        <div className="alert info">Aucune demande en attente.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Objet</th>
                <th>Demandé par</th>
                <th>Motif</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.device_name}</strong></td>
                  <td>{r.requested_by_name}</td>
                  <td>{r.reason || "—"}</td>
                  <td>{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                  <td>
                    <button className="btn danger"
                            onClick={() => approve(r.id, r.device_name)}>
                      🗑 Supprimer
                    </button>
                    <button className="btn secondary"
                            onClick={() => reject(r.id, r.device_name)}>
                      ✖ Refuser
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "1.5rem" }}>
        <Link to="/dashboard" className="btn ghost">← Retour au tableau de bord</Link>
      </p>
    </main>
  );
}
