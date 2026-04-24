import { useEffect, useState } from "react";
import API from "../api";

export default function History() {
  const [actions, setActions] = useState([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    API.get("/actions/history/").then((r) => setActions(r.data));
  }, []);

  const filtered = filter
    ? actions.filter((a) =>
        (a.user_name || "").toLowerCase().includes(filter.toLowerCase()) ||
        (a.device_name || "").toLowerCase().includes(filter.toLowerCase()) ||
        (a.action_type || "").toLowerCase().includes(filter.toLowerCase()))
    : actions;

  return (
    <main className="container" id="main">
      <h1>Historique global des objets</h1>
      <p>Toutes les actions effectuées sur les objets connectés par les utilisateurs.</p>

      <div className="filters">
        <input placeholder="🔎 Filtrer par utilisateur, objet ou action…"
               value={filter} onChange={(e) => setFilter(e.target.value)}
               aria-label="Filtre" />
      </div>

      <p>{filtered.length} action(s)</p>

      {filtered.length === 0 ? (
        <p>Aucune action.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Utilisateur</th><th>Action</th>
                <th>Objet</th><th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.date).toLocaleString("fr-FR")}</td>
                  <td>{a.user_name}</td>
                  <td>{a.action_type_display || a.action_type}</td>
                  <td>{a.device_name || "—"}</td>
                  <td>{a.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
