import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { refreshUser } from "../api";

const LEVELS = [
  { key: "debutant",      name: "Débutant",      min: 0,  desc: "Expérience acquise en classe ou en scénarios expérimentaux. Besoin d'aide." },
  { key: "intermediaire", name: "Intermédiaire", min: 5,  desc: "Tâches accomplies de manière autonome. Aide ponctuelle d'un expert." },
  { key: "avance",        name: "Avancé",        min: 10, desc: "Actions sans assistance. Reconnu comme la personne à qui demander. Module Gestion débloqué." },
  { key: "expert",        name: "Expert",        min: 15, desc: "Reconnu comme expert. Peut conseiller, résoudre des problèmes." },
];

export default function LevelChange() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { refreshUser().then(setMe); }, []);

  if (!me) return <main className="container"><p>Chargement…</p></main>;

  const choose = async (level) => {
    setMsg(""); setErr("");
    try {
      await API.post("/profile/set-level/", { level });
      const updated = await refreshUser();
      setMe(updated);
      setMsg(`Niveau changé vers ${level} ✔`);
      setTimeout(() => nav("/dashboard"), 1500);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Erreur");
    }
  };

  const canChoose = (lvl) => (me.points || 0) >= lvl.min;

  return (
    <main className="container" id="main">
      <h1>Choisir mon niveau</h1>
      <p>Tes points actuels : <strong>{me.points?.toFixed(2)}</strong></p>
      <p>Tu peux choisir tout niveau pour lequel tu as assez de points.</p>

      {msg && <div className="alert success" role="status">{msg}</div>}
      {err && <div className="alert error" role="alert">{err}</div>}

      <div className="cards">
        {LEVELS.map((l) => {
          const isCurrent = me.level === l.key;
          const unlocked = canChoose(l);
          return (
            <article key={l.key} className="card"
                     style={isCurrent ? { borderLeft: "4px solid #059669" } : {}}>
              <h3>{l.name} {isCurrent && "⭐"}</h3>
              <p><strong>Points requis :</strong> {l.min}</p>
              <p>{l.desc}</p>
              {isCurrent ? (
                <span className="badge info">Niveau actuel</span>
              ) : unlocked ? (
                <button className="btn" onClick={() => choose(l.key)}>
                  Choisir ce niveau
                </button>
              ) : (
                <span className="badge off">🔒 Pas assez de points ({l.min - (me.points || 0)} en moins)</span>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
