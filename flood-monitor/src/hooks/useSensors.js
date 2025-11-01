import { useEffect, useMemo, useState } from "react";

/**
 * Simula sensores por región y trae precipitación “en vivo” (placeholder).
 * Puedes sustituir getPrecipitation() por una API real (ej. Open-Meteo).
 */
const REGIONS = {
  "Tramo Alto": { lat: 4.995, lon: -73.915 },
  "Tramo Medio": { lat: 4.975, lon: -73.915 },
  "Tramo Bajo": { lat: 4.955, lon: -73.915 },
};

const USE_REAL_PRECIP = true; // <- ponlo en true para usar datos reales


function jitter(base, pct = 0.08) {
  const delta = base * pct;
  return +(base + (Math.random() * 2 - 1) * delta).toFixed(2);
}


async function getPrecipitation({ lat, lon }) {
  if (!USE_REAL_PRECIP) {
    // simulación simple (mm/h)
    const base = 0.5 + Math.max(0, 1.5 * Math.sin(Date.now() / 3600000));
    return +(base + Math.random() * 1.2).toFixed(2);
  }

  // Datos REALES hora a hora desde Open-Meteo
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=precipitation,rain,showers,precipitation_probability` +
    `&timezone=America%2FBogota`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    const arr = j?.hourly?.precipitation ?? [];
    const last = arr.length ? arr[arr.length - 1] : 0;
    return Number(Number(last).toFixed(2)); // mm/h
  } catch {
    // fallback a simulado si falla
    return +(Math.random() * 1.5).toFixed(2);
  }
}


export function useSensors(regionName) {
  const region = useMemo(() => REGIONS[regionName], [regionName]);
  const [data, setData] = useState({
    volume: 5.2,     // m³/s
    velocity: 0.8,   // m/s
    turbidity: 12,   // NTU
    precipitation: 0 // mm/h
  });
  const [risk, setRisk] = useState({ score: 0.18, level: "ok" });

  useEffect(() => {
    let alive = true;

    const computeRisk = (d) => {
      // Normalizaciones simples (tuneables)
      const v = Math.min(d.volume / 15, 1);
      const u = Math.min(d.velocity / 2.5, 1);
      const t = Math.min(d.turbidity / 100, 1);
      const p = Math.min(d.precipitation / 5, 1);
      const score = +(0.35 * v + 0.25 * p + 0.25 * u + 0.15 * t).toFixed(2);
      let level = "ok";
      if (score >= 0.7) level = "danger";
      else if (score >= 0.45) level = "warn";
      return { score, level };
    };

    const tick = async () => {
      const precipitation = await getPrecipitation(region);
      const next = {
        volume: jitter(6.0),
        velocity: jitter(1.0),
        turbidity: Math.max(0, jitter(18.0)),
        precipitation
      };
      if (!alive) return;
      setData(next);
      setRisk(computeRisk(next));
    };

    // primera carga + intervalos
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [region]);

  return { data, risk, regionCoords: region, regions: Object.keys(REGIONS) };
}
