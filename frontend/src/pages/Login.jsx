import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API, { saveAuth } from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await API.post("/login/", { username, password });
      saveAuth(data);
      nav("/dashboard");
    } catch {
      setError("Identifiants invalides.");
    }
  };

  return (
    <main className="container" id="main">
      <form className="form" onSubmit={submit} aria-labelledby="login-title">
        <h2 id="login-title">Connexion</h2>
        <label htmlFor="u">Nom d'utilisateur</label>
        <input id="u" value={username} onChange={(e) => setUsername(e.target.value)}
               required autoComplete="username" />
        <label htmlFor="p">Mot de passe</label>
        <input id="p" type="password" value={password}
               onChange={(e) => setPassword(e.target.value)}
               required autoComplete="current-password" />
        <button type="submit">Se connecter</button>
        {error && <p className="error" role="alert">{error}</p>}
        <p style={{ marginTop: "1rem", textAlign: "center" }}>
          Pas de compte ? <Link to="/register">Inscrivez-vous</Link>
        </p>
        <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
          Comptes de test : alice / bob / charlie / demo (mdp : <code>demo1234</code>)
        </p>
      </form>
    </main>
  );
}
