import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API from "../api";

export default function VerifyOTP() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (code.length !== 6) {
      setError("Le code doit contenir 6 chiffres.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post("/verify-otp/", { email, code });
      setSuccess(data.detail);
      setTimeout(() => nav("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Code incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(""); setSuccess("");
    setResending(true);
    try {
      const { data } = await API.post("/resend-otp/", { email });
      setSuccess(data.detail);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur d'envoi.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="container" id="main">
      <form className="form" onSubmit={submit}>
        <h2>Vérification du compte</h2>
        <p style={{ marginBottom: "1rem" }}>
          Un code à 6 chiffres a été envoyé à votre adresse mail.
          Saisissez-le ci-dessous pour activer votre compte.
        </p>

        <label htmlFor="e">Email</label>
        <input id="e" type="email" value={email}
               onChange={(e) => setEmail(e.target.value)} required
               disabled={!!initialEmail} />

        <label htmlFor="code">Code à 6 chiffres</label>
        <input id="code"
               className="otp-input"
               value={code}
               onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
               inputMode="numeric" pattern="[0-9]{6}"
               maxLength={6} required
               placeholder="------" />

        <button type="submit" disabled={loading || code.length !== 6}>
          {loading ? "Vérification…" : "Activer mon compte"}
        </button>

        {error && <p className="error" role="alert">{error}</p>}
        {success && <p className="success" role="status">{success}</p>}

        <p style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9em" }}>
          Pas reçu de code ?{" "}
          <button type="button"
                  onClick={resend} disabled={resending || !email}
                  style={{ background: "transparent", color: "var(--primary)",
                           border: "none", cursor: "pointer", textDecoration: "underline",
                           padding: 0, font: "inherit" }}>
            {resending ? "Envoi…" : "Renvoyer un code"}
          </button>
        </p>

        <p style={{ marginTop: "0.5rem", textAlign: "center" }}>
          <Link to="/login">Retour à la connexion</Link>
        </p>
      </form>
    </main>
  );
}
