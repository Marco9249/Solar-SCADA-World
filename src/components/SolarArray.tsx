import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

const PANEL_W = 1.1;
const PANEL_H = 1.7;
const PANEL_GAP_X = 0.18;
const PANEL_GAP_Z = 0.22;
const PANELS_PER_STRING = 11;
const STRINGS = 2;
const TILT = Math.PI / 6;

export default function SolarArray({ position }: { position: [number, number, number] }) {
  const { weather, setSelected } = useWeather();

  const rows: React.ReactElement[] = [];
  for (let s = 0; s < STRINGS; s++) {
    for (let p = 0; p < PANELS_PER_STRING; p++) {
      const x = p * (PANEL_W + PANEL_GAP_X) - ((PANELS_PER_STRING - 1) * (PANEL_W + PANEL_GAP_X)) / 2;
      const z = s * (PANEL_H * Math.cos(TILT) + PANEL_GAP_Z + 0.3);
      const yBase = 0.8 + Math.sin(TILT) * PANEL_H * 0.5;
      rows.push(
        <group key={`${s}-${p}`} position={[x, yBase, z]} rotation={[-TILT, 0, 0]}>
          {/* Panel body */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[PANEL_W, PANEL_H, 0.04]} />
            <meshStandardMaterial
              color="#0D1B4B"
              roughness={0.15}
              metalness={0.6}
              envMapIntensity={0.8}
            />
          </mesh>
          {/* Cell grid overlay (flat geometry trick) */}
          <mesh position={[0, 0, 0.021]}>
            <planeGeometry args={[PANEL_W - 0.06, PANEL_H - 0.06]} />
            <meshStandardMaterial color="#0A1640" roughness={0.1} metalness={0.7} />
          </mesh>
          {/* Thin grid lines */}
          {[-0.25, 0, 0.25].map((gx) => (
            <mesh key={gx} position={[gx, 0, 0.025]}>
              <boxGeometry args={[0.01, PANEL_H - 0.05, 0.001]} />
              <meshStandardMaterial color="#1E3A8A" roughness={0.3} />
            </mesh>
          ))}
          {[-0.55, -0.2, 0.15, 0.5].map((gy) => (
            <mesh key={gy} position={[0, gy, 0.025]}>
              <boxGeometry args={[PANEL_W - 0.05, 0.01, 0.001]} />
              <meshStandardMaterial color="#1E3A8A" roughness={0.3} />
            </mesh>
          ))}
          {/* Aluminum frame */}
          <mesh>
            <boxGeometry args={[PANEL_W + 0.04, 0.04, 0.06]} />
            <meshStandardMaterial color="#C0C8D0" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh position={[0, PANEL_H / 2 + 0.01, 0]}>
            <boxGeometry args={[PANEL_W + 0.04, 0.04, 0.06]} />
            <meshStandardMaterial color="#C0C8D0" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh position={[0, -PANEL_H / 2 - 0.01, 0]}>
            <boxGeometry args={[PANEL_W + 0.04, 0.04, 0.06]} />
            <meshStandardMaterial color="#C0C8D0" roughness={0.4} metalness={0.8} />
          </mesh>
        </group>
      );

      // Support posts
      rows.push(
        <group key={`post-${s}-${p}`} position={[
          position[0] + x,
          0,
          position[2] + z,
        ]}>
          <SupportPost height={0.85} />
        </group>
      );
    }
  }

  return (
    <group
      position={position}
      onClick={() =>
        setSelected({
          type: "solar",
          title: "Photovoltaic Array — 12.98 kW",
          lines: [
            { label: "Configuration", value: "2 strings × 11 panels (series)" },
            { label: "Panel Rating", value: "590 W monocrystalline" },
            { label: "Irradiance", value: `${weather.irradiance} W/m²` },
            { label: "MPPT Output", value: `${weather.power.toLocaleString()} W` },
            { label: "Cell Type", value: "Mono-Si (uniform black, cut corners)" },
            { label: "Array Voltage", value: weather.mode === "clear" ? "~440 V DC" : `~${Math.round(440 * weather.power / 11973)} V DC` },
          ],
        })
      }
    >
      {rows}
    </group>
  );
}

function SupportPost({ height }: { height: number }) {
  return (
    <mesh castShadow position={[0, height / 2, 0]}>
      <cylinderGeometry args={[0.04, 0.06, height, 6]} />
      <meshStandardMaterial color="#8A9090" roughness={0.5} metalness={0.7} />
    </mesh>
  );
}
