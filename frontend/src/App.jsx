import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import DeviceDetail from "./pages/DeviceDetail";
import AddDevice from "./pages/AddDevice";
import EditDevice from "./pages/EditDevice";
import Profile from "./pages/Profile";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import LevelChange from "./pages/LevelChange";
import Maintenance from "./pages/Maintenance";
import History from "./pages/History";
import Stats from "./pages/Stats";
import MyRequests from "./pages/MyRequests";
import AdminRequests from "./pages/AdminRequests";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Module Information */}
        <Route path="/"             element={<Home />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/devices"      element={<Devices />} />
        <Route path="/services"     element={<Services />} />

        {/* Détail = CONNECTÉ OBLIGATOIRE (visiteur bloqué) */}
        <Route path="/devices/:id"   element={<ProtectedRoute><DeviceDetail /></ProtectedRoute>} />
        <Route path="/services/:id"  element={<ProtectedRoute><ServiceDetail /></ProtectedRoute>} />

        {/* Module Visualisation */}
        <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/level"        element={<ProtectedRoute><LevelChange /></ProtectedRoute>} />
        <Route path="/my-requests"  element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />

        {/* Module Gestion */}
        <Route path="/devices/add"       element={<ProtectedRoute requireAdvanced><AddDevice /></ProtectedRoute>} />
        <Route path="/devices/:id/edit"  element={<ProtectedRoute requireAdvanced><EditDevice /></ProtectedRoute>} />
        <Route path="/maintenance"       element={<ProtectedRoute requireAdvanced><Maintenance /></ProtectedRoute>} />
        <Route path="/history"           element={<ProtectedRoute requireAdvanced><History /></ProtectedRoute>} />
        <Route path="/stats"             element={<ProtectedRoute requireAdvanced><Stats /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin-requests" element={<ProtectedRoute><AdminRequests /></ProtectedRoute>} />
      </Routes>
      <footer>
        <p>Maison Intelligente — Projet CY Tech ING1 2025-2026</p>
      </footer>
    </>
  );
}
