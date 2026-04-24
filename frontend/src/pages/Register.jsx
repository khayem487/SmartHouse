import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";

export default function Register() {
  const [form, setForm] = useState({
    username: "", email: "", password: "",
    first_name: "", last_name: "",
    age: 18, gender: "N", date_naissance: "",
    role: "parent",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const nav = useNavigate();

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await API.post("/register/", form);
      setOk(true);
      setTimeout(() => nav("/login"), 2000);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data, null, 2) : "Erreur inscription.");
    }
  };

  return (
    <main className="container" id="main">
      <form className="form" onSubmit={submit} aria-labelledby="reg-title">
        <h2 id="reg-title">Inscription</h2>
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          Seuls les membres de la maison peuvent s'inscrire.
          Un email de validation vous sera envoyé (simulé ici).
        </p>

        <label htmlFor="u">Nom d'utilisateur (pseudo)</label>
        <input id="u" value={form.username} onChange={(e) => set("username", e.target.value)} required />

        <label htmlFor="e">Email</label>
        <input id="e" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />

        <label htmlFor="p">Mot de passe (4+ caractères)</label>
        <input id="p" type="password" value={form.password}
               onChange={(e) => set("password", e.target.value)}
               required minLength={4} autoComplete="new-password" />

        <label htmlFor="fn">Prénom</label>
        <input id="fn" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />

        <label htmlFor="ln">Nom</label>
        <input id="ln" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />

        <label htmlFor="age">Âge</label>
        <input id="age" type="number" value={form.age}
               onChange={(e) => set("age", parseInt(e.target.value) || 0)} min={1} />

        <label htmlFor="g">Genre</label>
        <select id="g" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
          <option value="N">Non précisé</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </select>

        <label htmlFor="dn">Date de naissance</label>
        <input id="dn" type="date" value={form.date_naissance}
               onChange={(e) => set("date_naissance", e.target.value)} />

        <label htmlFor="r">Rôle dans la maison</label>
        <select id="r" value={form.role} onChange={(e) => set("role", e.target.value)}>
          <option value="parent">Parent</option>
          <option value="enfant">Enfant</option>
          <option value="visiteur">Visiteur</option>
        </select>

        <button type="submit">S'inscrire</button>
        {error && <pre className="error" role="alert" style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>{error}</pre>}
        {ok && <p className="success" role="status">✔ Inscription réussie. Email de validation envoyé (simulé). Redirection…</p>}
        <p style={{ marginTop: "1rem", textAlign: "center" }}>
          Déjà un compte ? <Link to="/login">Connectez-vous</Link>
        </p>
      </form>
    </main>
  );
}
