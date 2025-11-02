import { useSimulatedSensors } from "../hooks/useSimulatedSensors.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import StatCard from "../components/StatCard.jsx";

export default function Dashboard() {
  const { region, features, risk, history } = useSimulatedSensors();

  return (
    <section className="page">
      <header className="page-header">
        <h2>Dashboard</h2>
        <p className="muted">Monitoreo en tiempo real por región</p>
        <div className={`risk-chip ${risk.level}`}>Riesgo: <strong>{(risk.score*100).toFixed(0)}%</strong></div>
      </header>

      <div className="grid-4">
        <StatCard title="Volumen" value={features.volume} unit="m³/s" />
        <StatCard title="Precipitación" value={features.precipitation} unit="mm/h" />
        <StatCard title="Velocidad" value={features.velocity} unit="m/s" />
        <StatCard title="Turbidez" value={features.turbidity} unit="NTU" />
      </div>

      <div className="card chart">
        <h3>Histórico de Nivel y Lluvia</h3>
        <ResponsiveContainer width="100%" height={300}>
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
    </section>
  );
}
