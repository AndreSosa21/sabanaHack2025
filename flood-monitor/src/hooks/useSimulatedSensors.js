import { useState, useEffect } from "react";

export function useSimulatedSensors() {
  const [region, setRegion] = useState("Tramo Medio");
  const [data, setData] = useState({
    level_m: 1,
    rain_mmph: 0,
    turbidity_ntu: 5,
    velocity_mps: 0.5,
  });

  const [history, setHistory] = useState([]);

  // Actualizar histórico cada vez que cambian los datos
  useEffect(() => {
    setHistory(prev => [
      ...prev.slice(-49), // mantener últimos 50 puntos
      { timestamp: new Date(), ...data }
    ]);
  }, [data]);

  // Calcular riesgo automáticamente
  let riskLevel = "ok";
  let riskScore = 0;
  if (data.level_m > 5 || data.rain_mmph > 10 || data.velocity_mps > 2 || data.turbidity_ntu > 50) {
    riskLevel = "warn"; riskScore = 0.6;
  }
  if (data.level_m > 7 || data.rain_mmph > 15 || data.velocity_mps > 3 || data.turbidity_ntu > 80) {
    riskLevel = "danger"; riskScore = 0.9;
  }
  const risk = { level: riskLevel, score: riskScore, label: riskLevel.toUpperCase() };

  const features = {
    volume: data.level_m * 2,
    precipitation: data.rain_mmph,
    turbidity: data.turbidity_ntu,
    velocity: data.velocity_mps,
  };

  return { region, setRegion, data, setData, risk, features, history };
}
