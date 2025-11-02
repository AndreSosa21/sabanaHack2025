import { useRef, useState } from "react";
import RiverColumnSim from "../components/RiverColumnSim.jsx";
import StatCard from "../components/StatCard.jsx";

export default function Simulacion(){
  const [region, setRegion] = useState("Tramo Medio");
  const lastRef = useRef(null);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h2>Simulación</h2>
          <p className="muted">Columna de instrumentación 3D · niveles, lluvia, turbidez y velocidad</p>
        </div>
        <div className="controls">
          <label className="select">
            <span>Región</span>
            <select value={region} onChange={(e)=>setRegion(e.target.value)}>
              <option>Tramo Alto</option>
              <option>Tramo Medio</option>
              <option>Tramo Bajo</option>
            </select>
          </label>
        </div>
      </header>

      <div className="grid-2">
        <div className="card" style={{padding:12}}>
          <RiverColumnSim
            regionName={region}
            onData={(d)=>{ lastRef.current = d; }}
          />
        </div>

        <div className="card" style={{display:"flex", flexDirection:"column", gap:10}}>
          <div className="card-header">
            <h3>Lecturas en tiempo real</h3>
            <span className="hint">Actualiza 1 Hz</span>
          </div>

          <div className="grid-2">
            <StatCard title="Nivel" value={lastRef.current?.level_m ?? 0} unit="m" subtitle="Ultrasónico" />
            <StatCard title="Lluvia" value={lastRef.current?.rain_mmph ?? 0} unit="mm/h" subtitle="Pluviómetro" />
            <StatCard title="Turbidez" value={lastRef.current?.turbidity_ntu ?? 0} unit="NTU" subtitle="Óptica" />
            <StatCard title="Velocidad" value={lastRef.current?.velocity_mps ?? 0} unit="m/s" subtitle="ADCP" />
          </div>

          <div className="muted" style={{fontSize:12}}>
            Tip: arrastra el control de lluvia en el HUD para ver cómo cambian nivel, turbidez y velocidad.
          </div>
        </div>
      </div>
    </section>
  );
}
