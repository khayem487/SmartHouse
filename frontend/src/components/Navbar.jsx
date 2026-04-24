import { Link, useNavigate } from "react-router-dom";
import { isLoggedIn, getUser, clearAuth, isAdvanced } from "../api";

export default function Navbar() {
  const nav = useNavigate();
  const logged = isLoggedIn();
  const user = getUser();
  const advanced = isAdvanced();

  const logout = () => { clearAuth(); nav("/login"); };

  return (
    <nav className="navbar" aria-label="Navigation principale">
      <Link to="/" className="brand">🏠 Maison Intelligente</Link>
      <div className="links">
        <Link to="/">Accueil</Link>
        <Link to="/devices">Objets</Link>
        <Link to="/services">Services</Link>
        {logged && <Link to="/dashboard">Tableau de bord</Link>}
        {logged && <Link to="/profile">Profil</Link>}
        {logged && advanced && <Link to="/devices/add">+ Objet</Link>}
        {logged && advanced && <Link to="/maintenance">Maintenance</Link>}
        {logged && advanced && <Link to="/history">Historique</Link>}
        {logged && advanced && <Link to="/stats">Statistiques</Link>}
        {logged && <Link to="/my-requests">Mes demandes</Link>}
        {!logged && <Link to="/login">Connexion</Link>}
        {!logged && <Link to="/register">Inscription</Link>}
        {logged && (
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
            Déconnexion ({user?.username})
          </a>
        )}
      </div>
    </nav>
  );
}
