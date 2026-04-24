import { useEffect, useState } from "react";
import API, { API_URL } from "../api";

export default function Stats() {
  const [s, setS] = useState(null);

  useEffect(() => {
    API.get("/stats/summary/").then((r) => setS(r.data));
  }, []);

  const downloadCSV = async (endpoint, filename) => {
    const res = await API.get(endpoint, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!s) return <main className="container"><p>Chargement…</p></main>;

  const maxType = Math.max(...Object.values(s.devices_by_type || {}), 1);
  const maxRoom = Math.max(...Object.values(s.devices_by_room || {}), 1);

  return (
    <main className="container" id="main">
      <h1>Statistiques de la maison</h1>

      <section aria-labelledby="sum-t">
        <h2 id="sum-t">Résumé</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <p className="value">{s.total_devices}</p>
            <p className="label">Objets connectés</p>
          </div>
          <div className="stat-box">
            <p className="value">{s.active_devices}</p>
            <p className="label">Objets actifs</p>
          </div>
          <div className="stat-box">
            <p className="value">{s.total_consumption_kwh}</p>
            <p className="label">Conso totale (kWh)</p>
          </div>
          <div className="stat-box">
            <p className="value">{s.maintenance_count}</p>
            <p className="label">Maintenance requise</p>
          </div>
          <div className="stat-box">
            <p className="value">{s.total_users}</p>
            <p className="label">Utilisateurs</p>
          </div>
          <div className="stat-box">
            <p className="value">{s.total_connexions}</p>
            <p className="label">Connexions totales</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="type-t">
        <h2 id="type-t">Répartition par type</h2>
        <div style={{ background: "white", padding: "1.3rem", borderRadius: 12 }}>
          {Object.entries(s.devices_by_type || {}).map(([type, count]) => (
            <div key={type} style={{ marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{type}</span>
                <span><strong>{count}</strong></span>
              </div>
              <div style={{ background: "#e5e7eb", borderRadius: 4, height: 10 }}>
                <div style={{
                  background: "#4f46e5",
                  width: `${(count / maxType) * 100}%`,
                  height: "100%", borderRadius: 4,
                }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="room-t">
        <h2 id="room-t">Répartition par pièce</h2>
        <div style={{ background: "white", padding: "1.3rem", borderRadius: 12 }}>
          {Object.entries(s.devices_by_room || {}).map(([room, count]) => (
            <div key={room} style={{ marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{room}</span>
                <span><strong>{count}</strong></span>
              </div>
              <div style={{ background: "#e5e7eb", borderRadius: 4, height: 10 }}>
                <div style={{
                  background: "#059669",
                  width: `${(count / maxRoom) * 100}%`,
                  height: "100%", borderRadius: 4,
                }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="exp-t">
        <h2 id="exp-t">Exports</h2>
        <button className="btn" onClick={() => downloadCSV("/stats/export/devices/", "objets.csv")}>
          📥 Télécharger objets (CSV)
        </button>
        <button className="btn" onClick={() => downloadCSV("/stats/export/consumption/", "consommation.csv")}>
          📥 Télécharger consommation (CSV)
        </button>
      </section>
    </main>
  );
}
