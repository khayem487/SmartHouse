import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API, { saveAuth } from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await API.post("/login/", { username, password });
      saveAuth(data);
      nav("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail
        || (Array.isArray(err.response?.data) ? err.response.data[0] : null)
        || "Identifiants invalides ou email non vérifié.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" id="main">
      <form className="form" onSubmit={submit} aria-labelledby="login-title">
        <h2 id="login-title">Connexion</h2>
        <label htmlFor="u">Nom d'utilisateur ou email</label>
        <input id="u" value={username} onChange={(e) => setUsername(e.target.value)}
               required autoComplete="username" placeholder="Pseudo ou email" />
        <label htmlFor="p">Mot de passe</label>
        <input id="p" type="password" value={password}
               onChange={(e) => setPassword(e.target.value)}
               required autoComplete="current-password" />
        <button type="submit" disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
        <p style={{ marginTop: "1rem", textAlign: "center" }}>
          Pas de compte ? <Link to="/register">Inscrivez-vous</Link>
        </p>
      </form>
    </main>
  );
}
