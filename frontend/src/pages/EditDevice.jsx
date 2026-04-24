import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

const TYPES = [
  ["thermostat","Thermostat"],["camera","Caméra"],["alarme","Alarme"],
  ["lave_linge","Lave-linge"],["lave_vaisselle","Lave-vaisselle"],
  ["television","Télévision"],["aspirateur","Aspirateur"],
  ["volet","Volet"],["porte","Porte"],["climatiseur","Climatiseur"],
  ["machine_cafe","Machine à café"],["arrosage","Arrosage"],
  ["enceinte","Enceinte"],["detecteur","Détecteur mouvement"],
];

export default function EditDevice() {
  const { id } = useParams();
  const nav = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/rooms/").then((r) => setRooms(r.data));
    API.get("/categories/").then((r) => setCategories(r.data));
    API.get(`/devices/${id}/`).then((r) => setForm(r.data));
  }, [id]);

  if (!form) return <main className="container"><p>Chargement…</p></main>;

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...form };
      // Clean read-only fields
      delete payload.room_name; delete payload.type_display;
      delete payload.status_display; delete payload.category_name;
      delete payload.needs_maintenance;
      // Normalize empty strings to null
      if (payload.room === "") payload.room = null;
      if (payload.category === "") payload.category = null;
      if (payload.start_time === "") payload.start_time = null;
      if (payload.end_time === "") payload.end_time = null;
      if (payload.last_maintenance === "") payload.last_maintenance = null;
      await API.put(`/devices/${id}/`, payload);
      nav(`/devices/${id}`);
    } catch (err) {
      setError(JSON.stringify(err.response?.data || err.message));
    }
  };

  return (
    <main className="container" id="main">
      <form className="form" onSubmit={submit} style={{ maxWidth: 700 }}>
        <h2>Modifier l'objet</h2>

        <label htmlFor="n">Nom</label>
        <input id="n" value={form.name} onChange={(e) => set("name", e.target.value)} required />

        <label htmlFor="t">Type</label>
        <select id="t" value={form.type} onChange={(e) => set("type", e.target.value)}>
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <label htmlFor="c">Catégorie</label>
        <select id="c" value={form.category || ""} onChange={(e) => set("category", e.target.value)}>
          <option value="">— Aucune —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>

        <label htmlFor="r">Pièce</label>
        <select id="r" value={form.room || ""} onChange={(e) => set("room", e.target.value)}>
          <option value="">— Aucune —</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <label htmlFor="b">Marque</label>
        <input id="b" value={form.brand || ""} onChange={(e) => set("brand", e.target.value)} />

        <label htmlFor="d">Description</label>
        <textarea id="d" value={form.description || ""}
                  onChange={(e) => set("description", e.target.value)} />

        <label htmlFor="bat">Batterie (%)</label>
        <input id="bat" type="number" min="0" max="100" value={form.battery}
               onChange={(e) => set("battery", parseInt(e.target.value) || 0)} />

        <label htmlFor="v">Valeur courante</label>
        <input id="v" type="number" step="0.1" value={form.value}
               onChange={(e) => set("value", parseFloat(e.target.value) || 0)} />

        <label htmlFor="tv">Valeur cible</label>
        <input id="tv" type="number" step="0.1" value={form.target_value}
               onChange={(e) => set("target_value", parseFloat(e.target.value) || 0)} />

        <label htmlFor="st">Horaire de début</label>
        <input id="st" type="time" value={form.start_time || ""}
               onChange={(e) => set("start_time", e.target.value)} />

        <label htmlFor="et">Horaire de fin</label>
        <input id="et" type="time" value={form.end_time || ""}
               onChange={(e) => set("end_time", e.target.value)} />

        <label htmlFor="lm">Dernière maintenance</label>
        <input id="lm" type="date" value={form.last_maintenance || ""}
               onChange={(e) => set("last_maintenance", e.target.value)} />

        <label htmlFor="s">État</label>
        <select id="s" value={form.status} onChange={(e) => set("status", e.target.value)}>
          <option value="off">Inactif</option>
          <option value="on">Actif</option>
        </select>

        <button type="submit">Enregistrer</button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </main>
  );
}
