import * as THREE from "three";
import { useWeather } from "../context/WeatherContext";

export default function BatteryBank({ position }: { position: [number, number, number] }) {
  const { weather, setSelected } = useWeather();
  const soc = weather.avgSoc;

  return (
    <group position={position}>
      {/* Enclosure */}
      <group
        onClick={() =>
          setSelected({
            type: "battery",
            title: "Battery Bank & Charge Controller",
            lines: [
              { label: "State of Charge (SoC)", value: `${soc}%` },
              { label: "Nominal Capacity", value: "48 kWh" },
              { label: "Chemistry", value: "Lead-acid VRLA" },
              { label: "Bus Voltage", value: "48 V DC" },
              { label: "Charge Controller", value: "PWM / MPPT hybrid" },
              { label: "Max Charge Rate", value: "0.2C (9.6 kW)" },
              { label: "Temp Protection", value: "Active (Sudanese climate)" },
              { label: "Role", value: "Secondary storage (auxiliary)" },
            ],
          })
        }
      >
        {/* Main housing */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.0, 1.6, 1.2]} />
          <meshStandardMaterial color="#3A3A2A" roughness={0.5} metalness={0.4} />
        </mesh>

        {/* Cells visible through cutaway */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[-1.1 + i * 0.55, 0, 0]}>
            <boxGeometry args={[0.44, 1.35, 1.0]} />
            <meshStandardMaterial
              color={soc > 70 ? "#2E8B57" : soc > 40 ? "#B8860B" : "#8B2222"}
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>
        ))}

        {/* Terminals */}
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, 0.85, 0.62]}>
            <cylinderGeometry args={[0.06, 0.06, 0.15, 8]} />
            <meshStandardMaterial color="#C0A020" roughness={0.3} metalness={0.9} />
          </mesh>
        ))}

        {/* SoC display */}
        <mesh position={[0, 0.65, 0.62]}>
          <boxGeometry args={[1.0, 0.35, 0.03]} />
          <meshStandardMaterial
            color="#000000"
            emissive={soc > 70 ? "#00AA44" : soc > 40 ? "#AA8800" : "#AA2200"}
            emissiveIntensity={1.5}
            roughness={0.1}
          />
        </mesh>

        {/* Ventilation slats on top */}
        {[-0.9, -0.45, 0, 0.45, 0.9].map((x) => (
          <mesh key={x} position={[x, 0.82, 0]}>
            <boxGeometry args={[0.3, 0.04, 1.1]} />
            <meshStandardMaterial color="#1A1A10" />
          </mesh>
        ))}

        {/* Heavy gauge wiring */}
        <mesh position={[0.6, 0.82, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
          <meshStandardMaterial color="#CC2222" roughness={0.6} />
        </mesh>
        <mesh position={[-0.6, 0.82, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
          <meshStandardMaterial color="#111111" roughness={0.6} />
        </mesh>
      </group>

      {/* Charge controller on top */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.2, 0.4, 0.8]} />
        <meshStandardMaterial color="#2A3A2A" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.12, 0.42]}>
        <boxGeometry args={[0.7, 0.22, 0.02]} />
        <meshStandardMaterial color="#000A00" emissive="#006600" emissiveIntensity={1.0} />
      </mesh>

      {/* Foundation */}
      <mesh receiveShadow position={[0, -0.87, 0]}>
        <boxGeometry args={[3.4, 0.14, 1.6]} />
        <meshStandardMaterial color="#9A9080" roughness={0.9} />
      </mesh>
    </group>
  );
}
