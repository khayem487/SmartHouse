import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

export default function Maintenance() {
  const [devices, setDevices] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => API.get("/maintenance/").then((r) => setDevices(r.data));
  useEffect(() => { load(); }, []);

  const repair = async (id, name) => {
    if (!confirm(`Confirmer la maintenance de "${name}" ?`)) return;
    await API.post(`/devices/${id}/repair/`);
    setMsg(`✔ ${name} réparé (batterie rechargée, maintenance datée d'aujourd'hui)`);
    load();
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <main className="container" id="main">
      <h1>⚠ Objets nécessitant une maintenance</h1>
      <p>
        Sont listés les objets dont la batterie est faible (&lt; 20 %)
        ou dont la dernière maintenance date de plus de 6 mois.
      </p>

      {msg && <div className="alert success" role="status">{msg}</div>}

      {devices.length === 0 ? (
        <div className="alert success">
          ✔ Tous les objets sont en bon état, aucune maintenance requise.
        </div>
      ) : (
        <div className="cards">
          {devices.map((d) => (
            <article key={d.id} className="card"
                     style={{ borderLeft: "4px solid #f59e0b" }}>
              <h3>{d.name}</h3>
              <p><strong>Type :</strong> {d.type_display}</p>
              <p><strong>Pièce :</strong> {d.room_name || "—"}</p>
              <p>
                <strong>Batterie :</strong>{" "}
                {d.battery < 20
                  ? <span className="badge off">{d.battery}% ⚠</span>
                  : ` ${d.battery}%`}
              </p>
              <p><strong>Dernière maintenance :</strong> {d.last_maintenance || "jamais"}</p>
              <div style={{ marginTop: 10 }}>
                <button className="btn success" onClick={() => repair(d.id, d.name)}>
                  🔧 Marquer comme réparé
                </button>
                <Link to={`/devices/${d.id}`} className="btn secondary">Voir détails</Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="alert info" style={{ marginTop: "1.5rem" }}>
        <strong>💡 Comment ça marche :</strong>
        <ul style={{ marginLeft: 20, marginTop: 5 }}>
          <li>🔧 "Marquer comme réparé" : recharge la batterie et remet la date de maintenance à aujourd'hui. L'objet sort de la liste.</li>
          <li>🗑 Pour supprimer un objet définitivement, allez sur la page de l'objet et utilisez "Demander suppression" (ou "Supprimer" si vous êtes admin).</li>
        </ul>
      </div>
    </main>
  );
}
