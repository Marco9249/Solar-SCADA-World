import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

export default function PumpSystem({ position }: { position: [number, number, number] }) {
  const { weather, setSelected } = useWeather();
  const impellerRef = useRef<THREE.Mesh>(null);
  const waterFlowRef = useRef<THREE.Mesh>(null);
  const rpmSpeed = (weather.flowRate / 14.06) * 1500;

  useFrame((_, delta) => {
    if (impellerRef.current) {
      impellerRef.current.rotation.z += delta * (rpmSpeed / 60) * Math.PI * 2 * 0.05;
    }
    if (waterFlowRef.current) {
      const mat = waterFlowRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.55 + 0.2 * Math.sin(Date.now() * 0.005 * (weather.flowRate / 14.06));
    }
  });

  return (
    <group position={position}>
      {/* Motor housing */}
      <group
        position={[0, 1.1, 0]}
        onClick={() =>
          setSelected({
            type: "pump",
            title: "Centrifugal Pump & Motor",
            lines: [
              { label: "Motor Speed", value: `${Math.round(rpmSpeed)} RPM` },
              { label: "Flow Rate", value: `${weather.flowRate.toFixed(2)} m³/h` },
              { label: "Pump Type", value: "Centrifugal (volute casing)" },
              { label: "VFD Frequency", value: `${(rpmSpeed / 1500 * 50).toFixed(1)} Hz` },
              { label: "Water Hammer", value: "Protected via ramp-up" },
              { label: "Clear Sky Flow", value: "14.06 m³/h @ 1500 RPM" },
            ],
          })
        }
      >
        {/* Motor cylinder */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.45, 1.2, 16]} />
          <meshStandardMaterial color="#2C3E50" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Motor fins */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 4, 0]}>
            <boxGeometry args={[0.92, 1.0, 0.06]} />
            <meshStandardMaterial color="#243040" roughness={0.6} metalness={0.5} />
          </mesh>
        ))}
        {/* Shaft */}
        <mesh position={[0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
          <meshStandardMaterial color="#AAB0B8" roughness={0.3} metalness={0.9} />
        </mesh>
      </group>

      {/* Pump volute */}
      <group position={[0.85, 1.1, 0]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.42, 12, 10]} />
          <meshStandardMaterial color="#3A5068" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Impeller (visible inside via shader) */}
        <mesh ref={impellerRef} position={[0, 0, 0]}>
          <torusGeometry args={[0.22, 0.05, 6, 8]} />
          <meshStandardMaterial color="#5D8AA8" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Suction inlet */}
        <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.35, 10]} />
          <meshStandardMaterial color="#3A5068" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Discharge pipe upward */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 10]} />
          <meshStandardMaterial color="#8A9BA8" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Water flow visual */}
        <mesh ref={waterFlowRef} position={[0.2, 0.3, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#4FC3F7" transparent opacity={0.6} roughness={0.1} />
        </mesh>
      </group>

      {/* VFD Cabinet */}
      <group
        position={[-1.2, 0.8, 0]}
        onClick={() =>
          setSelected({
            type: "vfd",
            title: "Variable Frequency Drive (VFD)",
            lines: [
              { label: "Output Frequency", value: `${(rpmSpeed / 1500 * 50).toFixed(1)} Hz` },
              { label: "Motor Speed", value: `${Math.round(rpmSpeed)} RPM` },
              { label: "Ramp Function", value: "Enabled (prevents water hammer)" },
              { label: "Acceleration Rate", value: "~15 Hz/s" },
              { label: "Control Source", value: "FOPID execution level" },
              { label: "Protection", value: "Overvoltage, Overcurrent, Thermal" },
            ],
          })
        }
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.7, 1.2, 0.45]} />
          <meshStandardMaterial color="#2A4A6A" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* VFD screen */}
        <mesh position={[0, 0.25, 0.23]}>
          <boxGeometry args={[0.42, 0.28, 0.02]} />
          <meshStandardMaterial color="#00E676" roughness={0.2} emissive="#004D20" emissiveIntensity={0.8} />
        </mesh>
        {/* Ventilation slots */}
        {[-0.2, -0.1, 0, 0.1, 0.2].map((vy) => (
          <mesh key={vy} position={[0, vy - 0.25, 0.23]}>
            <boxGeometry args={[0.55, 0.025, 0.02]} />
            <meshStandardMaterial color="#1A3050" />
          </mesh>
        ))}
      </group>

      {/* Base concrete pad */}
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[3.5, 0.12, 1.8]} />
        <meshStandardMaterial color="#9A9080" roughness={0.9} />
      </mesh>
    </group>
  );
}
