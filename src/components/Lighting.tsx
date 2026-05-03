import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

export default function Lighting() {
  const { weather } = useWeather();
  const sunRef = useRef<THREE.DirectionalLight>(null);

  // Sun positions matching RealisticSky
  const sunPositions = {
    clear:      new THREE.Vector3(40, 55, 30),
    fluctuating: new THREE.Vector3(35, 42, 28),
    overcast:   new THREE.Vector3(30, 25, 25),
  };

  const sunPos = sunPositions[weather.mode];

  const ambientIntensities = { clear: 0.28, fluctuating: 0.38, overcast: 0.65 };
  const sunIntensities = { clear: 4.5, fluctuating: 2.2, overcast: 0.6 };
  const sunColors = { clear: "#FFF4D6", fluctuating: "#FFE5B0", overcast: "#C8D8E8" };
  const hemiGrounds = { clear: "#B8873A", fluctuating: "#A07840", overcast: "#788090" };

  useFrame(({ clock }) => {
    if (!sunRef.current) return;
    let intensity = sunIntensities[weather.mode];
    if (weather.mode === "fluctuating") {
      intensity *= 0.75 + 0.25 * Math.abs(Math.sin(clock.getElapsedTime() * 0.35));
    }
    sunRef.current.intensity = intensity;
  });

  return (
    <>
      {/* Ambient */}
      <ambientLight intensity={ambientIntensities[weather.mode]} color={sunColors[weather.mode]} />

      {/* Primary sun — hard directional shadow caster */}
      <directionalLight
        ref={sunRef}
        castShadow
        position={[sunPos.x, sunPos.y, sunPos.z]}
        intensity={sunIntensities[weather.mode]}
        color={sunColors[weather.mode]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={250}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* Sky hemisphere — subtle fill light */}
      <hemisphereLight
        args={["#A8C8E8" as THREE.ColorRepresentation, hemiGrounds[weather.mode] as THREE.ColorRepresentation, 0.35]}
      />

      {/* Subtle bounce light from sandy ground */}
      <directionalLight
        position={[0, -1, 0]}
        intensity={weather.mode === "clear" ? 0.12 : 0.05}
        color="#D4AA60"
      />

      {/* Fog for atmospheric depth */}
      <fog
        attach="fog"
        args={[
          weather.mode === "overcast" ? "#B8C8D0" : weather.mode === "fluctuating" ? "#C8D8E8" : "#A8C8E8",
          180,
          420,
        ]}
      />
    </>
  );
}
