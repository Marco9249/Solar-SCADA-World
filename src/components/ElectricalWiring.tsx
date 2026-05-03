import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/** Hyper-detailed electrical wiring from Solar Array → Control Cabinet */
export default function ElectricalWiring() {
  const pulseRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const pulseRef2 = useRef<THREE.MeshStandardMaterial | null>(null);

  // Animated current pulse along DC+ cable
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (pulseRef.current) {
      pulseRef.current.emissiveIntensity = 0.6 + Math.sin(t * 3.0) * 0.4;
    }
    if (pulseRef2.current) {
      pulseRef2.current.emissiveIntensity = 0.5 + Math.sin(t * 3.0 + 1.0) * 0.3;
    }
  });

  // Route: SolarArray [-22, y, -8] → east to x=2 → ControlCabinet [2, y, -8]
  // All cables go at height y=1.4 (along horizontal conduit on top of ground fixtures)
  // Path: [-22, 1.4, -8] → [-22, 0.5, -8] (down pole) → [-22, 0.25, -8] → [2, 0.25, -8] → [2, 1.2, -8] (up to cabinet)
  const cabHeight = 0.25;
  const totalLength = 24; // -22 to +2
  const midX = -10;

  return (
    <group>
      {/* ─── Overhead cable tray along top ─────────────────────────────── */}
      <CableTray from={[-22, 2.1, -8]} to={[2, 2.1, -8]} width={0.22} />

      {/* ─── Cable bundle on tray: DC+, DC−, GND ─────────────────────── */}
      {[
        { dy: -0.025, color: "#E07010", emissive: "#FF8800", label: "DC+", pref: pulseRef },
        { dy:  0,     color: "#1A1A1A", emissive: "#111111", label: "DC−", pref: null },
        { dy:  0.025, color: "#145A14", emissive: "#1A7A1A", label: "GND", pref: pulseRef2 },
      ].map((c) => (
        <group key={c.label}>
          {/* Horizontal run */}
          <Cable
            from={[-22, 2.2 + c.dy, -7.9]}
            to={[2, 2.2 + c.dy, -7.9]}
            radius={0.018}
            color={c.color}
            emissive={c.emissive}
            matRef={c.pref}
          />
          {/* Drop from tray down left pole */}
          <Cable
            from={[-22, 2.2 + c.dy, -7.9]}
            to={[-22, 0.4, -7.9]}
            radius={0.018}
            color={c.color}
            emissive={c.emissive}
            matRef={null}
          />
          {/* Rise up right into cabinet */}
          <Cable
            from={[2, 2.2 + c.dy, -7.9]}
            to={[2, 1.3, -7.9]}
            radius={0.018}
            color={c.color}
            emissive={c.emissive}
            matRef={null}
          />
        </group>
      ))}

      {/* ─── Cable conduit (protective sleeve) ──────────────────────────── */}
      <Cable
        from={[-22, 2.12, -8]}
        to={[2, 2.12, -8]}
        radius={0.055}
        color="#5A5A5A"
        emissive="#333333"
        matRef={null}
        wireframe={false}
        transparent
        opacity={0.22}
      />

      {/* ─── Junction / clamp boxes ─────────────────────────────────────── */}
      {[-22, -10, 2].map((x) => (
        <group key={x} position={[x, 2.1, -8]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.09, 0.1]} />
            <meshStandardMaterial color="#3A3A3A" roughness={0.6} metalness={0.7} />
          </mesh>
          {/* Mounting screws */}
          {[-0.045, 0.045].map((dx, i) => (
            <mesh key={i} position={[dx, 0.05, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.02, 5]} />
              <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ─── Vertical conduit support poles ────────────────────────────── */}
      {[-22, -14, -6, 2].map((x) => (
        <mesh key={x} position={[x, 1.0, -8]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 2.0, 6]} />
          <meshStandardMaterial color="#4A4A4A" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}

      {/* ─── Grounding rod at solar array base ─────────────────────────── */}
      <mesh position={[-22, -0.5, -7.5]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.0, 5]} />
        <meshStandardMaterial color="#B87333" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* ─── Labels ────────────────────────────────────────────────────── */}
      <WireLabel pos={[-10, 2.55, -7.5]} color="#E07010" text="DC+" />
      <WireLabel pos={[-10, 2.28, -7.5]} color="#BBBBBB" text="DC−" />
      <WireLabel pos={[-10, 2.02, -7.5]} color="#44CC44" text="GND" />
      <WireLabel pos={[-22, 3.0, -7.5]}  color="#7EC8E3" text="PV OUTPUT" />
      <WireLabel pos={[2,   3.0, -7.5]}  color="#7EC8E3" text="MPPT INPUT" />

      {/* ─── Ammeter / current sensor on DC+ line ──────────────────────── */}
      <group position={[-6, 2.2, -7.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.06, 8]} />
          <meshStandardMaterial color="#2A2A2A" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.008, 8]} />
          <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Cable({
  from, to, radius, color, emissive, matRef, wireframe = false, transparent = false, opacity = 1,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  color: string;
  emissive: string;
  matRef: React.MutableRefObject<THREE.MeshStandardMaterial | null> | null;
  wireframe?: boolean;
  transparent?: boolean;
  opacity?: number;
}) {
  const [position, rotation, length] = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize()
    );
    const euler = new THREE.Euler().setFromQuaternion(q);
    return [
      mid.toArray() as [number, number, number],
      [euler.x, euler.y, euler.z] as [number, number, number],
      len,
    ];
  }, []);

  const setRef = (mat: THREE.MeshStandardMaterial | null) => {
    if (matRef) matRef.current = mat;
  };

  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[radius, radius, length, 7]} />
      <meshStandardMaterial
        ref={setRef}
        color={color}
        emissive={emissive}
        emissiveIntensity={0.4}
        roughness={0.55}
        metalness={0.2}
        wireframe={wireframe}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
}

function CableTray({ from, to, width }: { from: [number, number, number]; to: [number, number, number]; width: number }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = a.distanceTo(b);
  const angle = Math.atan2(b.z - a.z, b.x - a.x);

  return (
    <group position={mid.toArray() as [number, number, number]} rotation={[0, -angle, 0]}>
      {/* Tray base */}
      <mesh castShadow>
        <boxGeometry args={[len, 0.012, width]} />
        <meshStandardMaterial color="#3A3A3A" metalness={0.75} roughness={0.35} />
      </mesh>
      {/* Side rails */}
      {[-width / 2, width / 2].map((dz, i) => (
        <mesh key={i} position={[0, 0.025, dz]} castShadow>
          <boxGeometry args={[len, 0.04, 0.008]} />
          <meshStandardMaterial color="#2A2A2A" metalness={0.75} roughness={0.35} />
        </mesh>
      ))}
      {/* Cross struts every 0.8m */}
      {Array.from({ length: Math.floor(len / 0.8) }).map((_, i) => (
        <mesh key={i} position={[-len / 2 + (i + 0.5) * 0.8, 0.02, 0]} castShadow>
          <boxGeometry args={[0.008, 0.03, width]} />
          <meshStandardMaterial color="#444" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function WireLabel({ pos, color, text }: { pos: [number, number, number]; color: string; text: string }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={[text.length * 0.08 + 0.06, 0.12, 0.012]} />
      <meshStandardMaterial color="#111" roughness={0.6} />
    </mesh>
  );
}
