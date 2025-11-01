import { useState } from "react";
import StatCard from "../components/StatCard.jsx";
import { useSensors } from "../hooks/useSensors.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import ForecastPanel from "../components/ForecastPanel.jsx";

export default function Dashboard() {
  const [region, setRegion] = useState("Tramo Medio");
  const { data, risk, regions } = useSensors(region);

  // Mini series para los gráficos (mock en tiempo real)
  const now = new Date();
  const chartData = Array.from({ length: 8 }).map((_, i) => {
    const t = new Date(now.getTime() - (7 - i) * 5 * 60 * 1000); // cada 5 min
    return {
      time: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      volume: +(data.volume + (Math.random() - 0.5)).toFixed(2),
      velocity: +(data.velocity + (Math.random() - 0.5) * 0.2).toFixed(2),
      turbidity: Math.max(0, +(data.turbidity + (Math.random() - 0.5) * 3).toFixed(2)),
      precipitation: Math.max(0, +(data.precipitation + (Math.random() - 0.5) * 0.4).toFixed(2)),
    };
  });

  const statusFor = (k) => {
    switch (k) {
      case "volume": return data.volume > 10 ? "warn" : "ok";
      case "velocity": return data.velocity > 1.8 ? "warn" : "ok";
      case "turbidity": return data.turbidity > 50 ? "warn" : "ok";
      case "precipitation": return data.precipitation > 3.5 ? "warn" : "ok";
      default: return "ok";
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">Monitoreo en tiempo real por región</p>
        </div>
        <div className="controls">
          <label className="select">
            <span>Región</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <div className={`risk-chip ${risk.level}`}>
            Riesgo: <strong>{(risk.score * 100).toFixed(0)}%</strong>
          </div>
        </div>
      </header>

      <div className="grid-4">
        <StatCard title="Volumen" value={data.volume} unit="m³/s" subtitle="Caudal instantáneo"
                  status={risk.level === "danger" || data.volume > 12 ? "warn" : "ok"} />
        <StatCard title="Precipitación" value={data.precipitation} unit="mm/h" subtitle="API meteo "
                  status={statusFor("precipitation")} />
        <StatCard title="Velocidad del agua" value={data.velocity} unit="m/s" subtitle="Punto crítico escalado"
                  status={statusFor("velocity")} />
        <StatCard title="Turbidez" value={data.turbidity} unit="NTU" subtitle="Sedimentos / minería"
                  status={statusFor("turbidity")} />
      </div>

      <div className="grid-2">
        <div className="card chart">
          <div className="card-header">
            <h3>Evolución de Volumen y Velocidad</h3>
            <span className="hint">Últimos ~40 min</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="volume" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="velocity" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart">
          <div className="card-header">
            <h3>Precipitación y Turbidez</h3>
            <span className="hint">Relación lluvia–sedimentos</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="precipitation" />
              <Bar dataKey="turbidity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
      </div>

    
    </section>
  );
}
