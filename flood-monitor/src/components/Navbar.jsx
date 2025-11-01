import { NavLink } from "react-router-dom";
import { BarChart3, Bell, Map as MapIcon, LifeBuoy } from "lucide-react";

export default function Navbar() {
  return (
    <aside className="navbar">
      <div className="brand">
        <div>
          <h1>Monitoreo</h1>
          <small>Tocancipá · Quebrada Esmeralda</small>
        </div>
      </div>

      <nav className="nav-links">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? "link active" : "link")}
        >
          <BarChart3 className="nav-icon" aria-hidden="true" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/alertas"
          className={({ isActive }) => (isActive ? "link active" : "link")}
        >
          <Bell className="nav-icon" aria-hidden="true" />
          <span>Alertas</span>
        </NavLink>

        <NavLink
          to="/mapas"
          className={({ isActive }) => (isActive ? "link active" : "link")}
        >
          <MapIcon className="nav-icon" aria-hidden="true" />
          <span>Mapas</span>
        </NavLink>
      </nav>

      <footer className="nav-footer">
        <small>Hackathon · UNISABANA</small>
      </footer>
    </aside>
  );
}
