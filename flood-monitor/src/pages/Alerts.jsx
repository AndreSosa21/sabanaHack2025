// src/pages/Alerts.jsx
// Requiere: react-leaflet, leaflet (y su CSS en main.jsx), lucide-react
// Asegúrate de tener en main.jsx: import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";
import {
  Siren,
  ShieldAlert,
  MapPin,
  Waves,
  Droplets,
  Activity,
  Megaphone,
  Building2,
  Flame,
  Shield,
  Ambulance,
  Landmark,
  Phone,
  History,
} from "lucide-react";
import { useSensors } from "../hooks/useSensors.js";

/* =========================================
   CONFIG BÁSICA
========================================= */
const REGIONS = ["Tramo Alto", "Tramo Medio", "Tramo Bajo"];
const REGION_VULN = { "Tramo Alto": 0.45, "Tramo Medio": 0.60, "Tramo Bajo": 0.75 };

// Lugares críticos (SIMULADOS — reemplaza con tus coordenadas reales si las tienes)
const CRITICAL_PLACES = [
  { id: "bridge-mid", name: "Puente Quebrada Esmeralda (Medio)", type: "bridge", lat: 4.962, lon: -73.908, region: "Tramo Medio" },
  { id: "confluence-low", name: "Confluencia afluente (Bajo)",   type: "confluence", lat: 4.956, lon: -73.915, region: "Tramo Bajo" },
  { id: "spring-high", name: "Nacedero (Alto)",                   type: "spring", lat: 4.969, lon: -73.918, region: "Tramo Alto" },
  { id: "community-mid", name: "Centro Comunitario Esmeralda",    type: "community", lat: 4.965, lon: -73.913, region: "Tramo Medio" },
  { id: "intake-low", name: "Bocatoma veredal",                   type: "intake", lat: 4.958, lon: -73.905, region: "Tramo Bajo" },
  { id: "mining-low", name: "Frente de minería",                  type: "mining", lat: 4.954, lon: -73.912, region: "Tramo Bajo" },
];

// Entidades
const ENTITIES = [
  { id: "alcaldia",    name: "Alcaldía Municipal de Tocancipá", role: "Plan Municipal de Gestión del Riesgo", need: "Visualizar niveles y lluvias para alertas oficiales." },
  { id: "bomberos",    name: "Cuerpo de Bomberos",              role: "Atención inmediata",                   need: "Saber zonas de impacto y rutas." },
  { id: "gobierno",    name: "Secretaría de Gobierno",          role: "Logística y orden público",           need: "Coordinar cierres/evacuaciones." },
  { id: "salud",       name: "Hospital / 911",                  role: "Atención médica",                     need: "Preparar ambulancias y triage." },
  { id: "gobernacion", name: "Gobernación de Cundinamarca",     role: "Coordinación intermunicipal",         need: "Sincronizar alertas." },
  { id: "altavoces",   name: "Altavoces Comunitarios",          role: "Difusión comunitaria",                need: "Emitir mensajes preventivos y evacuación." },
];

// Icono + contactos DEMO por entidad (ajusta a tus números reales si los tienes)
const ENTITY_META = {
  alcaldia: {
    icon: Building2,
    color: "var(--blue-400)",
    contacts: [
      { label: "PBX (demo)", value: "(+57) 601 555 0101", href: "tel:+576015550101" },
      { label: "Correo (demo)", value: "gestionriesgo@tocancipa.gov.co" }
    ]
  },
  bomberos: {
    icon: Flame,
    color: "var(--danger)",
    contacts: [
      { label: "Emergencias", value: "123", href: "tel:123" },
      { label: "Base (demo)", value: "(+57) 601 555 0202", href: "tel:+576015550202" }
    ]
  },
  gobierno: {
    icon: Shield,
    color: "#ffd07a",
    contacts: [
      { label: "PBX (demo)", value: "(+57) 601 555 0303", href: "tel:+576015550303" }
    ]
  },
  salud: {
    icon: Ambulance,
    color: "#9ec5ff",
    contacts: [
      { label: "Emergencias", value: "123", href: "tel:123" },
      { label: "Hospital (demo)", value: "(+57) 601 555 0404", href: "tel:+576015550404" }
    ]
  },
  gobernacion: {
    icon: Landmark,
    color: "var(--blue-700)",
    contacts: [
      { label: "Sala CRUE (demo)", value: "(+57) 601 555 0505", href: "tel:+576015550505" }
    ]
  },
  altavoces: {
    icon: Megaphone,
    color: "var(--brand)",
    contacts: [
      { label: "Operador (demo)", value: "(+57) 601 555 0606", href: "tel:+576015550606" }
    ]
  }
};

/* =========================================
   MODELO (logística heurística)
========================================= */
const sigmoid = (z) => 1/(1+Math.exp(-z));
function floodProbability({ volume, precipitation, velocity, turbidity, vuln }) {
  const w = { bias:-2.2, vol:0.28, precip:1.05, vel:0.45, turb:0.12, vuln:1.15 };
  const v = Math.min(volume/15,1), p = Math.min(precipitation/5,1), u = Math.min(velocity/3,1), t = Math.min(turbidity/250,1);
  return Number(sigmoid(w.bias + w.vol*v + w.precip*p + w.vel*u + w.turb*t + w.vuln*vuln).toFixed(3));
}
function levelFromProb(prob){
  if (prob>=0.80) return { level:"red",    label:"Emergencia" };
  if (prob>=0.60) return { level:"orange", label:"Alerta" };
  if (prob>=0.35) return { level:"yellow", label:"Vigilancia" };
  return { level:"green", label:"Normal" };
}

// Reglas locales (priorizadas)
function localEntityActions({ region, prob, level, features }) {
  const { volume, precipitation, velocity, turbidity } = features;
  const msgBase = `Región ${region}. Probabilidad ${Math.round(prob*100)}%.`;
  const recos = {
    alcaldia: [
      "Emitir boletín oficial por canales municipales.",
      "Convocar PMU y activar monitoreo continuo.",
      "Definir umbrales de cierre de vías y rutas de evacuación."
    ],
    bomberos: [
      "Desplegar rescate acuático y motobombas.",
      "Preposicionar unidades en vados y puentes bajos.",
      "Confirmar comunicación con Defensa Civil y Cruz Roja."
    ],
    gobierno: [
      "Habilitar puntos de encuentro y transporte para evacuación.",
      "Cierre parcial de vías bajas y control de acceso a riberas.",
      "Señalización temporal y desvíos."
    ],
    salud: [
      "Aumentar personal de triage y urgencias.",
      "Disponibilidad de ambulancias y rutas sanitarias.",
      "Stock de insumos para hipotermia y primeros auxilios."
    ],
    gobernacion: [
      "Notificar y coordinar apoyo intermunicipal.",
      "Evaluar préstamo de motobombas y maquinaria.",
      "Sincronizar alertas aguas abajo."
    ],
    altavoces: [
      "EVACUACIÓN INMEDIATA hacia puntos seguros.",
      "Evitar cruzar puentes bajos o cauces.",
      "Atender indicaciones oficiales."
    ],
  };
  if (turbidity>80) recos.alcaldia.push("Muestreo de calidad de agua por arrastre minero.");
  if (velocity>1.8) recos.bomberos.push("Precaución por corrientes fuertes en pasos peatonales.");
  if (precipitation>3) recos.gobierno.push("Priorizar vías con historial de encharcamiento.");
  if (volume>12) recos.gobernacion.push("Maquinaria para encauzamiento temporal.");
  return ENTITIES.map(e=>({
    id:e.id, name:e.name, role:e.role, need:e.need,
    message:`${msgBase} ${recos[e.id][0]}`,
    actions: recos[e.id].slice(0,4)
  }));
}

function broadcastTTS(text){
  try { const u=new SpeechSynthesisUtterance(text); u.lang="es-CO"; u.rate=1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
}

/* =========================================
   COMPONENTE PRINCIPAL
========================================= */
export default function Alerts(){
  const [tab, setTab] = useState("resumen"); // resumen | entidades | mapa | sim
  const [region, setRegion] = useState("Tramo Medio");
  const { data } = useSensors(region);

  const [sim, setSim] = useState({ volume:6.0, precipitation:0.8, velocity:1.0, turbidity:18 });
  const [mode, setMode] = useState("live");

  const features = useMemo(()=>{
    const base = mode==="live" ? data : sim;
    return { ...base, vuln: REGION_VULN[region] ?? 0.6 };
  }, [mode, data, sim, region]);

  const prob = floodProbability(features);
  const { level, label } = levelFromProb(prob);
  const entityRecs = useMemo(()=>localEntityActions({ region, prob, level, features }), [region, prob, level, features]);

  // TOP acciones (3 más relevantes, una por entidad clave)
  const topActions = useMemo(()=>{
    const picks = [
      entityRecs.find(x=>x.id==="altavoces")?.actions?.[0],
      entityRecs.find(x=>x.id==="bomberos")?.actions?.[0],
      entityRecs.find(x=>x.id==="alcaldia")?.actions?.[0],
    ].filter(Boolean);
    return picks;
  }, [entityRecs]);

  // Mensaje altavoces
  const speakerText = (
    level==="red"    ? `Atención ${region}. Emergencia por alta probabilidad de inundación. Evacuar a puntos seguros.` :
    level==="orange" ? `Atención ${region}. Alerta por posible inundación. Evitar puentes bajos y cauces.` :
    level==="yellow" ? `Aviso preventivo en ${region}. Se incrementa caudal y lluvia, tome precauciones.` :
                       `Condiciones normales en ${region}. Mantenga precauciones generales.`
  );

  // Lugares filtrados por región
  const places = useMemo(()=>CRITICAL_PLACES.filter(p=>p.region===region), [region]);

  // Histórico local por entidad (demo)
  const [history, setHistory] = useState(() => {
    const now = Date.now();
    const mk = (txt, minsAgo) => ({ ts: new Date(now - minsAgo*60000), text: txt });
    return {
      alcaldia:    [ mk("Se envió boletín preventivo", 120), mk("PMU en vigilancia", 45) ],
      bomberos:    [ mk("Preposicionamiento en puente Medio", 60) ],
      gobierno:    [ mk("Cierre parcial vía baja (simulado)", 30) ],
      salud:       [ mk("Triage en alerta amarilla", 50) ],
      gobernacion: [ mk("CRUE notificado", 40) ],
      altavoces:   [ mk("Mensaje preventivo reproducido", 25) ],
    };
  });

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h2>Alertas</h2>
          <p className="muted">Quebrada Esmeralda · Vereda La Esmeralda (Tocancipá)</p>
        </div>

        <div className="controls">
          <label className="select">
            <span>Región</span>
            <select value={region} onChange={(e)=>setRegion(e.target.value)}>
              {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          <nav className="tabbar">
            {["resumen","entidades","sim"].map(id=>(
              <button key={id} className={`tab ${tab===id?'active':''}`} onClick={()=>setTab(id)}>
                {id==="resumen"   && <ShieldAlert className="nav-icon" />}
                {id==="entidades" && <Siren className="nav-icon" />}
                {id==="sim"       && <Activity className="nav-icon" />}
                <span style={{textTransform:"capitalize"}}>{id}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ======= RESUMEN (tarjetas y sugerencias) ======= */}
      {tab==="resumen" && (
        <>
          <div className="grid-3">
            <AlertCard level={level} label={label} prob={prob} region={region} onBroadcast={()=>broadcastTTS(speakerText)} />
            <KpiCard title="Volumen"        value={features.volume}        unit="m³/s" icon={<Waves />} />
            <KpiCard title="Precipitación"  value={features.precipitation} unit="mm/h" icon={<Droplets />} />
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Acciones inmediatas sugeridas</h3>
              <span className="hint">Generadas por el modelo + reglas locales</span>
            </div>
            <ol className="priority-list">
              {topActions.map((t,i)=><li key={i}>{t}</li>)}
            </ol>
            
          </div>

         
        </>
      )}

      {/* ======= ENTIDADES (cards a ancho completo, acordeón) ======= */}
      {tab==="entidades" && (
        <div className="entity-list">
          {entityRecs.map((e)=>(
            <EntityAccordionItem
              key={e.id}
              entity={e}
              meta={ENTITY_META[e.id]}
              level={level}
              label={label}
              onAddHistory={(text)=>{
                setHistory(h=>({
                  ...h,
                  [e.id]: [{ ts: new Date(), text }, ...(h[e.id]||[])].slice(0,8)
                }));
              }}
              historyItems={history[e.id]||[]}
            />
          ))}
        </div>
      )}

      {/* ======= MAPA ======= */}
      

      {/* ======= SIMULACIÓN ======= */}
      {tab==="sim" && (
        <div className="card">
          <div className="card-header">
            <h3>Simulación de variables</h3>
            <span className="hint">Mueve los sliders para ver cómo cambian las alertas</span>
          </div>
          <div className="sliders">
            <SimSlider label="Volumen (m³/s)"       min={0}  max={15}  step={0.1}  value={sim.volume}        onChange={(v)=>{ setSim(s=>({...s,volume:v})); setMode("sim"); }} />
            <SimSlider label="Precipitación (mm/h)" min={0}  max={5}   step={0.1}  value={sim.precipitation} onChange={(v)=>{ setSim(s=>({...s,precipitation:v})); setMode("sim"); }} />
            <SimSlider label="Velocidad (m/s)"      min={0}  max={3}   step={0.05} value={sim.velocity}      onChange={(v)=>{ setSim(s=>({...s,velocity:v})); setMode("sim"); }} />
            <SimSlider label="Turbidez (NTU)"       min={0}  max={250} step={1}    value={sim.turbidity}     onChange={(v)=>{ setSim(s=>({...s,turbidity:v})); setMode("sim"); }} />
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================
   SUBCOMPONENTES UI
========================================= */
function AlertCard({ level, label, prob, region, onBroadcast }){
  return (
    <div className={`card alert-card ${level}`}>
      <div className="alert-card-top">
        <ShieldAlert className="big-icon" />
        <div>
          <h3>{label}</h3>
          <p className="muted">Probabilidad {Math.round(prob*100)}% · {region}</p>
        </div>
      </div>
      <button className="btn danger" onClick={onBroadcast}>
        <Megaphone className="nav-icon" /> Altavoces
      </button>
    </div>
  );
}

function KpiCard({ title, value, unit, icon }){
  return (
    <div className="card kpi-card">
      <div className="kpi-head">
        {icon && <i className="kpi-icon">{icon}</i>}
        <span>{title}</span>
      </div>
      <div className="kpi-value">
        <strong>{value}</strong> <small>{unit}</small>
      </div>
    </div>
  );
}

function SimSlider({ label, min, max, step, value, onChange }){
  return (
    <label className="sim-slider">
      <div className="sim-row"><span>{label}</span><strong>{value}</strong></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e)=>onChange(Number(e.target.value))} />
    </label>
  );
}

function InlineMap({ places, level, big=false }){
  const center = places.length ? [places[0].lat, places[0].lon] : [4.965,-73.913];
  const colorByType = (t)=>{
    switch(t){
      case "bridge": return "#6EA3FF";
      case "confluence": return "#1E4FAB";
      case "spring": return "#22d3ee";
      case "intake": return "#10B981";
      case "mining": return "#FFC107";
      case "community": return "#E30613";
      default: return "#6EA3FF";
    }
  };
  const ring = level==="red" ? "rgba(227,6,19,.45)"
            : level==="orange" ? "rgba(255,159,67,.45)"
            : level==="yellow" ? "rgba(255,193,7,.45)"
            : "rgba(16,185,129,.35)";

  return (
    <div style={{ height: big? "65vh":"42vh", width:"100%", borderRadius:16, overflow:"hidden" }}>
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height:"100%", width:"100%" }}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {places.map(p=>(
          <CircleMarker key={p.id} center={[p.lat,p.lon]} radius={8}
            pathOptions={{ color: colorByType(p.type), fillColor: colorByType(p.type), fillOpacity:.85 }}
          >
            <Popup>
              <strong>{p.name}</strong><br/>
              Tipo: {p.type}<br/>
              Región: {p.region}
            </Popup>
          </CircleMarker>
        ))}
        {/* anillo de riesgo general */}
        <CircleMarker center={center} radius={60} pathOptions={{ color:ring, fillOpacity:0 }} />
      </MapContainer>
    </div>
  );
}

/* ====== Entidades: acordeón a ancho completo ====== */
function EntityAccordionItem({ entity, meta, level, label, historyItems, onAddHistory }) {
  const [open, setOpen] = useState(false);
  const Icon = meta?.icon || Shield;

  const copyMsg = async () => {
    const txt = `${entity.name} · ${entity.message}\nAcciones: ${entity.actions.join("; ")}`;
    try { await navigator.clipboard.writeText(txt); } catch {}
    onAddHistory("Mensaje copiado al portapapeles");
  };

  const callFirst = () => {
    const c = meta?.contacts?.find(c=>c.href?.startsWith("tel:"));
    if (c?.href) window.location.href = c.href;
  };

  return (
    <div className={`card entity-accordion ${open?'open':''}`} onClick={()=>setOpen(o=>!o)}>
      <div className="entity-row">
        <div className="entity-left">
          <span className="entity-icon" style={{ background: meta?.color || "rgba(255,255,255,.08)" }}>
            <Icon className="nav-icon" />
          </span>
          <div className="entity-titles">
            <h3>{entity.name}</h3>
            <p className="muted">{entity.role}</p>
          </div>
        </div>
        <div className="entity-right">
          <span className={`chip ${level}`}>{label}</span>
        </div>
      </div>

      {open && (
        <div className="entity-body" onClick={(e)=>e.stopPropagation()}>
          {/* CONTACTOS */}
          <section className="entity-section">
            <h4>Contactos</h4>
            <ul className="contacts">
              {(meta?.contacts||[]).map((c, i)=>(
                <li key={i}>
                  <Phone className="mini-icon" />
                  <span className="contact-label">{c.label}:</span>
                  {c.href
                    ? <a href={c.href} onClick={(ev)=>ev.stopPropagation()}>{c.value}</a>
                    : <span>{c.value}</span>}
                </li>
              ))}
            </ul>
            <div className="entity-actions-inline">
              <button className="btn" onClick={callFirst}><Phone className="mini-icon" /> Llamar</button>
              <button className="btn" onClick={copyMsg}><History className="mini-icon" /> Copiar mensaje</button>
            </div>
          </section>

          {/* SUGERENCIAS */}
          <section className="entity-section">
            <h4>Sugerencias</h4>
            <p className="muted" style={{margin:"6px 0"}}>{entity.message}</p>
            <ul className="actions">
              {entity.actions.map((a,i)=><li key={i}>• {a}</li>)}
            </ul>
          </section>

          {/* HISTÓRICO */}
          <section className="entity-section">
            <h4>Histórico</h4>
            <ul className="history">
              {historyItems.length
                ? historyItems.map((h,i)=>(
                    <li key={i}>
                      <time>{fmtTime(h.ts)}</time>
                      <span>{h.text}</span>
                    </li>
                  ))
                : <li className="muted">Sin registros</li>}
            </ul>
            <div className="entity-actions-inline">
              <button className="btn" onClick={()=>onAddHistory("Evento registrado manualmente")}>
                <History className="mini-icon" /> Registrar evento
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function fmtTime(ts){
  try{
    return new Date(ts).toLocaleString("es-CO", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit" });
  }catch{ return "" }
}
