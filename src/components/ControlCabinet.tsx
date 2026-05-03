import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

function Cabinet({
  color,
  label,
  screenColor,
  screenEmissive,
  onClick,
  position,
  children,
}: {
  color: string;
  label: string;
  screenColor: string;
  screenEmissive: string;
  onClick: () => void;
  position: [number, number, number];
  children?: React.ReactNode;
}) {
  return (
    <group position={position} onClick={onClick}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.1, 2.2, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Door frame */}
      <mesh position={[0, 0, 0.36]}>
        <boxGeometry args={[0.95, 2.0, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.55} />
      </mesh>
      {/* Latch */}
      <mesh position={[0.38, 0, 0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0.5, 0.39]}>
        <boxGeometry args={[0.72, 0.5, 0.02]} />
        <meshStandardMaterial
          color={screenColor}
          emissive={screenEmissive}
          emissiveIntensity={1.2}
          roughness={0.15}
        />
      </mesh>
      {/* Warning lights */}
      <mesh position={[-0.3, 0.95, 0.39]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#00FF44" emissive="#00AA22" emissiveIntensity={2} />
      </mesh>
      {/* Ventilation */}
      {[-0.4, -0.3, -0.2].map((y) => (
        <mesh key={y} position={[0, y - 0.6, 0.39]}>
          <boxGeometry args={[0.8, 0.05, 0.02]} />
          <meshStandardMaterial color="#1A2030" />
        </mesh>
      ))}
      {children}
    </group>
  );
}

export default function ControlCabinet({ position }: { position: [number, number, number] }) {
  const { weather, setSelected } = useWeather();
  const timerRef = useRef(0);

  useFrame((_, delta) => {
    timerRef.current += delta;
  });

  return (
    <group position={position}>
      {/* MPPT / DC-DC Boost Cabinet */}
      <Cabinet
        position={[-2.2, 1.1, 0]}
        color="#2C4A6E"
        label="MPPT"
        screenColor="#002200"
        screenEmissive="#003300"
        onClick={() =>
          setSelected({
            type: "mppt",
            title: "MPPT Controller & DC-DC Boost",
            lines: [
              { label: "Input (PV Array)", value: `${weather.power.toLocaleString()} W` },
              { label: "Algorithm", value: "Perturb & Observe (P&O)" },
              { label: "Efficiency", value: "98.2%" },
              { label: "DC Bus Voltage", value: weather.mode === "clear" ? "440 V" : `${Math.round(440 * weather.power / 11973)} V` },
              { label: "Max Power Point", value: `${weather.irradiance} W/m²` },
              { label: "Converter Type", value: "DC-DC Boost (non-isolated)" },
            ],
          })
        }
      />

      {/* MPC Supervisory Cabinet */}
      <Cabinet
        position={[0, 1.1, 0]}
        color="#1E3A5A"
        label="MPC"
        screenColor="#001133"
        screenEmissive="#002266"
        onClick={() =>
          setSelected({
            type: "mpc",
            title: "MPC — Supervisory Control Level",
            lines: [
              { label: "Control Strategy", value: "Model Predictive Control" },
              { label: "Prediction Horizon", value: "300 steps" },
              { label: "Update Rate", value: "Every 60 seconds" },
              { label: "Setpoint Output", value: `${weather.flowRate.toFixed(2)} m³/h` },
              { label: "Optimization", value: "Minimize pump stress & spills" },
              { label: "AI Forecast Input", value: "Physics-Guided LSTM (RMSE 19.53)" },
            ],
          })
        }
      />

      {/* FOPID Execution Cabinet */}
      <Cabinet
        position={[2.2, 1.1, 0]}
        color="#263A52"
        label="FOPID"
        screenColor="#110022"
        screenEmissive="#220044"
        onClick={() =>
          setSelected({
            type: "fopid",
            title: "FOPID — Execution Control Level",
            lines: [
              { label: "Controller Type", value: "Fractional-Order PID" },
              { label: "Order (α, β)", value: "α = 0.85, β = 0.92" },
              { label: "Output Signal", value: "VFD frequency command" },
              { label: "Current Setpoint", value: `${(rpmToFreq(weather.flowRate)).toFixed(1)} Hz` },
              { label: "Response Time", value: "< 200 ms" },
              { label: "Anti-Windup", value: "Enabled" },
            ],
          })
        }
      />

      {/* Roof over cabinets */}
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[8, 0.12, 2]} />
        <meshStandardMaterial color="#3A5A70" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 2.36, 0]} castShadow>
        <boxGeometry args={[8.2, 0.08, 2.2]} />
        <meshStandardMaterial color="#2A4A60" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Base platform */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[8, 0.12, 2]} />
        <meshStandardMaterial color="#9A9080" roughness={0.9} />
      </mesh>
    </group>
  );
}

function rpmToFreq(flowRate: number) {
  return (flowRate / 14.06) * 50;
}
