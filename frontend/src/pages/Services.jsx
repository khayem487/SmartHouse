import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { isLoggedIn } from "../api";

const TYPES = [
  ["energie", "Consommation énergétique"],
  ["securite", "Sécurité"],
  ["confort", "Confort"],
  ["divertissement", "Divertissement"],
  ["sante", "Santé & bien-être"],
];

export default function Services() {
  const nav = useNavigate();
  const [services, setServices] = useState([]);
  const [filters, setFilters] = useState({ type: "", active: "", q: "" });
  const logged = isLoggedIn();

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== "" && params.append(k, v));
    API.get("/services/?" + params.toString()).then((r) => setServices(r.data));
  }, [filters]);

  const set = (k, v) => setFilters({ ...filters, [k]: v });

  const handleClick = (id) => {
    if (logged) nav(`/services/${id}`);
    else nav("/login");
  };

  return (
    <main className="container" id="main">
      <h1>Services & outils SmartHouse</h1>
      <p>
        Chaque service regroupe plusieurs objets connectés.
        Activez ou désactivez tous les objets d'un service en un seul clic.
      </p>

      {!logged && (
        <div className="alert info">
          Vous êtes en mode visiteur. <Link to="/login">Connectez-vous</Link> pour consulter les détails et activer les services.
        </div>
      )}

      <section aria-label="Filtres">
        <div className="filters">
          <input placeholder="Recherche nom ou description" value={filters.q}
                 onChange={(e) => set("q", e.target.value)}
                 aria-label="Recherche texte" />
          <select value={filters.type} onChange={(e) => set("type", e.target.value)} aria-label="Type">
            <option value="">Tous les types</option>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filters.active} onChange={(e) => set("active", e.target.value)} aria-label="Statut">
            <option value="">Tous les statuts</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>
        </div>
      </section>

      <p><strong>{services.length}</strong> service(s) trouvé(s)</p>

      <div className="cards">
        {services.map((s) => {
          const nbDevices = s.related_devices_info?.length || 0;
          return (
            <article key={s.id} className="card"
                     role="button" tabIndex={0}
                     style={{ cursor: "pointer" }}
                     onClick={() => handleClick(s.id)}
                     onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick(s.id)}
                     aria-label={`Voir ${s.name}`}>
              <h3>{s.name}</h3>
              <p>{s.description.slice(0, 100)}{s.description.length > 100 ? "…" : ""}</p>
              <p><strong>Type :</strong> {s.type_display}</p>
              <p><strong>Objets liés :</strong> {nbDevices}</p>
              <span className={"badge " + (s.all_devices_on ? "on" : "off")}>
                {nbDevices === 0 ? "Aucun objet" : (s.all_devices_on ? "Tous actifs" : "Inactif / partiel")}
              </span>
            </article>
          );
        })}
      </div>
    </main>
  );
}
