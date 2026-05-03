import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

interface CloudData {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  speed: number;
}

export default function CloudLayer() {
  const { weather } = useWeather();

  const clouds: CloudData[] = useMemo(() => {
    const c: CloudData[] = [];
    const count = weather.mode === "clear" ? 4 : weather.mode === "fluctuating" ? 10 : 18;
    for (let i = 0; i < count; i++) {
      c.push({
        x: (i * 29.7) % 120 - 60,
        y: 28 + (i * 7.3) % 12,
        z: (i * 37.1) % 100 - 50,
        sx: 6 + (i * 3.7) % 10,
        sy: 2.5 + (i * 1.3) % 3,
        sz: 5 + (i * 2.9) % 8,
        speed: 0.8 + (i * 0.4) % 1.5,
      });
    }
    return c;
  }, [weather.mode]);

  return (
    <>
      {clouds.map((c, i) => (
        <Cloud key={i} data={c} opacity={weather.mode === "overcast" ? 0.85 : 0.6} />
      ))}
    </>
  );
}

function Cloud({ data, opacity }: { data: CloudData; opacity: number }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.x += delta * data.speed;
      if (ref.current.position.x > 90) ref.current.position.x = -90;
    }
  });

  return (
    <group ref={ref} position={[data.x, data.y, data.z]}>
      <mesh>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={opacity} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[data.sx * 0.3, data.sy * -0.1, 0]} scale={[data.sx * 0.18, data.sy * 0.18, data.sz * 0.15]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#F0F4F8" transparent opacity={opacity * 0.9} roughness={1} />
      </mesh>
      <mesh position={[data.sx * -0.2, data.sy * -0.05, data.sz * 0.1]} scale={[data.sx * 0.15, data.sy * 0.16, data.sz * 0.14]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#E8EEF4" transparent opacity={opacity * 0.8} roughness={1} />
      </mesh>
    </group>
  );
}
