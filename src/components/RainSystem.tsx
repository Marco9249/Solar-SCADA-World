import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";
import { tickAmbience } from "../utils/audioEngine";

const DROP_COUNT   = 6000;
const FIELD_HALF   = 100;
const RAIN_TOP     = 30;
const RAIN_BOT     = -0.5;
const SPLASH_COUNT = 120;

interface DropData {
  x: number; z: number; y: number;
  speed: number;
  windX: number; windZ: number;
}

interface SplashData {
  x: number; z: number;
  age: number; maxAge: number;
  size: number;
}

export default function RainSystem() {
  const { isRaining, weather } = useWeather();
  const dropMeshRef  = useRef<THREE.InstancedMesh>(null);
  const wetPlaneRef  = useRef<THREE.Mesh>(null);
  const splashRef    = useRef<THREE.InstancedMesh>(null);
  const rippleRef    = useRef<THREE.InstancedMesh>(null);
  const drops        = useRef<DropData[]>([]);
  const visibility   = useRef(0);
  const windGust     = useRef({ x: -0.6, z: -0.2, timer: 0 });

  useEffect(() => {
    drops.current = Array.from({ length: DROP_COUNT }, (_, i) => ({
      x:     (Math.sin(i * 7.3) * 0.5 + 0.5) * FIELD_HALF * 2 - FIELD_HALF,
      z:     (Math.cos(i * 5.1) * 0.5 + 0.5) * FIELD_HALF * 2 - FIELD_HALF,
      y:     Math.random() * (RAIN_TOP - RAIN_BOT) + RAIN_BOT,
      speed: 16 + Math.random() * 10,
      windX: -0.5 + Math.random() * 0.3,
      windZ: -0.1 + Math.random() * 0.2,
    }));
  }, []);

  const dropGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.006, 0.011, 0.48, 3, 1);
    g.rotateX(0.22);
    return g;
  }, []);

  const dropMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#AADDFF", transparent: true, opacity: 0, depthWrite: false,
    metalness: 0.2, roughness: 0.0, envMapIntensity: 0.5,
  }), []);

  const wetTex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext("2d")!;

    const bg = ctx.createLinearGradient(0, 0, 512, 512);
    bg.addColorStop(0,   "rgba(18, 55, 95, 0.80)");
    bg.addColorStop(0.5, "rgba(12, 42, 78, 0.72)");
    bg.addColorStop(1,   "rgba(10, 38, 70, 0.80)");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 18; i++) {
      const px = (Math.sin(i * 9.3) * 0.5 + 0.5) * 512;
      const py = (Math.cos(i * 7.1) * 0.5 + 0.5) * 512;
      const pr = 18 + Math.abs(Math.sin(i * 4.2)) * 45;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
      pg.addColorStop(0,   "rgba(50,120,200,0.55)");
      pg.addColorStop(0.4, "rgba(35, 90,160,0.38)");
      pg.addColorStop(1,   "rgba(10, 40, 80,0)");
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(px, py, pr, pr * 0.62, i * 0.4, 0, Math.PI * 2); ctx.fill();
    }

    for (let i = 0; i < 55; i++) {
      const rx = (Math.sin(i * 8.3 + 1.2) * 0.5 + 0.5) * 512;
      const ry = (Math.cos(i * 6.1 + 0.8) * 0.5 + 0.5) * 512;
      const rr = 5 + Math.abs(Math.sin(i * 4.7)) * 30;
      const alpha = 0.10 + Math.abs(Math.sin(i * 3.1)) * 0.22;
      ctx.strokeStyle = `rgba(140,200,255,${alpha})`;
      ctx.lineWidth = 0.8 + Math.abs(Math.sin(i * 2.3)) * 0.8;
      ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.stroke();
      if (rr > 12) {
        ctx.strokeStyle = `rgba(180,230,255,${alpha * 0.4})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(rx, ry, rr * 0.55, 0, Math.PI * 2); ctx.stroke();
      }
    }

    for (let i = 0; i < 80; i++) {
      const mx = (Math.sin(i * 11.3) * 0.5 + 0.5) * 512;
      const my = (Math.cos(i * 9.7)  * 0.5 + 0.5) * 512;
      ctx.strokeStyle = `rgba(100,180,255,${0.05 + Math.abs(Math.sin(i * 4)) * 0.08})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(mx, my);
      ctx.quadraticCurveTo(mx + Math.sin(i * 3.1) * 8, my + Math.cos(i * 2.3) * 6,
                           mx + Math.cos(i * 4.7) * 12, my + Math.sin(i * 3.9) * 10);
      ctx.stroke();
    }

    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 10); t.anisotropy = 8;
    return t;
  }, []);

  const wetMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: wetTex, color: "#2A4A5A", transparent: true, opacity: 0,
    roughness: 0.02, metalness: 0.45, depthWrite: false, envMapIntensity: 1.0,
  }), [wetTex]);

  const splashGeo = useMemo(() => {
    const g = new THREE.RingGeometry(0.8, 1.0, 12);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const splashMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#BBDDFF", transparent: true, opacity: 0.45,
    depthWrite: false, roughness: 0.1, side: THREE.DoubleSide,
  }), []);

  const rippleGeo = useMemo(() => new THREE.SphereGeometry(0.12, 8, 4, 0, Math.PI * 2, 0, Math.PI / 4), []);
  const rippleMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#CCEEFF", transparent: true, opacity: 0.32,
    depthWrite: false, roughness: 0.05, metalness: 0.3,
  }), []);

  const splashData = useRef<SplashData[]>(
    Array.from({ length: SPLASH_COUNT }, (_, i) => ({
      x: (Math.sin(i * 11.3) * 0.5 + 0.5) * 120 - 60,
      z: (Math.cos(i * 9.1)  * 0.5 + 0.5) * 120 - 60,
      age:    i * 0.055,
      maxAge: 0.3 + Math.random() * 0.35,
      size:   0.4 + Math.random() * 0.8,
    })),
  );

  const _m = useMemo(() => new THREE.Matrix4(), []);
  const _p = useMemo(() => new THREE.Vector3(), []);
  const _q = useMemo(() => new THREE.Quaternion(), []);
  const _s = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // ── Audio: rain ambience + thunder ──────────────────────────────────────
    const isStorm = weather.mode === "fluctuating" && isRaining;
    tickAmbience(delta, isRaining, isStorm);

    // ── Visibility fade ──────────────────────────────────────────────────────
    const targetVis = isRaining ? 1 : 0;
    visibility.current = THREE.MathUtils.lerp(visibility.current, targetVis, delta * 3.5);
    const vis = visibility.current;

    // ── Dynamic wind gust ────────────────────────────────────────────────────
    windGust.current.timer -= delta;
    if (windGust.current.timer <= 0) {
      windGust.current.x = -0.3 - Math.random() * 0.7;
      windGust.current.z = -0.15 + Math.random() * 0.3;
      windGust.current.timer = 2 + Math.random() * 4;
    }
    const globalWindX = windGust.current.x * (weather.windSpeed ?? 4) / 4;
    const globalWindZ = windGust.current.z * (weather.windSpeed ?? 4) / 4;

    // ── Wet ground ───────────────────────────────────────────────────────────
    if (wetPlaneRef.current) {
      const mat = wetPlaneRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity   = vis * 0.68;
      mat.roughness = THREE.MathUtils.lerp(mat.roughness, vis < 0.5 ? 0.9 : 0.02, delta * 3);
    }
    dropMat.opacity = vis * 0.58;

    const dm = dropMeshRef.current;
    const sm = splashRef.current;
    const rm = rippleRef.current;
    if (!dm || !sm || !rm) return;

    // ── Drops ────────────────────────────────────────────────────────────────
    for (let i = 0; i < DROP_COUNT; i++) {
      const d = drops.current[i];
      if (!d || vis < 0.02) {
        _m.makeScale(0, 0, 0);
        dm.setMatrixAt(i, _m);
        continue;
      }

      d.y -= d.speed * delta;
      d.x += (d.windX + globalWindX) * delta;
      d.z += (d.windZ + globalWindZ) * delta;

      if (d.y < RAIN_BOT) {
        d.y  = RAIN_TOP + Math.random() * 4;
        d.x  = (Math.random() - 0.5) * FIELD_HALF * 2;
        d.z  = (Math.random() - 0.5) * FIELD_HALF * 2;
        d.speed = 16 + Math.random() * 10;
      }
      if (d.x < -FIELD_HALF) d.x += FIELD_HALF * 2;
      if (d.x >  FIELD_HALF) d.x -= FIELD_HALF * 2;
      if (d.z < -FIELD_HALF) d.z += FIELD_HALF * 2;
      if (d.z >  FIELD_HALF) d.z -= FIELD_HALF * 2;

      const sc = vis * (0.85 + Math.abs(Math.sin(i * 1.7)) * 0.3);
      _p.set(d.x, d.y, d.z); _s.set(sc, sc, sc);
      _m.compose(_p, _q.identity(), _s);
      dm.setMatrixAt(i, _m);
    }
    dm.instanceMatrix.needsUpdate = true;

    // ── Splash rings ──────────────────────────────────────────────────────────
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const sp = splashData.current[i];
      sp.age += delta * (isRaining ? 1 : 4);

      if (sp.age > sp.maxAge || !isRaining) {
        if (!isRaining) {
          _m.makeScale(0, 0, 0);
          sm.setMatrixAt(i, _m); rm.setMatrixAt(i, _m);
          continue;
        }
        sp.age    = 0;
        sp.x      = (Math.random() - 0.5) * 150;
        sp.z      = (Math.random() - 0.5) * 150;
        sp.maxAge = 0.28 + Math.random() * 0.32;
        sp.size   = 0.3 + Math.random() * 0.9;
      }

      const prog = sp.age / sp.maxAge;
      const sc   = prog * sp.size * vis;

      _p.set(sp.x, 0.02, sp.z); _s.set(sc, sc, sc);
      _m.compose(_p, _q.identity(), _s);
      sm.setMatrixAt(i, _m);

      if (prog < 0.3) {
        const rsc = (1 - prog / 0.3) * vis * sp.size * 0.4;
        _p.set(sp.x, 0.02, sp.z); _s.set(rsc, rsc, rsc);
        _m.compose(_p, _q.identity(), _s);
      } else {
        _m.makeScale(0, 0, 0);
      }
      rm.setMatrixAt(i, _m);

      splashMat.opacity = 0.42 * vis;
      rippleMat.opacity = 0.30 * vis;
    }
    sm.instanceMatrix.needsUpdate = true;
    rm.instanceMatrix.needsUpdate = true;

    if (vis > 0.05) {
      wetTex.offset.x = Math.sin(t * 0.08) * 0.003;
      wetTex.offset.y = t * 0.012 * vis;
    }
  });

  return (
    <>
      <instancedMesh ref={dropMeshRef} args={[dropGeo, dropMat, DROP_COUNT]} renderOrder={10} />

      <mesh ref={wetPlaneRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} renderOrder={5}>
        <planeGeometry args={[FIELD_HALF * 2, FIELD_HALF * 2, 1, 1]} />
        <primitive object={wetMat} attach="material" />
      </mesh>

      <instancedMesh ref={splashRef} args={[splashGeo, splashMat, SPLASH_COUNT]} renderOrder={6} />
      <instancedMesh ref={rippleRef} args={[rippleGeo, rippleMat, SPLASH_COUNT]} renderOrder={7} />
    </>
  );
}
