// src/components/ForecastPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { buildForecast, loadMeteoForecast } from "../lib/forecast.js";

const REGION_COORDS = {
  "Tramo Alto":  { lat: 4.969, lon: -73.918, vuln: 0.45 },
  "Tramo Medio": { lat: 4.965, lon: -73.913, vuln: 0.60 },
  "Tramo Bajo":  { lat: 4.958, lon: -73.905, vuln: 0.75 }
};

export default function ForecastPanel({ region="Tramo Medio", nowData, horizon=6 }) {
  const coords = REGION_COORDS[region];
  const [meteo, setMeteo] = useState([]);
  const [scn, setScn] = useState("typical"); // 'dry' | 'typical' | 'wet'
  const [series, setSeries] = useState({ dry:[], typical:[], wet:[] });

  useEffect(()=>{
    (async ()=>{
      try{
        const items = await loadMeteoForecast({ lat: coords.lat, lon: coords.lon, hours: 24 });
        setMeteo(items);
      }catch(e){
        setMeteo([]);
      }
    })();
  }, [coords.lat, coords.lon]);

  useEffect(()=>{
    if (!meteo.length || !nowData) return;
    const scenarios = buildForecast({ initial: nowData, meteo, vuln: coords.vuln, horizonHours: horizon });
    setSeries(scenarios);
  }, [meteo, nowData, coords.vuln, horizon]);

  const merged = useMemo(()=>{
    // Para banda: tomamos min(dry,typical) y max(wet,typical)
    const len = Math.max(series.dry.length, series.typical.length, series.wet.length);
    return Array.from({length: len}).map((_,i)=>{
      const d = series.dry[i] || {};
      const m = series.typical[i] || {};
      const w = series.wet[i] || {};
      const t = m.t || d.t || w.t;
      return {
        t,
        risk_mid: m.risk ?? null,
        risk_min: Math.min(d.risk ?? 1, m.risk ?? 1),
        risk_max: Math.max(w.risk ?? 0, m.risk ?? 0),
        precip: m.precip ?? 0
      };
    });
  }, [series]);

  // Próximo cruce de umbral
  const eta = useMemo(()=>{
    const r = series[scn] || [];
    const idxRed = r.findIndex(x => x.risk >= 0.80);
    const idxOrange = r.findIndex(x => x.risk >= 0.60);
    const idxYellow = r.findIndex(x => x.risk >= 0.35);
    const f = (idx)=> idx>=0 ? minutesToHHMM((idx+1)*30) : null;
    return { yellow: f(idxYellow), orange: f(idxOrange), red: f(idxRed) };
  }, [series, scn]);

  return (
    <div className="card chart">
      <div className="card-header">
        <h3>Previsión {horizon}h · {region}</h3>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <ScenarioTabs scn={scn} setScn={setScn} />
          <span className="hint">Banda = incertidumbre (Seco–Húmedo)</span>
        </div>
      </div>

      {/* Riesgo futuro con banda */}
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" tickFormatter={t => tsLabel(t)} />
          <YAxis domain={[0,1]} tickFormatter={(v)=>`${Math.round(v*100)}%`} />
          <Tooltip labelFormatter={(l)=>tsLabel(l)} formatter={(v, k)=>k.includes('risk')?`${Math.round(v*100)}%`:v} />
          {/* banda */}
          <Area dataKey="risk_max" stroke="transparent" fill="var(--blue-400)" fillOpacity={0.20} />
          <Area dataKey="risk_min" stroke="transparent" fill="var(--bg)" fillOpacity={1} />
          {/* línea central */}
          <Area dataKey="risk_mid" stroke="var(--brand)" fill="transparent" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Tira de horizonte por nivel (legible) */}
      <div style={{marginTop:8}}>
        <HorizonStrip data={series[scn]} />
      </div>

      {/* Chips de ETA */}
      <div style={{display:"flex", gap:8, flexWrap:"wrap", marginTop:10}}>
        <Chip label="Vigilancia ≥35%" value={eta.yellow || "—"} color="#FFC107" />
        <Chip label="Alerta ≥60%"     value={eta.orange || "—"} color="#FF9F43" />
        <Chip label="Emergencia ≥80%" value={eta.red || "—"} color="#E30613" />
      </div>

      {/* Precipitación prevista como barras */}
      <div className="card chart" style={{marginTop:12}}>
        <div className="card-header">
          <h4>Precipitación prevista (Open-Meteo)</h4>
          <span className="hint">mm/h · próximo horizonte</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={series[scn].map(x=>({ t:x.t, precip:x.precip }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" tickFormatter={t => tsLabel(t)} />
            <YAxis />
            <Tooltip labelFormatter={(l)=>tsLabel(l)} />
            <Bar dataKey="precip" radius={[6,6,0,0]} fill="var(--brand)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ScenarioTabs({ scn, setScn }){
  const Tab = ({id, text})=>(
    <button
      className={`btn ${scn===id?'active':''}`}
      onClick={()=>setScn(id)}
      title={`Escenario ${text}`}
    >{text}</button>
  );
  return (
    <div style={{display:"flex", gap:6}}>
      <Tab id="dry" text="Seco" />
      <Tab id="typical" text="Típico" />
      <Tab id="wet" text="Húmedo" />
    </div>
  );
}

function HorizonStrip({ data }){
  if (!data?.length) return null;
  return (
    <div style={{display:"grid", gridTemplateColumns:`repeat(${data.length}, 1fr)`, gap:2}}>
      {data.map((d,i)=>{
        const color = d.risk>=0.80? "var(--danger)" : d.risk>=0.60? "#FF9F43" : d.risk>=0.35? "#FFC107" : "#10B981";
        return (
          <div key={i} title={`${tsLabel(d.t)} · ${Math.round(d.risk*100)}%`}
               style={{height:14, borderRadius:4, background: color, opacity:.9}} />
        );
      })}
    </div>
  );
}

function Chip({ label, value, color }){
  return (
    <span style={{
      border:`1px solid ${color}`, borderRadius:999, padding:"4px 10px",
      fontSize:12, display:"inline-flex", gap:8, alignItems:"center"
    }}>
      <i style={{width:10, height:10, background:color, display:"inline-block", borderRadius:999}} />
      <strong>{label}</strong> <span>{value}</span>
    </span>
  );
}

const tsLabel = (t) => new Date(t).toLocaleTimeString([],{hour:"2-digit", minute:"2-digit"});
const minutesToHHMM = (m) => {
  const h = Math.floor(m/60), mm = m%60;
  return `${h}h ${mm}m`;
};
