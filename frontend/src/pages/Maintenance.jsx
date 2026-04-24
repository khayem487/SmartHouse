import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

export default function Maintenance() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    API.get("/maintenance/").then((r) => setDevices(r.data));
  }, []);

  return (
    <main className="container" id="main">
      <h1>⚠ Objets nécessitant une maintenance</h1>
      <p>Sont listés les objets dont la batterie est faible (&lt; 20 %)
        ou dont la dernière maintenance date de plus de 6 mois.</p>

      {devices.length === 0 ? (
        <div className="alert success">
          ✔ Tous les objets sont en bon état, aucune maintenance requise.
        </div>
      ) : (
        <div className="cards">
          {devices.map((d) => (
            <Link key={d.id} to={`/devices/${d.id}`} className="card"
                  style={{ borderLeft: "4px solid #f59e0b" }}>
              <h3>{d.name}</h3>
              <p><strong>Type :</strong> {d.type_display}</p>
              <p><strong>Pièce :</strong> {d.room_name || "—"}</p>
              <p><strong>Batterie :</strong>
                {d.battery < 20 ? (
                  <span className="badge off" style={{ marginLeft: 5 }}>{d.battery}% ⚠</span>
                ) : ` ${d.battery}%`}
              </p>
              <p><strong>Dernière maintenance :</strong> {d.last_maintenance || "jamais"}</p>
              <span className="badge warning">Maintenance requise</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
