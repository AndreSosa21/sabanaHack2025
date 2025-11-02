import { useSimulatedSensors } from "../hooks/useSimulatedSensors.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import StatCard from "../components/StatCard.jsx";

export default function Simulacion() {
  const { region, setRegion, data, setData, history } = useSimulatedSensors();

  const handleChange = (key, value) => setData(prev => ({ ...prev, [key]: Number(value) }));

  return (
    <section className="page">
      <header className="page-header">
        <h2>Simulación</h2>
        <p className="muted">Ajusta los sensores manualmente y observa la evolución</p>
        <div className="controls">
          <label>
            Región:
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {["Tramo Alto","Tramo Medio","Tramo Bajo"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
      </header>

      <div className="grid-2">
        <div className="card" style={{ padding:12, display:"flex", flexDirection:"column", gap:20 }}>
          {[
            { label:"Nivel (m)", key:"level_m", min:0,max:10,step:0.1 },
            { label:"Lluvia (mm/h)", key:"rain_mmph", min:0,max:20,step:0.1 },
            { label:"Turbidez (NTU)", key:"turbidity_ntu", min:0,max:100,step:1 },
            { label:"Velocidad (m/s)", key:"velocity_mps", min:0,max:5,step:0.1 }
          ].map(s => (
            <label key={s.key}>
              {s.label}: {data[s.key]}
              <input type="range" min={s.min} max={s.max} step={s.step}
                     value={data[s.key]} onChange={e=>handleChange(s.key, e.target.value)} />
            </label>
          ))}

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={t => new Date(t).toLocaleTimeString()} />
              <YAxis />
              <Tooltip labelFormatter={t => new Date(t).toLocaleTimeString()} />
              <Line type="monotone" dataKey="level_m" stroke="#4a90e2" dot={false} />
              <Line type="monotone" dataKey="rain_mmph" stroke="#00c49f" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <StatCard title="Nivel" value={data.level_m} unit="m" subtitle="Ultrasónico" />
          <StatCard title="Lluvia" value={data.rain_mmph} unit="mm/h" subtitle="Pluviómetro" />
          <StatCard title="Turbidez" value={data.turbidity_ntu} unit="NTU" subtitle="Óptica" />
          <StatCard title="Velocidad" value={data.velocity_mps} unit="m/s" subtitle="ADCP" />
        </div>
      </div>
    </section>
  );
}
