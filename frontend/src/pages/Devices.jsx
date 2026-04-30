import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { API_URL, isLoggedIn } from "../api";

const TYPES = [
  ["thermostat","Thermostat"],["camera","Caméra"],["alarme","Alarme"],
  ["lave_linge","Lave-linge"],["lave_vaisselle","Lave-vaisselle"],
  ["television","Télévision"],["aspirateur","Aspirateur"],
  ["volet","Volet"],["porte","Porte"],["climatiseur","Climatiseur"],
  ["machine_cafe","Machine à café"],["arrosage","Arrosage"],
  ["enceinte","Enceinte"],["detecteur","Détecteur mouvement"],
];

export default function Devices() {
  const nav = useNavigate();
  const [devices, setDevices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    type: "", room: "", category: "", status: "", q: "",
  });
  const logged = isLoggedIn();

  useEffect(() => {
    API.get("/rooms/")
      .then((r) => setRooms(r.data))
      .catch(async () => {
        try {
          const res = await fetch(`${API_URL}/rooms/`);
          if (res.ok) setRooms(await res.json());
        } catch {}
      });

    API.get("/categories/")
      .then((r) => setCategories(r.data))
      .catch(async () => {
        try {
          const res = await fetch(`${API_URL}/categories/`);
          if (res.ok) setCategories(await res.json());
        } catch {}
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const qs = params.toString();
    API.get("/devices/?" + qs)
      .then((r) => setDevices(r.data))
      .catch(async () => {
        try {
          const res = await fetch(`${API_URL}/devices/${qs ? `?${qs}` : ""}`);
          if (res.ok) setDevices(await res.json());
          else setDevices([]);
        } catch {
          setDevices([]);
        }
      });
  }, [filters]);

  const set = (k, v) => setFilters({ ...filters, [k]: v });

  const CardContent = ({ d }) => (
    <>
      <h3>{d.name}</h3>
      <p><strong>Type :</strong> {d.type_display}</p>
      <p><strong>Pièce :</strong> {d.room_name || "—"}</p>
      <p><strong>Marque :</strong> {d.brand || "—"}</p>
      <p><strong>Batterie :</strong> {d.battery}%</p>
      <p>
        <span className={"badge " + d.status}>{d.status_display}</span>
        {d.needs_maintenance && (
          <span className="badge warning ml-xs">⚠ maintenance</span>
        )}
      </p>
    </>
  );

  return (
    <main className="container" id="main">
      <h1>Objets connectés</h1>
      {!logged && (
        <div className="alert info">
          🔒 Vous êtes en mode visiteur. <Link to="/login">Connectez-vous</Link>{" "}
          ou <Link to="/register">inscrivez-vous</Link> pour piloter/modifier les objets.
        </div>
      )}

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
              <CardContent d={d} />
              {!logged && <p className="card-note">🔒 Connectez-vous pour piloter cet objet</p>}
            </Link>
        ))}
      </div>
    </main>
  );
}
