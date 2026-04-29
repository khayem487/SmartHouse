import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

const LEVEL_LABEL = {
  debutant: "Débutant", intermediaire: "Intermédiaire",
  avance: "Avancé", expert: "Expert",
};
const GENDER_LABEL = { M: "Masculin", F: "Féminin", N: "Non précisé" };

export default function Profile() {
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
  const [photoBroken, setPhotoBroken] = useState(false);

  const load = () => {
    API.get("/profile/").then((r) => {
      setMe(r.data);
      setForm(r.data);
      localStorage.setItem("user", JSON.stringify(r.data));
    });
    API.get("/users/").then((r) => setOthers(r.data)).catch(() => setOthers([]));
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
      setPhotoBroken(false);
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

  const photoSrc = me.photo_url ? `${me.photo_url}?v=${photoVer}` : null;

  return (
    <main className="container" id="main">
      <h1>Mon profil</h1>
      {msg && <div className="alert success" role="status">{msg}</div>}
      {err && <div className="alert error" role="alert">{err}</div>}

      <section aria-labelledby="photo-t">
        <h2 id="photo-t">Photo</h2>
        <div className="profile-top-row">
          {photoSrc && !photoBroken ? (
            <img
              src={photoSrc}
              alt={`Photo de ${me.username}`}
              className="profile-photo"
              onError={() => setPhotoBroken(true)}
            />
          ) : (
            <div className="profile-photo profile-photo-empty" aria-label="Pas de photo">👤</div>
          )}
          <form onSubmit={uploadPhoto} className="inline-form-row">
            <input
              type="file"
              accept="image/*"
              aria-label="Choisir une photo"
              onChange={(e) => setPhotoFile(e.target.files[0])}
            />
            <button type="submit" className="btn" disabled={!photoFile}>Envoyer</button>
          </form>
        </div>
      </section>

      <section aria-labelledby="info-t">
        <h2 id="info-t">Mes informations</h2>
        {!edit ? (
          <article className="card details-card small">
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
            <div className="action-row">
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
            <p className="meta-text mt-xs">
              Le rôle (parent / enfant) est fixé par l'administrateur et ne peut pas être modifié.
            </p>
            <button type="submit">Enregistrer</button>
            <button
              type="button"
              className="btn secondary mt-xs"
              onClick={() => { setEdit(false); setForm(me); }}
            >
              Annuler
            </button>
          </form>
        )}
      </section>

      {showPwd && (
        <form className="form" onSubmit={changePwd}>
          <h3>Changer de mot de passe</h3>
          <label>Ancien mot de passe</label>
          <input
            type="password"
            value={pwdForm.old_password}
            onChange={(e) => setPwdForm({ ...pwdForm, old_password: e.target.value })}
            required
          />
          <label>Nouveau mot de passe</label>
          <input
            type="password"
            value={pwdForm.new_password}
            onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
            required
            minLength={4}
          />
          <button type="submit">Valider</button>
        </form>
      )}

      <section aria-labelledby="others-t">
        <h2 id="others-t">Autres membres de la maison</h2>
        <div className="cards">
          {others.map((u) => (
            <article key={u.id} className="card">
              {u.photo_url ? (
                <img
                  src={`${u.photo_url}?v=${photoVer}`}
                  alt={`Photo de ${u.username}`}
                  className="profile-photo profile-photo-sm"
                />
              ) : (
                <div className="profile-photo profile-photo-sm profile-photo-empty" aria-hidden="true">👤</div>
              )}
              <h3>{u.username}</h3>
              <p>{u.first_name} {u.last_name}</p>
              <p><strong>Rôle :</strong> {u.role}</p>
              <p><strong>Niveau :</strong> {LEVEL_LABEL[u.level] || u.level}</p>
              <p><strong>Points :</strong> {u.points?.toFixed(2)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
