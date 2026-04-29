import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { isLoggedIn, getUser, clearAuth, isAdvanced, isAdmin, refreshUser } from "../api";

export default function Navbar() {
  const nav = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const [user, setUser] = useState(getUser());
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
    const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return systemPrefersDark ? "dark" : "light";
  });
  const ref = useRef(null);

  const logged = isLoggedIn();
  const advanced = isAdvanced();
  const admin = isAdmin();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Rafraîchit le user à chaque changement de route (données live)
  useEffect(() => {
    if (logged) {
      refreshUser().then(setUser).catch(() => {});
    }
    setOpenMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const logout = () => {
    clearAuth();
    nav("/login");
  };
  const toggle = (name) => setOpenMenu(openMenu === name ? null : name);
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <>
      <nav className="navbar" aria-label="Navigation principale" ref={ref}>
        <Link to="/" className="brand">🏠 Maison Intelligente</Link>

        <div className="links">
          <Link to="/">Accueil</Link>

        <div className="dropdown">
          <button className="dropdown-btn" onClick={() => toggle("explore")} aria-expanded={openMenu === "explore"}>
            Explorer ▾
          </button>
          {openMenu === "explore" && (
            <div className="dropdown-menu">
              <Link to="/devices">🔌 Objets connectés</Link>
              <Link to="/services">🛠 Services</Link>
            </div>
          )}
        </div>

        {logged && (
          <div className="dropdown">
            <button className="dropdown-btn" onClick={() => toggle("space")} aria-expanded={openMenu === "space"}>
              Mon espace ▾
            </button>
            {openMenu === "space" && (
              <div className="dropdown-menu">
                <Link to="/dashboard">📊 Tableau de bord</Link>
                <Link to="/profile">👤 Profil</Link>
                <Link to="/level">🏆 Niveau</Link>
                {!admin && <Link to="/my-requests">📩 Mes demandes</Link>}
              </div>
            )}
          </div>
        )}

        {logged && advanced && (
          <div className="dropdown">
            <button className="dropdown-btn" onClick={() => toggle("manage")} aria-expanded={openMenu === "manage"}>
              Gestion ▾
            </button>
            {openMenu === "manage" && (
              <div className="dropdown-menu">
                <Link to="/devices/add">➕ Ajouter un objet</Link>
                <Link to="/maintenance">🛠 Maintenance</Link>
                <Link to="/history">📜 Historique</Link>
                <Link to="/stats">📈 Statistiques</Link>
                {admin && <Link to="/admin-requests">🛡 Gérer demandes</Link>}
                {admin && <Link to="/admin/users">👥 Gérer utilisateurs</Link>}
              </div>
            )}
          </div>
        )}

          {!logged && <Link to="/login">Connexion</Link>}
          {!logged && <Link to="/register">Inscription</Link>}
          {logged && (
            <a href="#" className="logout-link" onClick={(e) => {
              e.preventDefault();
              logout();
            }}>
              Déconnexion ({user?.username})
            </a>
          )}
        </div>
      </nav>

      <button
        className="theme-fab"
        onClick={toggleTheme}
        type="button"
        aria-label="Basculer le thème"
        title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </>
  );
}
