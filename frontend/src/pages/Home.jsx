import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="container" id="main">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Bienvenue sur SmartHouse</h1>
        <p>
          La plateforme qui centralise la gestion de vos objets connectés et
          de vos services domotiques : thermostats, caméras, appareils ménagers,
          volets, arrosage…
        </p>
        <p style={{ fontSize: "0.9em", opacity: 0.85 }}>
          Inscription réservée aux membres de la maison.
        </p>
        <Link to="/devices" className="btn">Explorer les objets</Link>
        <Link to="/services" className="btn">Voir les services</Link>
        <Link to="/register" className="btn">S'inscrire</Link>
      </section>

      <h2>Les 3 modules de la plateforme</h2>
      <div className="cards">
        <article className="card">
          <p className="icon" aria-hidden="true">🔍</p>
          <h3>Module Information</h3>
          <p>Parcourez librement le catalogue d'objets et de services, sans inscription.
             Recherche avec filtres par type, pièce, catégorie.</p>
        </article>
        <article className="card">
          <p className="icon" aria-hidden="true">👤</p>
          <h3>Module Visualisation</h3>
          <p>Inscrivez-vous pour gérer votre profil, consulter les objets en détail
             et gagner des points de progression.</p>
        </article>
        <article className="card">
          <p className="icon" aria-hidden="true">⚙️</p>
          <h3>Module Gestion</h3>
          <p>Au niveau Avancé, ajoutez/modifiez des objets, programmez des horaires,
             consultez statistiques et historiques, gérez la maintenance.</p>
        </article>
      </div>

      <h2>Système de niveaux</h2>
      <div className="cards">
        <article className="card"><h3>🟢 Débutant</h3><p>0 point. Accès aux modules Information et Visualisation.</p></article>
        <article className="card"><h3>🔵 Intermédiaire</h3><p>5 points. Autonomie sur les consultations.</p></article>
        <article className="card"><h3>🟣 Avancé</h3><p>10 points. Débloque le module Gestion (CRUD objets, horaires, maintenance).</p></article>
        <article className="card"><h3>🟡 Expert</h3><p>15 points. Gestion complète + pouvoirs étendus.</p></article>
      </div>
      <p className="muted-text mt-1">
        <strong>+ 0.25 point</strong> par connexion, <strong>+ 0.5 point</strong> par consultation d'objet/service.
      </p>
    </main>
  );
}
