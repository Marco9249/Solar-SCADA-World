import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

const TANK_RADIUS = 3.385;
const TANK_MAX_H = 6;

export default function WaterTank({ position }: { position: [number, number, number] }) {
  const { weather, setSelected } = useWeather();
  const waterRef = useRef<THREE.Mesh>(null);
  const levelRef = useRef(weather.waterLevelTarget);

  useFrame((_, delta) => {
    levelRef.current += (weather.waterLevelTarget - levelRef.current) * delta * 0.3;
    if (waterRef.current) {
      waterRef.current.scale.y = Math.max(0.01, levelRef.current / TANK_MAX_H);
      (waterRef.current.material as THREE.MeshStandardMaterial).color.setStyle(
        weather.mode === "clear" ? "#2E86C1" : "#1A6080"
      );
    }
  });

  const handleClick = () => {
    setSelected({
      type: "tank",
      title: "Main Water Storage Tank",
      lines: [
        { label: "Cross-section Area", value: "36 m²" },
        { label: "Max Height", value: "6.0 m" },
        { label: "Max Volume", value: "216 m³" },
        { label: "Current Level", value: `${weather.waterLevelTarget.toFixed(2)} m` },
        { label: "Stored Volume", value: `${(36 * weather.waterLevelTarget).toFixed(1)} m³` },
        { label: "Scenario Note", value: weather.mode === "clear" ? "Rising: +1.03 m over 72 h" : weather.mode === "overcast" ? "Falling: −0.86 m over 72 h" : "Stable plateau" },
      ],
    });
  };

  return (
    <group position={position} onClick={handleClick}>
      {/* Outer shell */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[TANK_RADIUS, TANK_RADIUS, TANK_MAX_H, 24, 1, true]} />
        <meshStandardMaterial color="#B8C4CC" roughness={0.5} metalness={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Bottom cap */}
      <mesh position={[0, -TANK_MAX_H / 2, 0]} receiveShadow>
        <circleGeometry args={[TANK_RADIUS, 24]} />
        <meshStandardMaterial color="#A0AEB8" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, TANK_MAX_H / 2, 0]}>
        <circleGeometry args={[TANK_RADIUS, 24]} />
        <meshStandardMaterial color="#B0BCC5" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Water inside */}
      <mesh
        ref={waterRef}
        position={[0, -TANK_MAX_H / 2 + 0.01, 0]}
        scale={[1, 1, 1]}
      >
        <cylinderGeometry args={[TANK_RADIUS - 0.05, TANK_RADIUS - 0.05, TANK_MAX_H, 20]} />
        <meshStandardMaterial
          color="#2E86C1"
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.82}
        />
      </mesh>

      {/* Level gauge strip on outside */}
      <mesh position={[TANK_RADIUS + 0.05, 0, 0]}>
        <boxGeometry args={[0.08, TANK_MAX_H, 0.08]} />
        <meshStandardMaterial color="#E8D8B0" roughness={0.7} />
      </mesh>

      {/* Structural ribs */}
      {[0, 1.5, 3, 4.5].map((y, i) => (
        <mesh key={i} position={[0, -TANK_MAX_H / 2 + y + 0.75, 0]}>
          <torusGeometry args={[TANK_RADIUS + 0.05, 0.06, 8, 24]} />
          <meshStandardMaterial color="#8A9BA8" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      {/* Foundation */}
      <mesh position={[0, -TANK_MAX_H / 2 - 0.25, 0]} receiveShadow>
        <cylinderGeometry args={[TANK_RADIUS + 0.3, TANK_RADIUS + 0.5, 0.5, 20]} />
        <meshStandardMaterial color="#9A9080" roughness={0.9} />
      </mesh>

      {/* Label plate */}
      <mesh position={[0, 0.5, TANK_RADIUS + 0.1]}>
        <boxGeometry args={[2, 0.6, 0.05]} />
        <meshStandardMaterial color="#1A3050" roughness={0.8} />
      </mesh>
    </group>
  );
}
