import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { isAdmin, clearAuth } from "../api";

const LEVEL_LABEL = {
  debutant: "Débutant", intermediaire: "Intermédiaire",
  avance: "Avancé", expert: "Expert",
};
const GENDER_LABEL = { M: "Masculin", F: "Féminin", N: "Non précisé" };

export default function Profile() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [others, setOthers] = useState([]);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old_password: "", new_password: "" });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoVer, setPhotoVer] = useState(Date.now());

  // Admin
  const [selectedUser, setSelectedUser] = useState(null);
  const [whitelist, setWhitelist] = useState([]);
  const [showWhitelist, setShowWhitelist] = useState(false);
  const [whitelistForm, setWhitelistForm] = useState({
    email: "", role: "parent", require_email_verification: false,
  });

  const admin = isAdmin();

  const load = () => {
    API.get("/profile/").then((r) => {
      setMe(r.data);
      setForm(r.data);
      localStorage.setItem("user", JSON.stringify(r.data));
    });
    API.get("/users/").then((r) => setOthers(r.data));
    if (isAdmin()) {
      API.get("/whitelist/").then((r) => setWhitelist(r.data)).catch(() => {});
    }
  };

  useEffect(load, []);

  if (!me) return <main className="container"><p>Chargement…</p></main>;

  const set = (k, v) => setForm({ ...form, [k]: v });

  const save = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await API.patch("/profile/", {
        username: form.username, email: form.email,
        first_name: form.first_name, last_name: form.last_name,
        age: form.age, gender: form.gender,
        date_naissance: form.date_naissance || null,
      });
      setMsg("Profil mis à jour.");
      setEdit(false);
      load();
      setTimeout(() => setMsg(""), 2500);
    } catch (ex) {
      setErr(JSON.stringify(ex.response?.data || ex.message));
    }
  };

  const uploadPhoto = async (e) => {
    e.preventDefault();
    if (!photoFile) return;
    setErr(""); setMsg("");
    try {
      const fd = new FormData();
      fd.append("photo", photoFile);
      await API.patch("/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMsg("Photo mise à jour.");
      setPhotoFile(null);
      setPhotoVer(Date.now());
      load();
      setTimeout(() => setMsg(""), 2500);
    } catch (ex) {
      setErr("Erreur upload photo : " + JSON.stringify(ex.response?.data || ex.message));
    }
  };

  const changePwd = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await API.post("/change-password/", pwdForm);
      setMsg("Mot de passe changé.");
      setPwdForm({ old_password: "", new_password: "" });
      setShowPwd(false);
      setTimeout(() => setMsg(""), 2500);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Erreur");
    }
  };

  // ------ ADMIN ------
  const suspendUser = async (u) => {
    if (!confirm(`Suspendre ${u.username} ?\n\nIl ne pourra plus se connecter.`)) return;
    try {
      const { data } = await API.post(`/admin/users/${u.id}/suspend/`);
      setMsg(data.detail);
      load();
      if (selectedUser?.id === u.id) {
        setSelectedUser({ ...selectedUser, email_verified: false });
      }
      setTimeout(() => setMsg(""), 3000);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Erreur");
    }
  };

  const unsuspendUser = async (u) => {
    if (!confirm(`Réactiver ${u.username} ?`)) return;
    try {
      const { data } = await API.post(`/admin/users/${u.id}/unsuspend/`);
      setMsg(data.detail);
      load();
      if (selectedUser?.id === u.id) {
        setSelectedUser({ ...selectedUser, email_verified: true });
      }
      setTimeout(() => setMsg(""), 3000);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Erreur");
    }
  };

  const deleteUser = async (u) => {
    const confirmation = prompt(
      `ATTENTION : suppression définitive.\n\n` +
      `Toutes les données (objets créés, historique...) seront perdues.\n` +
      `L'email reste dans la whitelist.\n\n` +
      `Tapez le pseudo "${u.username}" pour confirmer :`
    );
    if (confirmation !== u.username) {
      if (confirmation !== null) alert("Pseudo incorrect, suppression annulée.");
      return;
    }
    try {
      const { data } = await API.delete(`/admin/users/${u.id}/delete/`);
      setMsg(data.detail);
      setSelectedUser(null);
      load();
      setTimeout(() => setMsg(""), 3000);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Erreur");
    }
  };

  const addToWhitelist = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await API.post("/whitelist/", whitelistForm);
      setMsg(`Email ${whitelistForm.email} ajouté à la whitelist.`);
      setWhitelistForm({ email: "", role: "parent", require_email_verification: false });
      load();
      setTimeout(() => setMsg(""), 3000);
    } catch (ex) {
      const d = ex.response?.data;
      if (d?.email) setErr(Array.isArray(d.email) ? d.email[0] : d.email);
      else setErr(JSON.stringify(d || ex.message));
    }
  };

  const removeFromWhitelist = async (id, email) => {
    if (!confirm(`Retirer ${email} de la whitelist ?`)) return;
    try {
      await API.delete(`/whitelist/${id}/`);
      setMsg(`Email ${email} retiré de la whitelist.`);
      load();
      setTimeout(() => setMsg(""), 3000);
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Erreur");
    }
  };

  const photoSrc = me.photo_url ? `${me.photo_url}?v=${photoVer}` : null;

  return (
    <main className="container" id="main">
      <h1>Mon profil</h1>
      {msg && <div className="alert success" role="status">{msg}</div>}
      {err && <div className="alert error" role="alert">{err}</div>}

      <section aria-labelledby="photo-t">
        <h2 id="photo-t">Photo</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {photoSrc ? (
            <img src={photoSrc} alt={`Photo de ${me.username}`} className="profile-photo" />
          ) : (
            <div className="profile-photo" aria-label="Pas de photo"
                 style={{ display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "2rem", color: "#999" }}>?</div>
          )}
          <form onSubmit={uploadPhoto} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="file" accept="image/*" aria-label="Choisir une photo"
                   onChange={(e) => setPhotoFile(e.target.files[0])} />
            <button type="submit" className="btn" disabled={!photoFile}>Envoyer</button>
          </form>
        </div>
      </section>

      <section aria-labelledby="info-t">
        <h2 id="info-t">Mes informations</h2>
        {!edit ? (
          <article className="card" style={{ maxWidth: 600 }}>
            <p><strong>Pseudo :</strong> {me.username}</p>
            <p><strong>Prénom :</strong> {me.first_name || "—"}</p>
            <p><strong>Nom :</strong> {me.last_name || "—"}</p>
            <p><strong>Email :</strong> {me.email}</p>
            <p><strong>Âge :</strong> {me.age}</p>
            <p><strong>Genre :</strong> {GENDER_LABEL[me.gender]}</p>
            <p><strong>Date de naissance :</strong> {me.date_naissance || "—"}</p>
            <p><strong>Rôle :</strong> {me.role}</p>
            <p><strong>Niveau :</strong> {LEVEL_LABEL[me.level]}</p>
            <p><strong>Points :</strong> {me.points?.toFixed(2)}</p>
            <p><strong>Connexions :</strong> {me.nb_connexions}</p>
            <p><strong>Actions :</strong> {me.nb_actions}</p>
            <div style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => setEdit(true)}>Modifier</button>
              <button className="btn secondary" onClick={() => setShowPwd(!showPwd)}>
                Changer mot de passe
              </button>
              <Link to="/level" className="btn ghost">Changer de niveau</Link>
            </div>
          </article>
        ) : (
          <form className="form" onSubmit={save}>
            <label>Pseudo</label>
            <input value={form.username} onChange={(e) => set("username", e.target.value)} required />
            <label>Prénom</label>
            <input value={form.first_name || ""} onChange={(e) => set("first_name", e.target.value)} />
            <label>Nom</label>
            <input value={form.last_name || ""} onChange={(e) => set("last_name", e.target.value)} />
            <label>Email</label>
            <input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
            <label>Âge</label>
            <input type="number" value={form.age}
                   onChange={(e) => set("age", parseInt(e.target.value) || 0)} />
            <label>Genre</label>
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="N">Non précisé</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
            <label>Date de naissance</label>
            <input type="date" value={form.date_naissance || ""}
                   onChange={(e) => set("date_naissance", e.target.value)} />
            <p style={{ fontSize: "0.85em", color: "#666", marginTop: 10 }}>
              Le rôle (parent / enfant) est fixé par l'administrateur et ne peut être modifié.
            </p>
            <button type="submit">Enregistrer</button>
            <button type="button" className="btn secondary" style={{ marginTop: 10 }}
                    onClick={() => { setEdit(false); setForm(me); }}>Annuler</button>
          </form>
        )}
      </section>

      {showPwd && (
        <form className="form" onSubmit={changePwd}>
          <h3>Changer de mot de passe</h3>
          <label>Ancien mot de passe</label>
          <input type="password" value={pwdForm.old_password}
                 onChange={(e) => setPwdForm({ ...pwdForm, old_password: e.target.value })}
                 required />
          <label>Nouveau mot de passe</label>
          <input type="password" value={pwdForm.new_password}
                 onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                 required minLength={4} />
          <button type="submit">Valider</button>
        </form>
      )}

      {/* ===== Modal détails utilisateur (admin) ===== */}
      {selectedUser && (
        <div role="dialog" aria-modal="true"
             style={{
               position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
               background: "rgba(0,0,0,0.5)", display: "flex",
               alignItems: "center", justifyContent: "center", zIndex: 1000,
               padding: "1rem",
             }}
             onClick={() => setSelectedUser(null)}>
          <div className="card" style={{ maxWidth: 500, width: "100%", maxHeight: "90vh", overflow: "auto" }}
               onClick={(e) => e.stopPropagation()}>
            <h2>{selectedUser.username}</h2>
            <p><strong>Prénom :</strong> {selectedUser.first_name || "—"}</p>
            <p><strong>Nom :</strong> {selectedUser.last_name || "—"}</p>
            <p><strong>Email :</strong> {selectedUser.email}</p>
            <p><strong>Âge :</strong> {selectedUser.age}</p>
            <p><strong>Genre :</strong> {GENDER_LABEL[selectedUser.gender]}</p>
            <p><strong>Date de naissance :</strong> {selectedUser.date_naissance || "—"}</p>
            <p><strong>Rôle :</strong> {selectedUser.role}</p>
            <p><strong>Niveau :</strong> {LEVEL_LABEL[selectedUser.level]}</p>
            <p><strong>Points :</strong> {selectedUser.points?.toFixed(2)}</p>
            <p><strong>Connexions :</strong> {selectedUser.nb_connexions}</p>
            <p><strong>Actions :</strong> {selectedUser.nb_actions}</p>
            <p>
              <strong>Statut :</strong>{" "}
              {selectedUser.email_verified
                ? <span className="badge on">Actif</span>
                : <span className="badge off">Suspendu</span>}
            </p>

            {admin && !selectedUser.is_staff && (
              <div style={{ marginTop: 15, display: "flex", flexWrap: "wrap", gap: 5 }}>
                {selectedUser.email_verified ? (
                  <button className="btn secondary" onClick={() => suspendUser(selectedUser)}>
                    Suspendre
                  </button>
                ) : (
                  <button className="btn success" onClick={() => unsuspendUser(selectedUser)}>
                    Réactiver
                  </button>
                )}
                <button className="btn danger" onClick={() => deleteUser(selectedUser)}>
                  Supprimer définitivement
                </button>
              </div>
            )}
            {admin && selectedUser.is_staff && (
              <p style={{ color: "#666", fontStyle: "italic" }}>
                Les administrateurs ne peuvent pas être suspendus ni supprimés.
              </p>
            )}

            <button className="btn ghost" style={{ marginTop: 10 }}
                    onClick={() => setSelectedUser(null)}>Fermer</button>
          </div>
        </div>
      )}

      {/* ===== Section Whitelist (admin uniquement) ===== */}
      {admin && (
        <section aria-labelledby="whitelist-t">
          <h2 id="whitelist-t">Whitelist (admin)</h2>
          <p style={{ fontSize: "0.9em", color: "#666" }}>
            Liste des emails autorisés à s'inscrire. Seuls ces emails peuvent
            créer un compte. Si "Code par mail" est activé, l'utilisateur recevra
            un code à 6 chiffres pour valider son inscription.
          </p>

          <button className="btn" onClick={() => setShowWhitelist(!showWhitelist)}>
            {showWhitelist ? "Masquer la whitelist" : "Afficher la whitelist"}
          </button>

          {showWhitelist && (
            <>
              <form onSubmit={addToWhitelist} className="form" style={{ marginTop: 15 }}>
                <h3>Ajouter un email</h3>
                <label>Email</label>
                <input type="email" value={whitelistForm.email}
                       onChange={(e) => setWhitelistForm({ ...whitelistForm, email: e.target.value })}
                       required placeholder="email@exemple.com" />
                <label>Rôle</label>
                <select value={whitelistForm.role}
                        onChange={(e) => setWhitelistForm({ ...whitelistForm, role: e.target.value })}>
                  <option value="parent">Parent</option>
                  <option value="enfant">Enfant</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <input type="checkbox" style={{ width: "auto" }}
                         checked={whitelistForm.require_email_verification}
                         onChange={(e) => setWhitelistForm({
                           ...whitelistForm,
                           require_email_verification: e.target.checked
                         })} />
                  Envoyer un code à 6 chiffres par mail (sinon activation auto)
                </label>
                <button type="submit">Ajouter à la whitelist</button>
              </form>

              <h3 style={{ marginTop: 20 }}>Emails autorisés ({whitelist.length})</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Rôle</th>
                      <th>Code mail</th>
                      <th>Compte créé</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whitelist.map((w) => (
                      <tr key={w.id}>
                        <td>{w.email}</td>
                        <td>{w.role}</td>
                        <td>{w.require_email_verification ? "Oui" : "Non"}</td>
                        <td>
                          {w.has_account
                            ? <span className="badge on">Oui</span>
                            : <span className="badge warning">Non</span>}
                        </td>
                        <td>
                          <button className="btn danger"
                                  onClick={() => removeFromWhitelist(w.id, w.email)}>
                            Retirer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      <section aria-labelledby="others-t">
        <h2 id="others-t">
          {admin ? "Tous les utilisateurs" : "Autres membres de la maison"}
        </h2>
        {admin && (
          <p style={{ fontSize: "0.9em", color: "#666" }}>
            Cliquez sur un utilisateur pour voir ses détails et le suspendre, réactiver ou supprimer.
          </p>
        )}
        <div className="cards">
          {others.map((u) => (
            <article key={u.id} className="card"
                     role={admin ? "button" : undefined}
                     tabIndex={admin ? 0 : undefined}
                     style={admin ? { cursor: "pointer" } : {}}
                     onClick={admin ? () => setSelectedUser(u) : undefined}
                     onKeyDown={admin ? (e) => (e.key === "Enter" || e.key === " ") && setSelectedUser(u) : undefined}>
              {u.photo_url && <img src={`${u.photo_url}?v=${photoVer}`}
                                   alt={`Photo de ${u.username}`}
                                   className="profile-photo" style={{ width: 60, height: 60 }} />}
              <h3>{u.username}</h3>
              <p>{u.first_name} {u.last_name}</p>
              <p><strong>Rôle :</strong> {u.role}</p>
              <p><strong>Niveau :</strong> {LEVEL_LABEL[u.level]}</p>
              <p><strong>Points :</strong> {u.points?.toFixed(2)}</p>
              {admin && (
                <p>
                  {u.email_verified
                    ? <span className="badge on">Actif</span>
                    : <span className="badge off">Suspendu</span>}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
