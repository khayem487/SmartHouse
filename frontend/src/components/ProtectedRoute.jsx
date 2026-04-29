import { Navigate } from "react-router-dom";
import { isLoggedIn, getUser } from "../api";

export default function ProtectedRoute({ children, requireAdvanced = false, requireAdmin = false }) {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  const u = getUser();

  if (requireAdmin) {
    const isAdminUser = u && (u.is_staff === true || u.username === "admin");
    if (!isAdminUser) {
      return (
        <main className="container" id="main">
          <h1>Accès refusé</h1>
          <div className="alert warning">
            <p>Cette page est réservée à l'<strong>administrateur</strong> de la plateforme.</p>
          </div>
        </main>
      );
    }
  }

  if (requireAdvanced) {
    const u = getUser();
    // Bloquer les enfants peu importe leur niveau
    if (u?.role === "enfant" || u?.is_child) {
      return (
        <main className="container" id="main">
          <h1>Accès refusé</h1>
          <div className="alert warning">
            <p>🔒 Le module Gestion est réservé aux <strong>adultes (parents)</strong> de la maison.</p>
            <p>Vous êtes connecté(e) en tant qu'<strong>enfant</strong>. Vous pouvez consulter
               les objets et services, mais pas les modifier ni gérer la maintenance.</p>
          </div>
        </main>
      );
    }
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
