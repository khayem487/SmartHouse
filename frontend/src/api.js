import axios from "axios";

export const API_URL = "http://127.0.0.1:8000/api";

const API = axios.create({ baseURL: API_URL });

const PUBLIC_ENDPOINTS = ["/devices", "/rooms", "/categories", "/services"];
const READ_ONLY_METHODS = new Set(["get", "head", "options"]);

function shouldSkipAuth(url = "", method = "get") {
  // On ne skip l'auth QUE pour les lectures publiques.
  // Les actions (POST/PATCH/DELETE...) doivent toujours envoyer le token.
  if (!READ_ONLY_METHODS.has(String(method || "get").toLowerCase())) {
    return false;
  }
  try {
    const u = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, API_URL);
    const path = u.pathname || "";
    const search = u.search || "";
    return PUBLIC_ENDPOINTS.some((p) => path === p || path.startsWith(`${p}/`) || `${path}${search}`.startsWith(`${p}?`));
  } catch {
    return PUBLIC_ENDPOINTS.some((p) => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`) || url.includes(`${p}/`) || url.includes(`${p}?`));
  }
}

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token && !shouldSkipAuth(config.url || "", config.method || "get")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const saveAuth = (data) => {
  localStorage.setItem("access", data.access);
  localStorage.setItem("refresh", data.refresh);
  if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
};

export const clearAuth = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
};

export const getUser = () => {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
};

export const refreshUser = async () => {
  const { data } = await API.get("/profile/");
  localStorage.setItem("user", JSON.stringify(data));
  return data;
};

export const isLoggedIn = () => !!localStorage.getItem("access");

export const isChild = () => {
  const u = getUser();
  return u && u.role === "enfant";
};

export const isAdvanced = () => {
  const u = getUser();
  // Un enfant n'a JAMAIS accès au module Gestion
  if (!u || u.role === "enfant") return false;
  return u.level === "avance" || u.level === "expert";
};

export const isAdmin = () => {
  const u = getUser();
  return u && (u.is_staff === true || u.username === "admin");
};

export default API;
