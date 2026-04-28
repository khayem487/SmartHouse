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
    </main>
  );
}
