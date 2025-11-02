import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Utilidad para interpolar color según turbidez (NTU)
function turbidityToColor(ntu) {
  const t = Math.min(1, Math.max(0, (ntu || 0) / 400));
  const c1 = { r: 48, g: 120, b: 190 }; // azul
  const c2 = { r: 170, g: 120, b: 60 }; // marrón
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// Hook simple de simulación (1 Hz) de señales hidrológicas
function useSensorsSim({
  initialLevel = 0.8, // m por encima del lecho
  initialRain = 0, // mm/h
  baseFlow = 0.6, // m/s base
  regionName = "Tramo Medio",
  onData,
}) {
  const [rain, setRain] = useState(initialRain);
  const [level, setLevel] = useState(initialLevel);
  const [velocity, setVelocity] = useState(baseFlow);
  const [turbidity, setTurbidity] = useState(30);

  const tick = useCallback(() => {
    // Dinámica simple: lluvia sube nivel (retardo), sin lluvia drena.
    const kRain = 0.002; // m por (mm/h) por tick
    const kDrain = 0.003; // m por tick
    const newLevel = Math.max(
      0.1,
      level + kRain * rain - kDrain + (Math.random() - 0.5) * 0.01
    );

    // Velocidad responde al nivel (proxy caudal)
    const newVelocity = Math.max(
      0.05,
      baseFlow + 0.35 * newLevel + (Math.random() - 0.5) * 0.05
    );

    // Turbidez sube con lluvia y velocidad
    const baseNTU = 20 + 0.9 * rain + 60 * newVelocity;
    const newTurbidity = Math.max(5, Math.min(800, baseNTU + (Math.random() - 0.5) * 8));

    setLevel(newLevel);
    setVelocity(newVelocity);
    setTurbidity(newTurbidity);

    onData?.({
      region: regionName,
      timestamp: Date.now(),
      level_m: Number(newLevel.toFixed(3)),
      rain_mmph: Number(rain.toFixed(1)),
      velocity_mps: Number(newVelocity.toFixed(3)),
      turbidity_ntu: Math.round(newTurbidity),
    });
  }, [level, rain, baseFlow, regionName, onData]);

  useEffect(() => {
    const id = setInterval(tick, 1000); // 1 Hz
    return () => clearInterval(id);
  }, [tick]);

  return { rain, setRain, level, velocity, turbidity };
}

// Agua (plano animado cuya altura representa el nivel)
function Water({ level, turbidity }) {
  const meshRef = useRef();
  const baseY = 0;
  const targetY = baseY + level;

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1;
    meshRef.current.rotation.z += 0.01 * delta; // ondulación
  });

  const color = turbidityToColor(turbidity);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, baseY + level, 0]}>
      <planeGeometry args={[20, 6, 64, 16]} />
      <meshStandardMaterial color={color} transparent opacity={0.8} roughness={0.6} metalness={0.0} />
    </mesh>
  );
}

function SensorLabel({ position = [0, 0, 0], text }) {
  return (
    <Html position={position} center>
      <div className="px-2 py-1 text-xs rounded bg-white/80 text-gray-800 shadow">{text}</div>
    </Html>
  );
}

function ColumnAndSensors({ level }) {
  const poleHeight = 5;
  const waterlineY = level;

  return (
    <group>
      {/* Columna */}
      <mesh position={[0, poleHeight / 2, 0]}>
        <cylinderGeometry args={[0.15, 0.15, poleHeight, 24]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>

      {/* Gabinete y panel */}
      <mesh position={[0.3, 3.2, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.25]} />
        <meshStandardMaterial color="#64748B" />
      </mesh>
      <mesh position={[0.3, 3.5, -0.2]} rotation={[Math.PI / 6, 0, 0]}>
        <planeGeometry args={[0.7, 0.5]} />
        <meshStandardMaterial color="#0EA5E9" />
      </mesh>

      {/* Sensor nivel (ultrasónico) */}
      <mesh position={[0, 4.1, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.2, 16]} />
        <meshStandardMaterial color="#22C55E" />
      </mesh>
      <SensorLabel position={[0, 4.4, 0]} text="Ultrasónico (Nivel)" />

      {/* Pluviómetro */}
      <mesh position={[-0.6, 3.9, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.25, 16]} />
        <meshStandardMaterial color="#A3E635" />
      </mesh>
      <SensorLabel position={[-0.6, 4.2, 0]} text="Pluviómetro" />

      {/* Turbidez (sumergido) */}
      <mesh position={[0.15, Math.max(0.15, waterlineY - 0.4), 0]}>
        <boxGeometry args={[0.16, 0.16, 0.4]} />
        <meshStandardMaterial color="#F59E0B" />
      </mesh>
      <SensorLabel position={[0.15, Math.max(0.6, waterlineY + 0.25), 0]} text="Turbidez" />

      {/* Velocidad (ADCP) */}
      <mesh position={[-0.15, Math.max(0.1, waterlineY - 0.6), 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.25, 16]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      <SensorLabel position={[-0.15, Math.max(0.55, waterlineY + 0.1), 0]} text="Velocidad (ADCP)" />

      {/* Base */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.3, 24]} />
        <meshStandardMaterial color="#6B7280" />
      </mesh>
    </group>
  );
}

function Riverbed() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[20, 6, 1, 1]} />
      <meshStandardMaterial color="#9CA3AF" />
    </mesh>
  );
}

function HUD({ regionName, level, rain, turbidity, velocity, onChangeRain }) {
  return (
    <div className="absolute top-4 left-4 space-y-3 p-4 rounded-2xl bg-white/80 shadow backdrop-blur">
      <div className="text-sm font-semibold text-gray-600">{regionName}</div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-2 rounded-lg bg-gray-100">
          <div className="text-[10px] text-gray-500">Nivel (m)</div>
          <div className="text-lg font-bold">{level.toFixed(2)}</div>
        </div>
        <div className="p-2 rounded-lg bg-gray-100">
          <div className="text-[10px] text-gray-500">Lluvia (mm/h)</div>
          <div className="text-lg font-bold">{rain.toFixed(1)}</div>
        </div>
        <div className="p-2 rounded-lg bg-gray-100">
          <div className="text-[10px] text-gray-500">Turbidez (NTU)</div>
          <div className="text-lg font-bold">{Math.round(turbidity)}</div>
        </div>
        <div className="p-2 rounded-lg bg-gray-100">
          <div className="text-[10px] text-gray-500">Velocidad (m/s)</div>
          <div className="text-lg font-bold">{velocity.toFixed(2)}</div>
        </div>
      </div>
      <div className="pt-2">
        <label className="text-xs text-gray-600">Control de lluvia</label>
        <input
          className="w-64"
          type="range"
          min={0}
          max={120}
          step={1}
          value={rain}
          onChange={(e) => onChangeRain?.(Number(e.target.value))}
        />
        <div className="text-[10px] text-gray-500">Arrastra para simular un aguacero</div>
      </div>
    </div>
  );
}

export default function RiverColumnSim({ regionName = "Tramo Medio", onData }) {
  const { rain, setRain, level, velocity, turbidity } = useSensorsSim({
    initialLevel: 0.8,
    initialRain: 10,
    baseFlow: 0.6,
    regionName,
    onData,
  });

  const sceneBg = useMemo(() => {
    const t = Math.min(1, rain / 120);
    const base = [200, 220, 255];
    const storm = [140, 160, 190];
    const mix = base.map((v, i) => Math.round(v + (storm[i] - v) * t));
    return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
  }, [rain]);

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-gray-200">
      <Canvas shadows camera={{ position: [6, 4, 8], fov: 45 }} gl={{ antialias: true }} style={{ background: sceneBg }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 8, 3]} intensity={0.8} castShadow />
        <Riverbed />
        <Water level={level} turbidity={turbidity} />
        <ColumnAndSensors level={level} />
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>

      <HUD
        regionName={regionName}
        level={level}
        rain={rain}
        turbidity={turbidity}
        velocity={velocity}
        onChangeRain={setRain}
      />

      <div className="absolute bottom-3 left-4 text-[11px] text-gray-600 bg-white/80 rounded px-2 py-1">
        Simulación conceptual — Columna con sensores: nivel, pluviómetro, turbidez y velocidad.
      </div>
    </div>
  );
}
