import { useWeather } from "../context/WeatherContext";

export default function Ground() {
  const { weather } = useWeather();
  const isWet = weather.mode === "clear";

  return (
    <>
      {/* Main arid terrain */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[200, 200, 1, 1]} />
        <meshStandardMaterial
          color={isWet ? "#C8A96E" : "#D4B07A"}
          roughness={0.95}
          metalness={0}
        />
      </mesh>

      {/* Farm area - slightly darker, moist soil */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 20]}>
        <planeGeometry args={[40, 30, 1, 1]} />
        <meshStandardMaterial
          color={isWet ? "#7A5C3A" : "#A07A50"}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Paved path around control area */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.01, -2]}>
        <planeGeometry args={[22, 18, 1, 1]} />
        <meshStandardMaterial color="#B8A898" roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Sand dunes in distance */}
      <SandDune position={[-60, 0, -40]} scale={[30, 4, 20]} />
      <SandDune position={[70, 0, -60]} scale={[40, 5, 25]} />
      <SandDune position={[-80, 0, 30]} scale={[25, 3.5, 18]} />
    </>
  );
}

function SandDune({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: [number, number, number];
}) {
  return (
    <mesh position={position} scale={scale} receiveShadow>
      <sphereGeometry args={[1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#D4B87A" roughness={1} metalness={0} />
    </mesh>
  );
}
