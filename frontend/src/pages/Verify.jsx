import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import API from "../api";

export default function Verify() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  const [status, setStatus] = useState(token ? "loading" : "idle");
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    API.get(`/verify/${token}/`)
      .then((r) => {
        setMsg(r.data.detail);
        setStatus(r.data.already ? "already" : "success");
      })
      .catch((err) => {
        setMsg(err.response?.data?.detail || "Erreur de validation.");
        setStatus("error");
      });
  }, [token]);

  const submitCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const { data } = await API.post("/verify-code/", { email, code });
      setStatus(data.already ? "already" : "success");
      setMsg(data.detail || "Email validé.");
    } catch (err) {
      setStatus("error");
      setMsg(err.response?.data?.detail || "Code invalide.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) {
      setStatus("error");
      setMsg("Renseigne ton email pour renvoyer le code.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post("/resend-verification/", { email });
      setStatus("idle");
      setMsg(data.detail || "Code renvoyé.");
    } catch (err) {
      setStatus("error");
      setMsg(err.response?.data?.detail || "Impossible de renvoyer le code.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="container" id="main">
        <form className="form" onSubmit={submitCode}>
          <h2>Vérification du compte</h2>
          <p>Entre le code à 6 chiffres reçu par email.</p>

          <label htmlFor="v-email">Email</label>
          <input
            id="v-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="v-code">Code (6 chiffres)</label>
          <input
            id="v-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />

          <button type="submit" disabled={loading}>{loading ? "Validation..." : "Valider le code"}</button>
          <button type="button" className="btn ghost" style={{ width: "100%", marginTop: "0.6rem" }} onClick={resend} disabled={loading}>
            Renvoyer un code
          </button>

          {msg && <div className={`alert ${status === "success" || status === "already" ? "success" : "error"}`} style={{ marginTop: "0.8rem" }}>{msg}</div>}

          {(status === "success" || status === "already") && (
            <p style={{ marginTop: "0.8rem", textAlign: "center" }}>
              <Link to="/login" className="btn">Se connecter</Link>
            </p>
          )}
        </form>
      </main>
    );
  }

  return (
    <main className="container" id="main">
      <div className="form" style={{ textAlign: "center" }}>
        {status === "loading" && (
          <>
            <h2>Validation en cours…</h2>
            <p>⏳ Veuillez patienter…</p>
          </>
        )}
        {status === "success" && (
          <>
            <h2>✔ Compte activé !</h2>
            <div className="alert success">{msg}</div>
            <Link to="/login" className="btn">Se connecter</Link>
          </>
        )}
        {status === "already" && (
          <>
            <h2>ℹ Email déjà validé</h2>
            <div className="alert info">{msg}</div>
            <Link to="/login" className="btn">Se connecter</Link>
          </>
        )}
        {status === "error" && (
          <>
            <h2>✖ Erreur</h2>
            <div className="alert error">{msg}</div>
            <Link to="/verify" className="btn">Vérifier avec un code</Link>
          </>
        )}
      </div>
    </main>
  );
}
