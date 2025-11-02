// src/pages/Alerts.jsx
// Versión sin simulación: usa exactamente los mismos valores “live” del hook useSensors (como el Dashboard).
// Requiere: lucide-react (iconos). Quita react-leaflet porque aquí no lo usamos.

import { useMemo, useState } from "react";
import {
  Siren,
  ShieldAlert,
  Waves,
  Droplets,
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
   REGLAS DE ACCIÓN (usa risk + datos en vivo)
========================================= */
function localEntityActions({ region, prob, level, features }) {
  const { volume, precipitation, velocity, turbidity } = features;
  const msgBase = `Región ${region}. Probabilidad ${Math.round(prob * 100)}%.`;

  const recos = {
    alcaldia: [
      "Convocar PMU y activar monitoreo continuo.",
      "Definir umbrales de cierre de vías y rutas de evacuación."
    ],
    bomberos: [
      "Preposicionar unidades en vados y puentes bajos.",
      "Verificar equipos de rescate acuático y motobombas."
    ],
    gobierno: [
      "Cierre parcial de vías bajas y control de acceso a riberas.",
      "Señalización temporal y desvíos."
    ],
    salud: [
      "Disponibilidad de ambulancias y rutas sanitarias.",
      "Aumentar personal de triage y urgencias."
    ],
    gobernacion: [
      "Coordinar apoyo intermunicipal.",
      "Prever préstamo de motobombas/maquinaria."
    ],
    altavoces: [
      "Mensaje preventivo por altavoces.",
      "Evitar cruzar puentes bajos o cauces."
    ],
  };

  // Ajustes por severidad (usa valores del hook: ok | watch | warn | danger)
  if (level === "warn" || level === "danger") {
    recos.alcaldia.unshift("Emitir boletín oficial por canales municipales.");
    recos.gobierno.unshift("Habilitar puntos de encuentro y transporte para evacuación.");
    recos.bomberos.unshift("Desplegar equipo de rescate y motobombas a puntos críticos.");
    recos.salud.unshift("Incrementar capacidad de urgencias y triage.");
    recos.altavoces.unshift(
      level === "danger"
        ? "EVACUACIÓN INMEDIATA de zonas ribereñas hacia puntos seguros."
        : "Alerta NARANJA: evitar desplazamientos por zonas inundables."
    );
  }

  // Ajustes contextuales con los datos live
  if (turbidity > 80) recos.alcaldia.push("Muestreo de calidad de agua por posible arrastre minero.");
  if (velocity > 1.8) recos.bomberos.push("Precaución por corrientes fuertes en pasos peatonales.");
  if (precipitation > 3) recos.gobierno.push("Priorizar vías con historial de encharcamiento.");
  if (volume > 12) recos.gobernacion.push("Maquinaria para encauzamiento/contención temporal.");

  return ENTITIES.map((e) => ({
    id: e.id,
    name: e.name,
    role: e.role,
    need: e.need,
    message: `${msgBase} ${recos[e.id][0]}`,
    actions: recos[e.id].slice(0, 4),
  }));
}

function broadcastTTS(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-CO";
    u.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

/* =========================================
   COMPONENTE PRINCIPAL (solo “resumen” y “entidades”)
========================================= */
export default function Alerts() {
  const [tab, setTab] = useState("resumen"); // resumen | entidades
  const [region, setRegion] = useState("Tramo Medio");

  // Datos EN VIVO del mismo hook del dashboard
  const { data, risk, regions } = useSensors(region);

  const features = data; // usa el mismo paquete live (volume, precipitation, velocity, turbidity)

  const entityRecs = useMemo(
    () => localEntityActions({ region, prob: risk.score, level: risk.level, features }),
    [region, risk.score, risk.level, features]
  );

  // TOP acciones (3 más relevantes, una por entidad clave)
  const topActions = useMemo(() => {
    const picks = [
      entityRecs.find((x) => x.id === "altavoces")?.actions?.[0],
      entityRecs.find((x) => x.id === "bomberos")?.actions?.[0],
      entityRecs.find((x) => x.id === "alcaldia")?.actions?.[0],
    ].filter(Boolean);
    return picks;
  }, [entityRecs]);

  // Mensaje altavoces basado en risk.level
  const speakerText =
    risk.level === "danger"
      ? `Atención comunidad de ${region}. Emergencia por alta probabilidad de inundación. Evacúen a los puntos seguros.`
      : risk.level === "warn"
      ? `Atención comunidad de ${region}. Alerta por posible inundación. Eviten cruzar puentes bajos o cauces.`
      : risk.level === "watch"
      ? `Aviso preventivo en ${region}. Aumenta caudal y lluvia. Tome precauciones.`
      : `Condiciones normales en ${region}. Mantenga buenas prácticas de cuidado del entorno.`;

  // Histórico local por entidad (demo)
  const [history, setHistory] = useState(() => ({}));

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
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <nav className="tabbar">
            {["resumen", "entidades"].map((id) => (
              <button
                key={id}
                className={`tab ${tab === id ? "active" : ""}`}
                onClick={() => setTab(id)}
              >
                {id === "resumen" && <ShieldAlert className="nav-icon" />}
                {id === "entidades" && <Siren className="nav-icon" />}
                <span style={{ textTransform: "capitalize" }}>{id}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ======= RESUMEN (tarjeta de estado + KPIs + sugerencias) ======= */}
      {tab === "resumen" && (
        <>
          <div className="grid-3">
            <AlertCard
              level={risk.level}
              label={risk.label}
              prob={risk.score}
              region={region}
              onBroadcast={() => broadcastTTS(speakerText)}
            />
            <KpiCard title="Volumen" value={features.volume} unit="m³/s" icon={<Waves />} />
            <KpiCard title="Precipitación" value={features.precipitation} unit="mm/h" icon={<Droplets />} />
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Acciones inmediatas sugeridas</h3>
              <span className="hint">Generadas por el modelo + reglas locales</span>
            </div>
            <ol className="priority-list">
              {topActions.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>
        </>
      )}

      {/* ======= ENTIDADES (cards a ancho completo, desplegables) ======= */}
      {tab === "entidades" && (
        <div className="entity-list">
          {entityRecs.map((e) => (
            <EntityAccordionItem
              key={e.id}
              entity={e}
              meta={ENTITY_META[e.id]}
              level={risk.level}
              label={risk.label}
              onAddHistory={(text) => {
                setHistory((h) => ({
                  ...h,
                  [e.id]: [{ ts: new Date(), text }, ...(h[e.id] || [])].slice(0, 8),
                }));
              }}
              historyItems={history[e.id] || []}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================================
   SUBCOMPONENTES UI
========================================= */
function AlertCard({ level, label, prob, region, onBroadcast }) {
  const copyAll = async () => {
    const txt = `(${label}) Prob. inundación ${Math.round(prob * 100)}% · ${region}`;
    try {
      await navigator.clipboard.writeText(txt);
    } catch {}
  };

  return (
    <div className={`card alert-card ${level}`}>
      <div className="alert-card-top">
        <ShieldAlert className="big-icon" />
        <div>
          <h3>{label}</h3>
          <p className="muted">
            Probabilidad {Math.round(prob * 100)}% · {region}
          </p>
        </div>
      </div>

      <div className="alert-actions" style={{ marginTop: 8 }}>
        <button className="btn danger" onClick={onBroadcast}>
          🔊 Altavoces
        </button>
        <button className="btn" onClick={copyAll}>
          📋 Copiar
        </button>
      </div>
    </div>
  );
}

function KpiCard({ title, value, unit, icon }) {
  return (
    <div className="card kpi-card">
      <div className="kpi-head">
        {icon && <i className="kpi-icon">{icon}</i>}
        <span>{title}</span>
      </div>
      <div className="kpi-value">
        <strong>{Number.isFinite(value) ? value : "—"}</strong> <small>{unit}</small>
      </div>
    </div>
  );
}

/* ====== Entidades: acordeón a ancho completo ====== */
function EntityAccordionItem({ entity, meta, level, label, historyItems, onAddHistory }) {
  const [open, setOpen] = useState(false);
  const Icon = meta?.icon || Shield;

  const copyMsg = async () => {
    const txt = `${entity.name} · ${entity.message}\nAcciones: ${entity.actions.join("; ")}`;
    try {
      await navigator.clipboard.writeText(txt);
    } catch {}
    onAddHistory("Mensaje copiado al portapapeles");
  };

  const callFirst = () => {
    const c = meta?.contacts?.find((c) => c.href?.startsWith("tel:"));
    if (c?.href) window.location.href = c.href;
  };

  return (
    <div className={`card entity-accordion ${open ? "open" : ""}`} onClick={() => setOpen((o) => !o)}>
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
        <div className="entity-body" onClick={(e) => e.stopPropagation()}>
          {/* CONTACTOS */}
          <section className="entity-section">
            <h4>Contactos</h4>
            <ul className="contacts">
              {(meta?.contacts || []).map((c, i) => (
                <li key={i}>
                  <Phone className="mini-icon" />
                  <span className="contact-label">{c.label}:</span>
                  {c.href ? (
                    <a href={c.href} onClick={(ev) => ev.stopPropagation()}>
                      {c.value}
                    </a>
                  ) : (
                    <span>{c.value}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="entity-actions-inline">
              <button className="btn" onClick={callFirst}>
                <Phone className="mini-icon" /> Llamar
              </button>
              <button className="btn" onClick={copyMsg}>
                <History className="mini-icon" /> Copiar mensaje
              </button>
            </div>
          </section>

          {/* SUGERENCIAS */}
          <section className="entity-section">
            <h4>Sugerencias</h4>
            <p className="muted" style={{ margin: "6px 0" }}>
              {entity.message}
            </p>
            <ul className="actions">
              {entity.actions.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </section>

          {/* HISTÓRICO */}
          <section className="entity-section">
            <h4>Histórico</h4>
            <ul className="history">
              {historyItems && historyItems.length ? (
                historyItems.map((h, i) => (
                  <li key={i}>
                    <time>{fmtTime(h.ts)}</time>
                    <span>{h.text}</span>
                  </li>
                ))
              ) : (
                <li className="muted">Sin registros</li>
              )}
            </ul>
            <div className="entity-actions-inline">
              <button className="btn" onClick={() => onAddHistory("Evento registrado manualmente")}>
                <History className="mini-icon" /> Registrar evento
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}
