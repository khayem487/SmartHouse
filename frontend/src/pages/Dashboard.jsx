import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { refreshUser } from "../api";

const LEVEL_LABEL = {
  debutant: "Débutant", intermediaire: "Intermédiaire",
  avance: "Avancé", expert: "Expert",
};
const LEVEL_THRESHOLDS = [
  { name: "Débutant",      min: 0,  key: "debutant" },
  { name: "Intermédiaire", min: 5,  key: "intermediaire" },
  { name: "Avancé",        min: 10, key: "avance" },
  { name: "Expert",        min: 15, key: "expert" },
];

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    refreshUser().then(setProfile);
    API.get("/actions/me/").then((r) => {
      // Dédoublonnage par id au cas où
      const unique = Array.from(new Map(r.data.map((a) => [a.id, a])).values());
      unique.sort((a, b) => new Date(b.date) - new Date(a.date));
      setActions(unique);
    });
  }, []);

  if (!profile) return <main className="container"><p>Chargement…</p></main>;

  const pts = profile.points || 0;
  const nextLevel = LEVEL_THRESHOLDS.find((l) => l.min > pts);
  const progress = nextLevel ? Math.min(100, (pts / nextLevel.min) * 100) : 100;

  return (
    <main className="container" id="main">
      <h1>Tableau de bord</h1>
      <p>Bonjour <strong>{profile.first_name || profile.username}</strong> 👋</p>

      <section aria-labelledby="stats-title">
        <h2 id="stats-title">Vue d'ensemble</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <p className="value">{pts.toFixed(2)}</p>
            <p className="label">Points cumulés</p>
          </div>
          <div className="stat-box">
            <p className="value">{LEVEL_LABEL[profile.level]}</p>
            <p className="label">Niveau actuel</p>
          </div>
          <div className="stat-box">
            <p className="value">{profile.nb_connexions}</p>
            <p className="label">Connexions</p>
          </div>
          <div className="stat-box">
            <p className="value">{profile.nb_actions}</p>
            <p className="label">Actions</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="progress-title">
        <h2 id="progress-title">Progression</h2>
        <div className="level-bar" role="progressbar"
             aria-valuenow={pts} aria-valuemin={0} aria-valuemax={nextLevel?.min || 15}>
          <div className="level-bar-fill" style={{ width: progress + "%" }} />
        </div>
        {nextLevel ? (
          <p>Encore <strong>{(nextLevel.min - pts).toFixed(2)}</strong> points
             pour atteindre <strong>{nextLevel.name}</strong>.</p>
        ) : (
          <p>🏆 Niveau maximum atteint !</p>
        )}
        <Link to="/level" className="btn">Changer de niveau</Link>
      </section>

      <section aria-labelledby="hist-title">
        <h2 id="hist-title">Historique récent</h2>
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          {actions.length} action(s) au total — 15 plus récentes affichées.
        </p>
        {actions.length === 0 ? (
          <p>Aucune action récente.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Action</th><th>Description</th><th>Date</th></tr>
              </thead>
              <tbody>
                {actions.slice(0, 15).map((a) => (
                  <tr key={a.id}>
                    <td>{a.action_type_display || a.action_type}</td>
                    <td>{a.description}</td>
                    <td>{new Date(a.date).toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
