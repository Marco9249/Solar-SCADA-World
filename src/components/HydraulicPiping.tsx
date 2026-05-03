import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

/** Hyper-detailed hydraulic piping: Pump → Tank + Pump → Wheat field */
export default function HydraulicPiping() {
  const { weather } = useWeather();
  const flowMatRef  = useRef<THREE.ShaderMaterial | null>(null);
  const flowMatRef2 = useRef<THREE.ShaderMaterial | null>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (flowMatRef.current)  flowMatRef.current.uniforms.uTime.value  = t;
    if (flowMatRef2.current) flowMatRef2.current.uniforms.uTime.value = t;
  });

  // Flow indicator shader (scrolling stripe along pipe)
  const flowShader = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color("#2299DD") } },
      vertexShader: `varying vec2 vUv; void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          // Moving stripe pattern
          float stripe = fract(vUv.y * 5.0 - uTime * 1.8);
          float band   = smoothstep(0.0, 0.18, stripe) * (1.0 - smoothstep(0.5, 0.68, stripe));
          vec3 col     = mix(uColor * 0.4, uColor * 1.5, band);
          gl_FragColor = vec4(col, 0.75);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    flowMatRef.current = mat;
    return mat;
  }, []);

  const flowShader2 = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color("#55BBFF") } },
      vertexShader: `varying vec2 vUv; void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float stripe = fract(vUv.y * 6.0 - uTime * 1.4);
          float band   = smoothstep(0.0, 0.15, stripe) * (1.0 - smoothstep(0.42, 0.60, stripe));
          vec3 col     = mix(uColor * 0.3, uColor * 1.4, band);
          gl_FragColor = vec4(col, 0.68);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    flowMatRef2.current = mat;
    return mat;
  }, []);

  const pipeSegs = 10;

  // ── Pipe paths ─────────────────────────────────────────────────────────
  // 1) Pump [10,0,2] → Water Tank [18,0,2]: short horizontal run
  // 2) Pump [10,0,2] → header pipe → WheatField [0,0,20]: longer run with bends

  return (
    <group>
      {/* ── PUMP → WATER TANK ─────────────────────────────────────────── */}

      {/* Main supply pipe (large bore, grey steel) */}
      <Pipe from={[10, 1.2, 2]} to={[18, 1.2, 2]} r={0.12} color="#8A9BA8" metalness={0.75} roughness={0.35} />
      {/* Return pipe (smaller, darker) */}
      <Pipe from={[10, 0.8, 2]} to={[18, 0.8, 2]} r={0.08} color="#5A6A78" metalness={0.7} roughness={0.45} />

      {/* Flow indicator sleeve on supply */}
      <FlowPipe from={[10, 1.2, 2]} to={[18, 1.2, 2]} r={0.122} mat={flowShader} />

      {/* Flanges at joints */}
      {[[10, 1.2, 2], [18, 1.2, 2]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 10]} />
          <meshStandardMaterial color="#6A7A88" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Pressure gauge at pump outlet */}
      <PressureGauge position={[10, 1.7, 2.3]} />

      {/* Gate valve halfway */}
      <Valve position={[14, 1.2, 2]} />

      {/* Pipe elbow down into pump */}
      <mesh position={[10, 0.7, 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.12, 0.08, 8, 12, Math.PI / 2]} />
        <meshStandardMaterial color="#8A9BA8" metalness={0.75} roughness={0.35} />
      </mesh>
      <Pipe from={[10, 0.2, 2]} to={[10, 0.7, 2]} r={0.08} color="#8A9BA8" metalness={0.7} roughness={0.4} />

      {/* ── PUMP → WHEAT FIELD header ───────────────────────────────────── */}

      {/* Buried/surface main supply line (heading south to wheat field) */}
      <Pipe from={[10, 0.18, 2]}  to={[10, 0.18, 9]}   r={0.09} color="#7A7A7A" metalness={0.5} roughness={0.6} />
      <Pipe from={[10, 0.18, 9]}  to={[0,  0.18, 9]}   r={0.09} color="#7A7A7A" metalness={0.5} roughness={0.6} />
      <Pipe from={[0,  0.18, 9]}  to={[0,  0.18, 17]}  r={0.09} color="#7A7A7A" metalness={0.5} roughness={0.6} />

      {/* Flow indicator on main supply line */}
      <FlowPipe from={[10, 0.18, 2]} to={[10, 0.18, 9]} r={0.092} mat={flowShader2} />
      <FlowPipe from={[10, 0.18, 9]} to={[0,  0.18, 9]} r={0.092} mat={flowShader2} />

      {/* Header pipe along wheat field left edge */}
      <Pipe from={[-19, 0.18, 17]} to={[19, 0.18, 17]} r={0.07} color="#6A6A6A" metalness={0.5} roughness={0.65} />

      {/* Lateral drip manifolds (one per row) */}
      {Array.from({ length: 7 }, (_, r) => (r / 6 - 0.5) * 26 + 20).map((z, r) => (
        <group key={r}>
          <Pipe from={[-19, 0.12, z]} to={[19, 0.12, z]} r={0.04} color="#5A5A5A" metalness={0.5} roughness={0.7} />
          {/* Drip valves every ~5m */}
          {[-12, -6, 0, 6, 12].map((x, j) => (
            <mesh key={j} position={[x, 0.16, z]}>
              <cylinderGeometry args={[0.03, 0.03, 0.06, 6]} />
              <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Pipe support saddles along main run */}
      {[2, 4.5, 7].map((z, i) => (
        <group key={i} position={[10, 0, z]}>
          <mesh>
            <boxGeometry args={[0.12, 0.18, 0.06]} />
            <meshStandardMaterial color="#5A5A4A" roughness={0.8} metalness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Flow direction arrows along main pipe */}
      {[2.5, 5, 7.5].map((z, i) => (
        <mesh key={i} position={[10.18, 0.18, z]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.05, 0.12, 5]} />
          <meshStandardMaterial color="#55BBFF" emissive="#2299DD" emissiveIntensity={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Pipe({ from, to, r, color, metalness, roughness }: {
  from: [number,number,number]; to: [number,number,number];
  r: number; color: string; metalness: number; roughness: number;
}) {
  const [pos, rot, len] = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const length = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return [mid.toArray() as [number,number,number], [e.x,e.y,e.z] as [number,number,number], length];
  }, []);
  return (
    <mesh position={pos} rotation={rot} castShadow>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function FlowPipe({ from, to, r, mat }: {
  from: [number,number,number]; to: [number,number,number]; r: number; mat: THREE.ShaderMaterial;
}) {
  const [pos, rot, len] = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const length = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return [mid.toArray() as [number,number,number], [e.x,e.y,e.z] as [number,number,number], length];
  }, []);
  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function PressureGauge({ position }: { position: [number,number,number] }) {
  return (
    <group position={position}>
      {/* Gauge body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 12]} />
        <meshStandardMaterial color="#3A3A3A" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Dial face */}
      <mesh position={[0, 0.028, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.006, 12]} />
        <meshStandardMaterial color="#F5F5F5" roughness={0.7} />
      </mesh>
      {/* Needle */}
      <mesh position={[0, 0.036, 0]} rotation={[0, 0, 0.8]}>
        <boxGeometry args={[0.002, 0.06, 0.002]} />
        <meshStandardMaterial color="#DD2222" roughness={0.4} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.08, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Valve({ position }: { position: [number,number,number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      {/* Valve body */}
      <mesh castShadow>
        <boxGeometry args={[0.24, 0.12, 0.18]} />
        <meshStandardMaterial color="#4A5A6A" metalness={0.75} roughness={0.35} />
      </mesh>
      {/* Handwheel */}
      <mesh position={[0, 0.14, 0]}>
        <torusGeometry args={[0.09, 0.015, 6, 16]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.08, 5]} />
        <meshStandardMaterial color="#666" metalness={0.75} roughness={0.3} />
      </mesh>
    </group>
  );
}
