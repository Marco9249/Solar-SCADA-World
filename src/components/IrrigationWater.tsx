import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

const DRIP_ROWS = 7;
const FIELD_W = 38;
const FIELD_D = 26;
const EMITTERS_PER_ROW = 13;
const MAX_DROPS = 80;

interface DropData {
  row: number;
  col: number;
  y: number;
  speed: number;
  life: number; // 0..1
  active: boolean;
}

/** Photorealistic irrigation water — flow + drips + moisture seep */
export default function IrrigationWater({ position }: { position: [number, number, number] }) {
  const { weather } = useWeather();
  const flowRef   = useRef<THREE.ShaderMaterial | null>(null);
  const dropsRef  = useRef<THREE.InstancedMesh>(null);
  const moistRef  = useRef<THREE.InstancedMesh>(null);
  const drops     = useRef<DropData[]>([]);

  // ── Water canvas texture (normal-map style) ─────────────────────────────
  const waterTex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 64;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0,    "rgba(40,120,200,0.0)");
    g.addColorStop(0.12, "rgba(60,160,230,0.8)");
    g.addColorStop(0.88, "rgba(60,160,230,0.8)");
    g.addColorStop(1,    "rgba(40,120,200,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 64);
    // Ripple lines
    for (let i = 0; i < 16; i++) {
      const x = (i / 16) * 256;
      ctx.strokeStyle = `rgba(120,200,255,${0.15 + Math.abs(Math.sin(i * 2.3)) * 0.25})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 64); ctx.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 1);
    return t;
  }, []);

  // ── Flow channel shader material ─────────────────────────────────────────
  const flowMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:      { value: 0 },
        uTex:       { value: waterTex },
        uOpacity:   { value: 0.72 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vEdge;
        void main() {
          vUv  = uv;
          vEdge = abs(uv.y - 0.5) * 2.0;
          vec3 pos = position;
          pos.y += sin(pos.x * 14.0 + uTime * 4.5) * 0.006;
          pos.y += sin(pos.x * 8.0  - uTime * 3.0) * 0.004;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uTex;
        uniform float uOpacity;
        varying vec2 vUv;
        varying float vEdge;
        void main() {
          vec2 flowUv = vUv;
          flowUv.x += uTime * 0.28; // scroll along row (Z direction)
          vec4 col = texture2D(uTex, flowUv);
          float edgeFade = 1.0 - smoothstep(0.6, 1.0, vEdge);
          // Caustic shimmer
          float shimmer = sin(vUv.x * 40.0 + uTime * 6.0) * 0.08 + 0.92;
          col.rgb *= shimmer;
          col.rgb = mix(col.rgb, vec3(0.15, 0.55, 0.85), 0.35);
          gl_FragColor = vec4(col.rgb, col.a * edgeFade * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    flowRef.current = mat;
    return mat;
  }, [waterTex]);

  // ── Moisture seep canvas texture ─────────────────────────────────────────
  const moistTex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 128; cv.height = 128;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0,    "rgba(20,60,100,0.7)");
    g.addColorStop(0.35, "rgba(30,80,120,0.45)");
    g.addColorStop(0.7,  "rgba(40,90,140,0.18)");
    g.addColorStop(1,    "rgba(40,90,140,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv);
    return t;
  }, []);

  // ── Initialise drops ─────────────────────────────────────────────────────
  useEffect(() => {
    drops.current = Array.from({ length: MAX_DROPS }, (_, i) => ({
      row: i % DRIP_ROWS,
      col: Math.floor(i / DRIP_ROWS) % EMITTERS_PER_ROW,
      y: Math.random() * 0.5,
      speed: 0.6 + Math.random() * 0.5,
      life: Math.random(),
      active: true,
    }));
  }, []);

  const _mat = new THREE.Matrix4();
  const _pos = new THREE.Vector3();
  const _sc  = new THREE.Vector3();
  const _q   = new THREE.Quaternion();

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (flowRef.current) {
      flowRef.current.uniforms.uTime.value = t;
      const act = weather.mode !== "overcast";
      flowRef.current.uniforms.uOpacity.value = act ? 0.75 : 0.35;
    }

    const dropsActive = weather.mode !== "overcast";
    const dm = dropsRef.current;
    const mm = moistRef.current;
    if (!dm || !mm) return;

    for (let i = 0; i < MAX_DROPS; i++) {
      const d = drops.current[i];
      if (!d || !dropsActive) { _mat.makeScale(0, 0, 0); dm.setMatrixAt(i, _mat); mm.setMatrixAt(i, _mat); continue; }

      d.life += delta * d.speed * 1.2;
      d.y    -= delta * d.speed * 0.55;

      if (d.y < -0.02 || d.life > 1) {
        // Respawn
        d.row   = Math.floor(Math.random() * DRIP_ROWS);
        d.col   = Math.floor(Math.random() * EMITTERS_PER_ROW);
        d.y     = 0.04;
        d.speed = 0.5 + Math.random() * 0.6;
        d.life  = 0;
      }

      // Emitter world position (relative to component group)
      const ex = (d.col / (EMITTERS_PER_ROW - 1) - 0.5) * FIELD_W;
      const ez = (d.row / (DRIP_ROWS - 1) - 0.5) * FIELD_D;
      const ey = d.y;

      const sc = d.life < 0.5 ? 0.025 : 0.018 * (1 - d.life) + 0.01;

      // Drop sphere
      _pos.set(ex, ey, ez);
      _sc.set(sc, sc, sc);
      _mat.compose(_pos, _q.identity(), _sc);
      dm.setMatrixAt(i, _mat);
      dm.setColorAt?.(i, new THREE.Color(0.3, 0.7, 0.95));

      // Moisture seep (on landing)
      const seepS = d.y < 0.02 ? Math.min(0.9, (0.02 - d.y) * 40 + 0.15) : 0;
      _pos.set(ex, 0.015, ez);
      _sc.set(seepS, 0.001, seepS);
      _mat.compose(_pos, _q.identity(), _sc);
      mm.setMatrixAt(i, _mat);
    }

    dm.instanceMatrix.needsUpdate = true;
    mm.instanceMatrix.needsUpdate = true;
    if (dm.instanceColor) dm.instanceColor.needsUpdate = true;
  });

  const dropGeo  = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const dropMat  = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#4AC8FF", roughness: 0.05, metalness: 0.0,
    transparent: true, opacity: 0.82, depthWrite: false,
  }), []);
  const moistGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const moistMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: moistTex, transparent: true, opacity: 0.8, roughness: 0.95,
    depthWrite: false, side: THREE.DoubleSide,
  }), [moistTex]);

  const rowData = useMemo(() =>
    Array.from({ length: DRIP_ROWS }, (_, r) => ({
      z: (r / (DRIP_ROWS - 1) - 0.5) * FIELD_D,
    })), []);

  const flowGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(FIELD_W, 0.12, 30, 2);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  return (
    <group position={position}>
      {/* Water channel planes along each drip row */}
      {rowData.map((row, r) => (
        <mesh key={r} geometry={flowGeo} material={flowMat} position={[0, 0.055, row.z]} />
      ))}

      {/* Main header pipe flow visual (left side entry) */}
      <mesh position={[-FIELD_W / 2 - 0.5, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[FIELD_D, 0.18, 30, 2]} />
        <shaderMaterial
          args={[{
            uniforms: { uTime: { value: 0 }, uTex: { value: waterTex }, uOpacity: { value: 0.65 } },
            vertexShader: `uniform float uTime; varying vec2 vUv;
              void main() { vUv=uv; vec3 p=position; p.y+=sin(p.x*10.0+uTime*5.0)*0.005; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
            fragmentShader: `uniform float uTime; uniform sampler2D uTex; uniform float uOpacity; varying vec2 vUv;
              void main() { vec2 uv=vUv; uv.x+=uTime*0.3; vec4 c=texture2D(uTex,uv); c.rgb=mix(c.rgb,vec3(0.15,0.55,0.85),0.4); gl_FragColor=vec4(c.rgb,c.a*uOpacity); }`,
            transparent: true, depthWrite: false, side: THREE.DoubleSide,
          }]}
        />
      </mesh>

      {/* Water droplets InstancedMesh */}
      <instancedMesh ref={dropsRef} args={[dropGeo, dropMat, MAX_DROPS]} />

      {/* Moisture seep InstancedMesh */}
      <instancedMesh ref={moistRef} args={[moistGeo, moistMat, MAX_DROPS]} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}
