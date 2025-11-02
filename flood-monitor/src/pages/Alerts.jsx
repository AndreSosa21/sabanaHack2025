import { useSimulatedSensors } from "../hooks/useSimulatedSensors.js";
import StatCard from "../components/StatCard.jsx";

const ENTITIES = [
  { id:"alcaldia", name:"Alcaldía" },
  { id:"bomberos", name:"Bomberos" },
  { id:"gobierno", name:"Gobierno" },
  { id:"salud", name:"Hospital / 911" },
  { id:"gobernacion", name:"Gobernación" },
  { id:"altavoces", name:"Altavoces Comunitarios" }
];

function localEntityActions({ region, risk, features }) {
  const { volume, precipitation, velocity, turbidity } = features;
  const msgBase = `Región ${region}. Probabilidad ${(risk.score*100).toFixed(0)}%.`;
  return ENTITIES.map(e => ({
    id:e.id,
    name:e.name,
    message: msgBase + ` Acción recomendada según nivel ${risk.level}`,
    actions:[
      turbidity>80 ? "Muestreo de agua" : "Monitoreo normal",
      velocity>1.8 ? "Precaución corrientes" : "Rutas seguras",
      precipitation>3 ? "Verificar vías encharcadas" : "Sin alerta adicional"
    ]
  }));
}

export default function Alerts() {
  const { region, features, risk } = useSimulatedSensors();
  const entityRecs = localEntityActions({ region, risk, features });

  return (
    <section className="page">
      <header className="page-header">
        <h2>Alertas</h2>
        <p className="muted">Simulación basada en datos ajustables</p>
      </header>

      <div className="grid-2">
        <div>
          {entityRecs.map(e => (
            <div key={e.id} className="card" style={{margin:"8px 0"}}>
              <strong>{e.name}</strong>
              <p>{e.message}</p>
              <ul>{e.actions.map((a,i)=><li key={i}>{a}</li>)}</ul>
            </div>
          ))}
        </div>

        <div className="card" style={{display:"flex", flexDirection:"column", gap:10}}>
          <StatCard title="Nivel" value={features.volume/2} unit="m" />
          <StatCard title="Precipitación" value={features.precipitation} unit="mm/h" />
          <StatCard title="Velocidad" value={features.velocity} unit="m/s" />
          <StatCard title="Turbidez" value={features.turbidity} unit="NTU" />
        </div>
      </div>
    </section>
  );
}
