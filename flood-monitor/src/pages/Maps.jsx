// src/pages/Mapas.jsx
import { useState } from "react";
import ArcGISWebMap from "../components/ArcGISWebMap.jsx";

const WEBMAP_ID = "PON_AQUI_EL_ID_DEL_WEBMAP"; // <-- reemplaza cuando lo tengas
const REGIONS = ["Tramo Alto", "Tramo Medio", "Tramo Bajo"];

export default function Mapas(){
  const [mode, setMode] = useState("embed"); // "embed" | "native"
  const [region, setRegion] = useState("Tramo Medio");

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h2>Mapas</h2>
          <p className="muted">Quebrada La Esmeralda · Tocancipá</p>
        </div>
        <div className="controls">
          <label className="select">
            <span>Modo</span>
            <select value={mode} onChange={(e)=>setMode(e.target.value)}>
              <option value="embed">Oficial (App embebida)</option>
              <option value="native">Nativo (Web Map)</option>
            </select>
          </label>
          {mode==="native" && (
            <label className="select">
              <span>Región</span>
              <select value={region} onChange={(e)=>setRegion(e.target.value)}>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          )}
        </div>
      </header>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {mode === "embed" ? (
          <iframe
            title="Cundinamarca Web App"
            src="https://cundinamarca-map.maps.arcgis.com/apps/webappviewer/index.html?id=467db1a17fa54990bf3ad5d2893b04dc"
            style={{ width: "100%", height: "78vh", border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <ArcGISWebMap webmapId={WEBMAP_ID} region={region} />
        )}
      </div>
    </section>
  );
}
