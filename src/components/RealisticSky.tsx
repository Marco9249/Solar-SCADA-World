import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

const SKY_CONFIGS = {
  clear: {
    turbidity: 4, rayleigh: 1.8, mieCoefficient: 0.003, mieDirectionalG: 0.92,
    elevation: 48, azimuth: 210,
  },
  fluctuating: {
    turbidity: 9, rayleigh: 2.8, mieCoefficient: 0.008, mieDirectionalG: 0.88,
    elevation: 38, azimuth: 215,
  },
  overcast: {
    turbidity: 18, rayleigh: 4.5, mieCoefficient: 0.02, mieDirectionalG: 0.75,
    elevation: 20, azimuth: 220,
  },
};

// ─── Cloud layer canvas texture ───────────────────────────────────────────────
function makeCloudCanvas(w: number, h: number, seed: number) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);

  // Big cumulus blobs
  const blobs = 55 + (seed % 20);
  for (let i = 0; i < blobs; i++) {
    const s = seed + i;
    const x  = (Math.sin(s * 7.3 + 1.1) * 0.5 + 0.5) * w;
    const y  = (Math.cos(s * 5.1 + 0.7) * 0.5 + 0.5) * h;
    const rx = 40 + (Math.abs(Math.sin(s * 4.1)) * 110);
    const ry = 20 + (Math.abs(Math.sin(s * 2.9)) * 55);

    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    const baseA = 0.55 + (Math.sin(s * 3.7) * 0.5 + 0.5) * 0.38;
    g.addColorStop(0,    `rgba(255,255,255,${baseA})`);
    g.addColorStop(0.35, `rgba(240,245,255,${baseA * 0.6})`);
    g.addColorStop(0.65, `rgba(220,235,255,${baseA * 0.22})`);
    g.addColorStop(1,    "rgba(220,235,255,0)");

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (s * 0.3) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dark shading on cloud undersides
  for (let i = 0; i < 20; i++) {
    const s = seed + i + 100;
    const x  = (Math.sin(s * 11.3) * 0.5 + 0.5) * w;
    const y  = (Math.cos(s * 8.7) * 0.5 + 0.5) * h + h * 0.22;
    const rx = 30 + Math.abs(Math.sin(s * 5.1)) * 80;
    const ry = 10 + Math.abs(Math.sin(s * 3.3)) * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, "rgba(160,175,200,0.22)");
    g.addColorStop(1, "rgba(160,175,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  return cv;
}

// ─── A single animated cloud plane layer ─────────────────────────────────────
function CloudLayer({
  y, size, scrollSpeed, seed, opacity,
}: {
  y: number; size: number; scrollSpeed: number; seed: number; opacity: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  const cloudTex = useMemo(() => {
    const t = new THREE.CanvasTexture(makeCloudCanvas(1024, 512, seed));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1.5);
    return t;
  }, [seed]);

  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTex:      { value: cloudTex },
        uTime:     { value: 0 },
        uOpacity:  { value: opacity },
        uSpeed:    { value: scrollSpeed },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          uv.x += uTime * uSpeed;
          vec4 cloud = texture2D(uTex, uv);
          // Edge fade so clouds don't tile obviously
          float edgeFadeX = smoothstep(0.0, 0.08, uv.x) * (1.0 - smoothstep(0.92, 1.0, uv.x));
          float edgeFadeY = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.94, 1.0, vUv.y));
          gl_FragColor = vec4(cloud.rgb, cloud.a * uOpacity * edgeFadeX * edgeFadeY);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    matRef.current = m;
    return m;
  }, [cloudTex, opacity, scrollSpeed]);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime() * 0.01;
  });

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size, 1, 1]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

// ─── Main sky component ───────────────────────────────────────────────────────
export default function RealisticSky() {
  const { weather } = useWeather();
  const cfg = SKY_CONFIGS[weather.mode];

  const sunPos = new THREE.Vector3(
    Math.cos((cfg.azimuth * Math.PI) / 180) * Math.cos((cfg.elevation * Math.PI) / 180),
    Math.sin((cfg.elevation * Math.PI) / 180),
    Math.sin((cfg.azimuth * Math.PI) / 180) * Math.cos((cfg.elevation * Math.PI) / 180)
  );

  const cloudOpacity = weather.mode === "clear" ? 0.52 : weather.mode === "fluctuating" ? 0.72 : 0.88;

  return (
    <>
      <Sky
        distance={4500}
        sunPosition={sunPos}
        turbidity={cfg.turbidity}
        rayleigh={cfg.rayleigh}
        mieCoefficient={cfg.mieCoefficient}
        mieDirectionalG={cfg.mieDirectionalG}
      />

      {/* Three volumetric-style cloud layers at different heights and speeds */}
      <CloudLayer y={95}  size={900} scrollSpeed={0.012} seed={1}  opacity={cloudOpacity * 0.75} />
      <CloudLayer y={115} size={1100} scrollSpeed={0.007} seed={42} opacity={cloudOpacity * 0.6}  />
      <CloudLayer y={145} size={1400} scrollSpeed={0.004} seed={99} opacity={cloudOpacity * 0.42} />

      {/* High thin cirrus-style layer */}
      <CloudLayer y={200} size={1800} scrollSpeed={0.002} seed={17} opacity={cloudOpacity * 0.22} />
    </>
  );
}
