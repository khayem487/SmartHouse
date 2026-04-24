import { Navigate } from "react-router-dom";
import { isLoggedIn, getUser } from "../api";

export default function ProtectedRoute({ children, requireAdvanced = false }) {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  if (requireAdvanced) {
    const u = getUser();
    if (!u || (u.level !== "avance" && u.level !== "expert")) {
      return (
        <main className="container" id="main">
          <h1>Accès refusé</h1>
          <div className="alert warning">
            <p>Ce module est réservé aux utilisateurs de niveau <strong>Avancé</strong> ou <strong>Expert</strong>.</p>
            <p>Niveau actuel : <strong>{u?.level || "?"}</strong> — Points : {u?.points?.toFixed(2)}</p>
            <p>Gagne des points en te connectant (+0.25) et en consultant des objets (+0.5).</p>
          </div>
        </main>
      );
    }
  }
  return children;
}
