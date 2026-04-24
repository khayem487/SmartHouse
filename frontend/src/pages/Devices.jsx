import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

const TYPES = [
  ["thermostat","Thermostat"],["camera","Caméra"],["alarme","Alarme"],
  ["lave_linge","Lave-linge"],["lave_vaisselle","Lave-vaisselle"],
  ["television","Télévision"],["aspirateur","Aspirateur"],
  ["volet","Volet"],["porte","Porte"],["climatiseur","Climatiseur"],
  ["machine_cafe","Machine à café"],["arrosage","Arrosage"],
  ["enceinte","Enceinte"],["detecteur","Détecteur mouvement"],
];

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    type: "", room: "", category: "", status: "", q: "",
  });

  useEffect(() => {
    API.get("/rooms/").then((r) => setRooms(r.data));
    API.get("/categories/").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    API.get("/devices/?" + params.toString()).then((r) => setDevices(r.data));
  }, [filters]);

  const set = (k, v) => setFilters({ ...filters, [k]: v });

  return (
    <main className="container" id="main">
      <h1>Objets connectés</h1>

      <section aria-label="Filtres de recherche">
        <div className="filters">
          <input placeholder="🔎 Nom, description ou marque…" value={filters.q}
                 onChange={(e) => set("q", e.target.value)}
                 aria-label="Recherche texte" />
          <select value={filters.type} onChange={(e) => set("type", e.target.value)} aria-label="Type">
            <option value="">Tous les types</option>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filters.room} onChange={(e) => set("room", e.target.value)} aria-label="Pièce">
            <option value="">Toutes les pièces</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={filters.category} onChange={(e) => set("category", e.target.value)} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => set("status", e.target.value)} aria-label="État">
            <option value="">Tous les états</option>
            <option value="on">Actif</option>
            <option value="off">Inactif</option>
          </select>
        </div>
      </section>

      <p><strong>{devices.length}</strong> objet(s) trouvé(s)</p>

      <div className="cards">
        {devices.map((d) => (
          <Link key={d.id} to={`/devices/${d.id}`} className="card">
            <h3>{d.name}</h3>
            <p><strong>Type :</strong> {d.type_display}</p>
            <p><strong>Pièce :</strong> {d.room_name || "—"}</p>
            <p><strong>Marque :</strong> {d.brand || "—"}</p>
            <p><strong>Batterie :</strong> {d.battery}%</p>
            <p>
              <span className={"badge " + d.status}>{d.status_display}</span>
              {d.needs_maintenance && (
                <span className="badge warning" style={{ marginLeft: 5 }}>⚠ maintenance</span>
              )}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
