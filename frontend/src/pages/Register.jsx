import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    username: "", email: "", password: "",
    first_name: "", last_name: "",
    age: 18, gender: "N", date_naissance: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(null);
    setLoading(true);
    try {
      const { data } = await API.post("/register/", form);
      // Si OTP requis, redirige vers la page de vérification
      if (data.needs_mail) {
        nav(`/verify-otp?email=${encodeURIComponent(data.email)}`);
        return;
      }
      // Sinon affichage simple de confirmation
      setSuccess(data);
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === "string") setError(data);
      else if (data?.email) setError(Array.isArray(data.email) ? data.email[0] : data.email);
      else if (data?.username) setError("Pseudo : " + (Array.isArray(data.username) ? data.username[0] : data.username));
      else if (data?.password) setError("Mot de passe : " + (Array.isArray(data.password) ? data.password[0] : data.password));
      else setError("Erreur lors de l'inscription. Vérifiez vos informations.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="container" id="main">
        <div className="form" style={{ textAlign: "center" }}>
          <h2>Inscription réussie</h2>
          <div className="alert success" style={{ textAlign: "left" }}>
            <p>Bonjour <strong>{success.username}</strong>,</p>
            <p>Votre compte a été créé.</p>
            <p>Rôle attribué : <strong>{success.role}</strong></p>
            <p>{success.message}</p>
          </div>
          <p>
            <Link to="/login" className="btn">Aller à la page de connexion</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container" id="main">
      <form className="form" onSubmit={submit} aria-labelledby="reg-title">
        <h2 id="reg-title">Inscription</h2>

        <div className="alert info">
          <strong>Seuls les membres de la maison peuvent s'inscrire.</strong><br/>
          Votre email doit avoir été pré-autorisé par l'administrateur.
          Le rôle (parent ou enfant) est attribué automatiquement.
        </div>

        <label htmlFor="u">Nom d'utilisateur (pseudo)</label>
        <input id="u" value={form.username} onChange={(e) => set("username", e.target.value)} required />

        <label htmlFor="e">Email</label>
        <input id="e" type="email" value={form.email}
               onChange={(e) => set("email", e.target.value)} required
               placeholder="votre.email@exemple.com" />

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

        <button type="submit" disabled={loading}>
          {loading ? "Envoi…" : "S'inscrire"}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
        <p style={{ marginTop: "1rem", textAlign: "center" }}>
          Déjà un compte ? <Link to="/login">Connectez-vous</Link>
        </p>
      </form>
    </main>
  );
}
