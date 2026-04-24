import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { isLoggedIn, getUser, clearAuth, isAdvanced, refreshUser } from "../api";

export default function Navbar() {
  const nav = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const [user, setUser] = useState(getUser());
  const ref = useRef(null);

  const logged = isLoggedIn();
  const advanced = isAdvanced();
  const isAdmin = user?.is_staff || user?.username === "admin";

  // Rafraîchit le user à chaque changement de route (données live)
  useEffect(() => {
    if (logged) {
      refreshUser().then(setUser).catch(() => {});
    }
    setOpenMenu(null);
  }, [location.pathname]);

  // Ferme le menu si clic à l'extérieur
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const logout = () => { clearAuth(); nav("/login"); };
  const toggle = (name) => setOpenMenu(openMenu === name ? null : name);

  return (
    <nav className="navbar" aria-label="Navigation principale" ref={ref}>
      <Link to="/" className="brand">🏠 Maison Intelligente</Link>

      <div className="links">
        <Link to="/">Accueil</Link>

        {/* Catégorie : Explorer */}
        <div className="dropdown">
          <button className="dropdown-btn" onClick={() => toggle("explore")}
                  aria-expanded={openMenu === "explore"}>
            Explorer ▾
          </button>
          {openMenu === "explore" && (
            <div className="dropdown-menu">
              <Link to="/devices">🔌 Objets connectés</Link>
              <Link to="/services">🔧 Services</Link>
            </div>
          )}
        </div>

        {/* Catégorie : Mon espace (connecté) */}
        {logged && (
          <div className="dropdown">
            <button className="dropdown-btn" onClick={() => toggle("space")}
                    aria-expanded={openMenu === "space"}>
              Mon espace ▾
            </button>
            {openMenu === "space" && (
              <div className="dropdown-menu">
                <Link to="/dashboard">📊 Tableau de bord</Link>
                <Link to="/profile">👤 Profil</Link>
                <Link to="/level">🏆 Niveau</Link>
                <Link to="/my-requests">📩 Mes demandes</Link>
              </div>
            )}
          </div>
        )}

        {/* Catégorie : Gestion (avancé/expert) */}
        {logged && advanced && (
          <div className="dropdown">
            <button className="dropdown-btn" onClick={() => toggle("manage")}
                    aria-expanded={openMenu === "manage"}>
              Gestion ▾
            </button>
            {openMenu === "manage" && (
              <div className="dropdown-menu">
                <Link to="/devices/add">➕ Ajouter un objet</Link>
                <Link to="/maintenance">🛠 Maintenance</Link>
                <Link to="/history">📜 Historique</Link>
                <Link to="/stats">📈 Statistiques</Link>
                {isAdmin && <Link to="/admin-requests">🛡 Gérer demandes</Link>}
              </div>
            )}
          </div>
        )}

        {!logged && <Link to="/login">Connexion</Link>}
        {!logged && <Link to="/register">Inscription</Link>}
        {logged && (
          <a href="#" className="logout-link"
             onClick={(e) => { e.preventDefault(); logout(); }}>
            Déconnexion ({user?.username})
          </a>
        )}
      </div>
    </nav>
  );
}
