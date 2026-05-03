import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

export default function WeatherStation({ position }: { position: [number, number, number] }) {
  const { weather, setSelected } = useWeather();
  const cameraRotRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (cameraRotRef.current) {
      cameraRotRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Main mast */}
      <mesh castShadow position={[0, 2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 4, 8]} />
        <meshStandardMaterial color="#7A8A90" roughness={0.5} metalness={0.7} />
      </mesh>

      {/* Pyranometer (GHI sensor) */}
      <group
        position={[0.6, 3.2, 0]}
        onClick={() =>
          setSelected({
            type: "pyranometer",
            title: "Pyranometer — GHI Sensor",
            lines: [
              { label: "Measurement", value: "Global Horizontal Irradiance" },
              { label: "Current GHI", value: `${weather.irradiance} W/m²` },
              { label: "Clear Sky GHI", value: "950 W/m²" },
              { label: "Clearness Index (kt)", value: (weather.irradiance / 950).toFixed(3) },
              { label: "Sensor Type", value: "Silicon photodiode" },
              { label: "Update Rate", value: "1 Hz → AI model" },
            ],
          })
        }
      >
        <mesh castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.12, 12]} />
          <meshStandardMaterial color="#E8D070" roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <sphereGeometry args={[0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#D0D8E0" roughness={0.05} metalness={0.1} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Temperature / Humidity sensor */}
      <group
        position={[-0.5, 2.8, 0]}
        onClick={() =>
          setSelected({
            type: "envSensor",
            title: "Ambient Sensor Array",
            lines: [
              { label: "Temperature", value: weather.mode === "clear" ? "38.4 °C" : weather.mode === "fluctuating" ? "32.1 °C" : "27.8 °C" },
              { label: "Humidity", value: weather.mode === "clear" ? "18%" : weather.mode === "fluctuating" ? "34%" : "52%" },
              { label: "Dew Point", value: weather.mode === "clear" ? "8.2 °C" : "14.5 °C" },
              { label: "Wind Speed", value: weather.mode === "clear" ? "3.2 m/s" : "5.8 m/s" },
              { label: "Barometric P.", value: "1008 hPa" },
              { label: "Feed Interval", value: "60 s → MPC controller" },
            ],
          })
        }
      >
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.35, 0.2]} />
          <meshStandardMaterial color="#EBEBEB" roughness={0.4} />
        </mesh>
        {/* Louver slats */}
        {[-0.1, -0.04, 0.02, 0.08].map((y) => (
          <mesh key={y} position={[0, y, 0.11]}>
            <boxGeometry args={[0.22, 0.03, 0.02]} />
            <meshStandardMaterial color="#D0D0D0" roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Sky Camera rotating */}
      <group ref={cameraRotRef} position={[0, 4.1, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.2, 10]} />
          <meshStandardMaterial color="#2C3040" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Lens */}
        <mesh position={[0, -0.15, 0]}>
          <sphereGeometry args={[0.09, 12, 10]} />
          <meshStandardMaterial color="#0A1020" roughness={0.05} metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <torusGeometry args={[0.09, 0.015, 8, 12]} />
          <meshStandardMaterial color="#1A88C8" roughness={0.2} metalness={0.8} emissive="#0044AA" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Computing cabinet beside mast */}
      <group
        position={[1.6, 0.8, 0]}
        onClick={() =>
          setSelected({
            type: "aiNode",
            title: "Edge AI Computing Node",
            lines: [
              { label: "Model", value: "Physics-Guided LSTM (student)" },
              { label: "Architecture", value: "1 LSTM layer + 4 inputs" },
              { label: "RMSE", value: "19.53 W/m²" },
              { label: "Quantization", value: "8-bit INT weights" },
              { label: "Pruning", value: "Structured (40% sparsity)" },
              { label: "Knowledge Distill.", value: "Teacher → Student KD" },
              { label: "Forecast Window", value: "24-hour sliding window" },
              { label: "Clearness Index", value: `kt = ${(weather.irradiance / 950).toFixed(3)}` },
            ],
          })
        }
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.85, 1.4, 0.55]} />
          <meshStandardMaterial color="#1E2A3A" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Ventilation */}
        {[0.1, 0.0, -0.1].map((y) => (
          <mesh key={y} position={[0.43, y, 0]}>
            <boxGeometry args={[0.04, 0.08, 0.4]} />
            <meshStandardMaterial color="#0D1520" />
          </mesh>
        ))}
        {/* Display */}
        <mesh position={[0, 0.3, 0.28]}>
          <boxGeometry args={[0.6, 0.38, 0.02]} />
          <meshStandardMaterial color="#000820" emissive="#0044CC" emissiveIntensity={1.0} roughness={0.1} />
        </mesh>
      </group>

      {/* Cable from station to cabinet */}
      <mesh position={[0.8, 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 6]} />
        <meshStandardMaterial color="#222222" roughness={0.8} />
      </mesh>

      {/* Base */}
      <mesh receiveShadow position={[1, 0.06, 0]}>
        <boxGeometry args={[3.5, 0.12, 1.4]} />
        <meshStandardMaterial color="#9A9080" roughness={0.9} />
      </mesh>
    </group>
  );
}
