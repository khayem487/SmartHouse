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

  const [verifyCode, setVerifyCode] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyErr, setVerifyErr] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(null);
    setLoading(true);
    try {
      const { data } = await API.post("/register/", form);
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

  const confirmCode = async () => {
    setVerifyErr("");
    setVerifyMsg("");
    if (!success?.email) {
      setVerifyErr("Email manquant.");
      return;
    }
    if (verifyCode.length !== 6) {
      setVerifyErr("Le code doit contenir 6 chiffres.");
      return;
    }
    setVerifyLoading(true);
    try {
      const { data } = await API.post("/verify-code/", { email: success.email, code: verifyCode });
      setVerifyMsg(data.detail || "Compte activé.");
      setTimeout(() => nav("/login"), 1000);
    } catch (err) {
      setVerifyErr(err.response?.data?.detail || "Code invalide.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const resendCode = async () => {
    setVerifyErr("");
    setVerifyMsg("");
    setVerifyLoading(true);
    try {
      const { data } = await API.post("/resend-verification/", { email: success.email });
      const fallback = data.dev_code ? ` Code de test (dev) : ${data.dev_code}` : "";
      setVerifyMsg((data.detail || "Code renvoyé.") + fallback);
    } catch (err) {
      setVerifyErr(err.response?.data?.detail || "Impossible de renvoyer le code.");
    } finally {
      setVerifyLoading(false);
    }
  };

  if (success) {
    return (
      <main className="container" id="main">
        <div className="form" style={{ textAlign: "center" }}>
          <h2>Inscription réussie</h2>
          <div className="alert success" style={{ textAlign: "left" }}>
            <p>Compte créé pour <strong>{success.username}</strong>.</p>
            <p>Un code de vérification a été envoyé à :</p>
            <p style={{ marginTop: 8 }}><strong>{success.email}</strong></p>
            <p style={{ marginTop: 8 }}>Rôle attribué automatiquement : <strong>{success.role}</strong></p>
          </div>

          {!success.email_sent && (
            <div className="alert warning">
              <p>L'envoi email a échoué côté serveur. Tu peux renvoyer un code ci-dessous.</p>
              {success.dev_code && (
                <p style={{ marginTop: 8 }}>
                  Code de test (dev) : <strong>{success.dev_code}</strong>
                </p>
              )}
            </div>
          )}

          <div style={{ textAlign: "left", marginTop: "0.8rem" }}>
            <label htmlFor="code">Code à 6 chiffres</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button className="btn" style={{ width: "100%", marginTop: "0.6rem" }} onClick={confirmCode} disabled={verifyLoading}>
              {verifyLoading ? "Validation..." : "Valider le code"}
            </button>
            <button className="btn ghost" style={{ width: "100%", marginTop: "0.6rem" }} onClick={resendCode} disabled={verifyLoading}>
              Renvoyer le code
            </button>
            {verifyMsg && <div className="alert success" style={{ marginTop: "0.8rem" }}>{verifyMsg}</div>}
            {verifyErr && <div className="alert error" style={{ marginTop: "0.8rem" }}>{verifyErr}</div>}
          </div>

          <p style={{ marginTop: "1rem" }}>
            <Link to="/verify" className="btn secondary">Ouvrir la page vérification</Link>
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
          Seuls les membres autorisés peuvent s'inscrire. Le rôle est attribué automatiquement.
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
          Déjà un compte ? <Link to="/login">Connecte-toi</Link>
        </p>
      </form>
    </main>
  );
}
