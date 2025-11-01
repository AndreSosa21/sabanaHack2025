import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <aside className="navbar">
      <div className="brand">
        <span className="logo">🌧️</span>
        <div>
          <h1>Monitoreo</h1>
          <small>Tocancipá · Quebrada Esmeralda</small>
        </div>
      </div>

      <nav className="nav-links">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "link active" : "link"}>
          <span>📊</span> Dashboard
        </NavLink>
        <NavLink to="/alertas" className={({isActive}) => isActive ? "link active" : "link"}>
          <span>🔔</span> Alertas
        </NavLink>
        <NavLink to="/mapas" className={({isActive}) => isActive ? "link active" : "link"}>
          <span>🗺️</span> Mapas
        </NavLink>
      </nav>

      <footer className="nav-footer">
        <small>Hackathon · UNISABANA</small>
      </footer>
    </aside>
  );
}
