import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";

export default function ServiceDetail() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get(`/services/${id}/`)
      .then((r) => setS(r.data))
      .catch(() => setError("Service introuvable."));
  }, [id]);

  if (error) return <main className="container"><div className="alert error">{error}</div></main>;
  if (!s) return <main className="container"><p>Chargement…</p></main>;

  return (
    <main className="container" id="main">
      <Link to="/services">← Retour aux services</Link>
      <h1>{s.name}</h1>
      <article className="card" style={{ maxWidth: 700 }}>
        <p><strong>Type :</strong> {s.type_display}</p>
        <p><strong>Statut :</strong>
          <span className={"badge " + (s.active ? "on" : "off")} style={{ marginLeft: 8 }}>
            {s.active ? "Actif" : "Inactif"}
          </span>
        </p>
        <p><strong>Description :</strong></p>
        <p>{s.description}</p>
        {s.related_device_name && (
          <p><strong>Objet connecté associé :</strong>{" "}
            <Link to={`/devices/${s.related_device}`}>{s.related_device_name}</Link>
          </p>
        )}
        <p><strong>Créé le :</strong> {new Date(s.created_at).toLocaleString("fr-FR")}</p>
      </article>
    </main>
  );
}
