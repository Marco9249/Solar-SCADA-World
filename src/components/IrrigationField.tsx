import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

const ROWS = 6;
const COLS = 12;
const SPACING_X = 2.8;
const SPACING_Z = 3.2;

export default function IrrigationField({ position }: { position: [number, number, number] }) {
  const { weather } = useWeather();

  const cropPositions = useMemo(() => {
    const pos: [number, number, number][] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        pos.push([
          (c - COLS / 2) * SPACING_X + (r % 2) * 0.8,
          0,
          r * SPACING_Z - (ROWS * SPACING_Z) / 2,
        ]);
      }
    }
    return pos;
  }, []);

  const moistureColor = weather.mode === "clear" ? "#5A3A1A" : weather.mode === "overcast" ? "#3A2510" : "#4A3010";
  const cropGreen = weather.mode === "clear" ? "#3A8A3A" : "#2E7030";

  return (
    <group position={position}>
      {/* Soil ground plane */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[COLS * SPACING_X, ROWS * SPACING_Z, 4, 4]} />
        <meshStandardMaterial color={moistureColor} roughness={0.95} />
      </mesh>

      {/* Crop rows */}
      {cropPositions.map((p, i) => (
        <CropPlant key={i} position={p} color={cropGreen} index={i} />
      ))}

      {/* Drip irrigation lines */}
      {Array.from({ length: ROWS }).map((_, r) => (
        <mesh key={r} position={[0, 0.05, r * SPACING_Z - (ROWS * SPACING_Z) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[COLS * SPACING_X, 0.12]} />
          <meshStandardMaterial color="#444444" roughness={0.8} />
        </mesh>
      ))}

      {/* Moisture puddles near drip lines (only in clear sky) */}
      {weather.mode === "clear" &&
        Array.from({ length: ROWS }).map((_, r) => (
          <mesh key={r} position={[0, 0.06, r * SPACING_Z - (ROWS * SPACING_Z) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[COLS * SPACING_X, 0.5]} />
            <meshStandardMaterial color="#2E5A2E" roughness={0.6} transparent opacity={0.5} />
          </mesh>
        ))}

      {/* Label sign */}
      <mesh position={[0, 1.5, -(ROWS * SPACING_Z) / 2 - 1]}>
        <boxGeometry args={[5, 0.7, 0.08]} />
        <meshStandardMaterial color="#1A3A1A" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.5, -(ROWS * SPACING_Z) / 2 - 1.05]}>
        <boxGeometry args={[4.8, 0.55, 0.05]} />
        <meshStandardMaterial color="#2A5A2A" emissive="#004400" emissiveIntensity={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

function CropPlant({
  position,
  color,
  index,
}: {
  position: [number, number, number];
  color: string;
  index: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const phase = useMemo(() => index * 0.37, [index]);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      ref.current.rotation.z = Math.sin(t * 1.2 + phase) * 0.05;
      ref.current.rotation.x = Math.sin(t * 0.8 + phase * 1.3) * 0.03;
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Stem */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 1.0, 5]} />
        <meshStandardMaterial color="#4A7A20" roughness={0.8} />
      </mesh>
      {/* Crown leaves */}
      <mesh position={[0, 1.1, 0]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[0.45, 0.9, 6]} />
        <meshStandardMaterial color={color} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.85, 0]} rotation={[0.15, 1.05, 0]}>
        <coneGeometry args={[0.55, 0.65, 6]} />
        <meshStandardMaterial color={color} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
