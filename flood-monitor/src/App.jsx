import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Alerts from "./pages/Alerts.jsx";
import Maps from "./pages/Maps.jsx";
import Simulacion from "./pages/Simulacion.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alertas" element={<Alerts />} />
          <Route path="/mapas" element={<Maps />} />
          <Route path="/simulacion" element={<Simulacion />} />
        </Routes>
      </main>
    </div>
  );
}
