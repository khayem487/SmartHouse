import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

export default function MyRequests() {
  const [requests, setRequests] = useState([]);

  const load = () => API.get("/deletion-requests/").then((r) => setRequests(r.data));
  useEffect(() => { load(); }, []);

  return (
    <main className="container" id="main">
      <h1>Mes demandes de suppression</h1>
      <p>
        Retrouvez ici l'état de toutes vos demandes de suppression d'objets.
        L'administrateur les traite depuis son panneau.
      </p>

      {requests.length === 0 ? (
        <div className="alert info">Aucune demande pour le moment.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Objet</th>
                <th>Motif</th>
                <th>Statut</th>
                <th>Date demande</th>
                <th>Date traitement</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.device_name}</td>
                  <td>{r.reason || "—"}</td>
                  <td>
                    <span className={"badge " + r.status}>{r.status_display}</span>
                  </td>
                  <td>{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                  <td>{r.resolved_at ? new Date(r.resolved_at).toLocaleString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "1.5rem" }}>
        <Link to="/devices" className="btn ghost">← Retour aux objets</Link>
      </p>
    </main>
  );
}
