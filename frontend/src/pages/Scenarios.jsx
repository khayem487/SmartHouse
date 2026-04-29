import { useEffect, useState } from "react";
import API from "../api";

export default function Scenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = () => API.get("/scenarios/").then((r) => setScenarios(r.data));

  useEffect(() => {
    load().catch(() => setError("Impossible de charger les scénarios."));
    const t = setInterval(() => {
      load().catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, []);

  const runScenario = async (id) => {
    setError("");
    try {
      const { data } = await API.post(`/scenarios/${id}/run/`);
      setMsg(data?.detail || "Scénario exécuté ✔");
      await load();
      setTimeout(() => setMsg(""), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur");
      setTimeout(() => setError(""), 3500);
    }
  };

  const setActive = async (s, active) => {
    setError("");
    try {
      await API.patch(`/scenarios/${s.id}/`, { active });
      setMsg(`${s.name} ${active ? "activé" : "désactivé"} ✔`);
      await load();
      setTimeout(() => setMsg(""), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur");
      setTimeout(() => setError(""), 3500);
    }
  };

  return (
    <main className="container" id="main">
      <h1>🧠 Scénarios domotiques</h1>
      <p>
        Scénarios automatiques actifs (horaire/device) + exécution manuelle.
        Les déclencheurs horaires sont exécutés automatiquement côté backend.
      </p>

      {msg && <div className="alert success">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      {scenarios.length === 0 ? (
        <div className="alert info">Aucun scénario.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Trigger</th>
                <th>Action</th>
                <th>Objet cible</th>
                <th>Statut</th>
                <th>Dernier run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong><br /><small>{s.description || "—"}</small></td>
                  <td>
                    {s.trigger_type}
                    {s.trigger_time ? <><br /><small>{s.trigger_time}</small></> : null}
                  </td>
                  <td>{s.action_type}{s.action_value != null ? ` (${s.action_value})` : ""}</td>
                  <td>{s.action_device_name || "—"}</td>
                  <td>
                    <span className={"badge " + (s.active ? "on" : "off")}>
                      {s.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>{s.last_run ? new Date(s.last_run).toLocaleString("fr-FR") : "—"}</td>
                  <td>
                    <button className="btn secondary" onClick={() => runScenario(s.id)} disabled={!s.active}>
                      ▶ Exécuter
                    </button>
                    {s.active ? (
                      <button className="btn danger" onClick={() => setActive(s, false)}>Désactiver</button>
                    ) : (
                      <button className="btn" onClick={() => setActive(s, true)}>Activer</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
