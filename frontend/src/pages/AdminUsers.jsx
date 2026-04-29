import { useEffect, useState } from "react";
import API, { isAdmin } from "../api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [allowedMembers, setAllowedMembers] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("parent");
  const [msg, setMsg] = useState("");

  const loadUsers = () => API.get("/users/").then((r) => setUsers(r.data));
  const loadAllowed = () => API.get("/admin/allowed-members/").then((r) => setAllowedMembers(r.data));
  const load = async () => {
    await Promise.all([loadUsers(), loadAllowed()]);
  };

  useEffect(() => {
    load().catch((err) => {
      setMsg("Erreur : " + (err.response?.data?.detail || err.message));
      setTimeout(() => setMsg(""), 3500);
    });
  }, []);

  const toggleApproval = async (user) => {
    try {
      await API.patch(`/admin/users/${user.id}/`, { approved: !user.is_approved });
      setMsg(`${user.username} ${!user.is_approved ? "approuvé" : "suspendu"} ✔`);
      await loadUsers();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Erreur : " + (err.response?.data?.detail || err.message));
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const deleteUser = async (user) => {
    if (!confirm(`Supprimer définitivement l'utilisateur ${user.username} ?`)) return;
    try {
      await API.delete(`/admin/users/${user.id}/delete/`);
      setMsg(`${user.username} supprimé ✔`);
      await loadUsers();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Erreur : " + (err.response?.data?.detail || err.message));
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const addAllowedMember = async (e) => {
    e.preventDefault();
    try {
      await API.post("/admin/allowed-members/", { email: newEmail, role: newRole });
      setMsg("Email ajouté à la whitelist ✔");
      setNewEmail("");
      setNewRole("parent");
      await loadAllowed();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Erreur : " + (err.response?.data?.detail || err.message));
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const removeAllowedMember = async (member) => {
    if (!confirm(`Retirer ${member.email} de la whitelist ?`)) return;
    try {
      await API.delete(`/admin/allowed-members/${member.id}/`);
      setMsg("Entrée whitelist supprimée ✔");
      await loadAllowed();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Erreur : " + (err.response?.data?.detail || err.message));
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const ROLE_LABEL = { parent: "Parent", enfant: "Enfant", visiteur: "Visiteur" };
  const LEVEL_LABEL = {
    debutant: "Débutant", intermediaire: "Intermédiaire",
    avance: "Avancé", expert: "Expert",
  };

  if (!isAdmin()) {
    return <main className="container">
      <div className="alert error">Accès réservé à l'administrateur.</div>
    </main>;
  }

  return (
    <main className="container" id="main">
      <h1>🛡 Gestion des utilisateurs</h1>
      {msg && <div className="alert success">{msg}</div>}
      <p>{users.length} utilisateur(s) inscrit(s).</p>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Pseudo</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Niveau</th>
              <th>Points</th>
              <th>Connexions</th>
              <th>Email vérifié</th>
              <th>Compte</th>
              <th>Actions admin</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.username}</strong></td>
                <td style={{ fontSize: "0.85rem" }}>{u.email}</td>
                <td>
                  <span className={"badge " + (u.role === "parent" ? "on" : "off")}>
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                </td>
                <td>{LEVEL_LABEL[u.level] || u.level}</td>
                <td>{u.points?.toFixed(2) ?? 0}</td>
                <td>{u.nb_connexions ?? 0}</td>
                <td>{u.email_verified ? "✅" : "❌"}</td>
                <td>
                  <span className={"badge " + (u.is_approved ? "on" : "off")}>
                    {u.is_approved ? "✅ Actif" : "⏸ Suspendu"}
                  </span>
                </td>
                <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button
                    className={"btn " + (u.is_approved ? "danger" : "secondary")}
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                    onClick={() => toggleApproval(u)}
                  >
                    {u.is_approved ? "Suspendre" : "Approuver"}
                  </button>
                  <button
                    className="btn danger"
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                    onClick={() => deleteUser(u)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card" style={{ marginTop: "1.2rem" }}>
        <h2 style={{ marginTop: 0 }}>✅ Whitelist des inscriptions</h2>
        <p style={{ marginTop: "0.3rem" }}>
          Les emails ici peuvent créer un compte (avec rôle imposé automatiquement).
        </p>

        <form className="form" onSubmit={addAllowedMember} style={{ maxWidth: 560 }}>
          <label htmlFor="allowed-email">Email</label>
          <input
            id="allowed-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            placeholder="prenom.nom@mail.com"
          />

          <label htmlFor="allowed-role">Rôle attribué</label>
          <select
            id="allowed-role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          >
            <option value="parent">Parent</option>
            <option value="enfant">Enfant</option>
          </select>

          <button type="submit">Ajouter à la whitelist</button>
        </form>

        <div className="table-wrapper" style={{ marginTop: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Rôle</th>
                <th>Ajouté le</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allowedMembers.map((m) => (
                <tr key={m.id}>
                  <td>{m.email}</td>
                  <td>{m.role === "enfant" ? "Enfant" : "Parent"}</td>
                  <td>{new Date(m.created_at).toLocaleString("fr-FR")}</td>
                  <td>
                    <button className="btn danger" onClick={() => removeAllowedMember(m)}>
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
              {allowedMembers.length === 0 && (
                <tr><td colSpan="4">Aucune entrée whitelist.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
