// src/lib/forecast.js
// Pronóstico sencillo para hackathon: precipitación -> caudal/velocidad/turbidez -> riesgo

const CONFIG = {
  // Parámetros aproximados de la microcuenca (ajusta si tienes datos)
  A_km2: 8.0,           // área de aporte (km²) ~ vereda Esmeralda
  C_runoff: 0.5,        // coeficiente de escorrentía
  decay_vol: 0.10,      // decaimiento del caudal por paso
  gain_vel: 0.08,       // cuánto sube la velocidad por sobre-cauda
  base_vol: 6.0,        // caudal “típico” actual (m³/s) para referencia
  base_turb: 18,        // turbidez base (NTU)
  step_minutes: 30      // resolución del horizonte
};

// === Riesgo (misma lógica que en Alertas) ===
function sigmoid(z){ return 1/(1+Math.exp(-z)); }
export function floodProbability({ volume, precipitation, velocity, turbidity, vuln }){
  const w = { bias:-2.2, vol:0.28, precip:1.05, vel:0.45, turb:0.12, vuln:1.15 };
  const v = Math.min(volume / 15, 1);
  const p = Math.min(precipitation / 5, 1);
  const u = Math.min(velocity / 3, 1);
  const t = Math.min(turbidity / 250, 1);
  const x = w.bias + w.vol*v + w.precip*p + w.vel*u + w.turb*t + w.vuln*(vuln ?? 0.6);
  return Number(sigmoid(x).toFixed(3));
}

// Rational Method: Q (m³/s) = C * i(mm/h) * A(km²) / 3.6
function rationalQ(i_mm_h, A_km2, C){ return (C * i_mm_h * A_km2) / 3.6; }

// Sencillo paso de estado
function stepForward(state, precip_mm_h){
  const { A_km2, C_runoff, decay_vol, gain_vel, base_vol, base_turb } = CONFIG;
  // Aporte de escorrentía por precipitación
  const inflow = rationalQ(precip_mm_h, A_km2, C_runoff); // m³/s
  // Nuevo caudal con decaimiento + aporte
  const volume = Math.max(0, state.volume * (1 - decay_vol) + inflow);
  // Velocidad responde al exceso de caudal vs base
  const velocity = Math.max(0, state.velocity + gain_vel * (volume - base_vol));
  // Turbidez: sube si precip y si Δvol positivo
  const deltaV = Math.max(0, volume - state.volume);
  const turbidity = Math.max(0, state.turbidity + 0.5*precip_mm_h + 0.8*deltaV - 0.3*(state.turbidity - base_turb));

  return { volume: +volume.toFixed(2), velocity: +velocity.toFixed(2), turbidity: +turbidity.toFixed(1) };
}

// Construye escenarios a partir del pronóstico de precipitación puntual de Open-Meteo
function scenarioPrecip(p){ 
  return {
    dry: +(p * 0.7).toFixed(2),     // p25 aprox
    typical: +p.toFixed(2),         // p50
    wet: +(p * 1.4).toFixed(2)      // p85 aprox
  };
}

export async function loadMeteoForecast({ lat, lon, hours = 24 }){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&hourly=precipitation,precipitation_probability&timezone=America%2FBogota`;
  const r = await fetch(url);
  const j = await r.json();
  const times = j?.hourly?.time || [];
  const precip = j?.hourly?.precipitation || [];
  // Tomamos solo "hours" y re-muestreamos a step_minutes (30 min)
  const items = times.slice(0, hours).map((t, i) => ({ ts: new Date(t), precip: precip[i] ?? 0 }));
  return items;
}

// Genera series a futuro en pasos de step_minutes para 6–24h
export function buildForecast({ initial, meteo, vuln = 0.6, horizonHours = 6 }){
  const stepMin = CONFIG.step_minutes;
  const steps = Math.max(1, Math.round((horizonHours*60)/stepMin));

  // Partimos del estado actual
  const baseState = { volume: initial.volume, velocity: initial.velocity, turbidity: initial.turbidity };

  // Expandimos precip por paso, interpolando por hora -> 30min
  const precipByStep = [];
  for (let i=0; i<steps; i++){
    const hourIdx = Math.floor((i*stepMin)/60);
    const p = meteo[hourIdx]?.precip ?? 0;
    precipByStep.push(scenarioPrecip(p));
  }

  const scenarios = { dry: [], typical: [], wet: [] };

  // Simulación independiente por escenario
  ["dry","typical","wet"].forEach(scn=>{
    let st = { ...baseState };
    for (let i=0; i<steps; i++){
      const nowP = precipByStep[i][scn];
      const next = stepForward(st, nowP);
      const risk = floodProbability({ ...next, precipitation: nowP, vuln });
      const at = new Date(Date.now() + (i+1)*stepMin*60000);
      scenarios[scn].push({ t: at, precip: nowP, ...next, risk });
      st = next;
    }
  });

  return scenarios;
}
