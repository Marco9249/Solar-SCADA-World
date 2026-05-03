import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";
import { heightAt, makeTreeTexture, makeAcaciaTexture, makeTreeBarkTex } from "../utils/terrain";

const TREE_COUNT   = 900;
const ACACIA_COUNT = 350;

function generateTreePositions(count: number, minDist: number, maxDist: number, seed: number) {
  const positions: [number, number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle      = (i * 2.3999 + seed) % (Math.PI * 2);
    const radiusFrac = i / count;
    const radius     = minDist + radiusFrac * (maxDist - minDist) + Math.sin(i * 7.3 + seed) * 10;
    const jitter     = Math.sin(i * 13.7 + seed) * 7;
    const x          = Math.cos(angle) * radius + jitter;
    const z          = Math.sin(angle) * radius + Math.cos(i * 5.1 + seed) * 6;
    const y          = heightAt(x, z);
    const scale      = 0.82 + (Math.sin(i * 3.7 + seed) * 0.5 + 0.5) * 1.32;
    positions.push([x, y, z, scale]);
  }
  return positions;
}

// ── Dense multi-layer canopy texture ─────────────────────────────────────────
function makeDenseCanopyTex(size = 512): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  // Trunk
  const tw = size * 0.10; const th = size * 0.38; const tx = size / 2 - tw / 2; const ty = size - th;
  const tg = ctx.createLinearGradient(tx, 0, tx + tw, 0);
  tg.addColorStop(0, "#1E0D03"); tg.addColorStop(0.25, "#3C1C09");
  tg.addColorStop(0.52, "#502A12"); tg.addColorStop(0.78, "#3C1C09"); tg.addColorStop(1, "#1E0D03");
  ctx.fillStyle = tg; ctx.fillRect(tx, ty, tw, th);

  for (let i = 0; i < 100; i++) {
    const bx = tx + (Math.sin(i * 7.3) * 0.5 + 0.5) * tw;
    const by = ty + (Math.sin(i * 5.1) * 0.5 + 0.5) * th;
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = `hsl(22,${30 + Math.abs(Math.sin(i * 2)) * 12}%,${10 + Math.sin(i * 3.7) * 7}%)`;
    ctx.beginPath(); ctx.arc(bx, by, 1 + Math.abs(Math.sin(i * 4.2)) * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 16; i++) {
    const bx = tx + (i / 15) * tw;
    ctx.strokeStyle = `rgba(8,3,0,${0.22 + Math.abs(Math.sin(i * 2.1)) * 0.16})`;
    ctx.lineWidth = 0.7 + Math.abs(Math.sin(i)) * 0.5;
    ctx.beginPath(); ctx.moveTo(bx, ty);
    for (let y = ty; y < ty + th; y += 18) ctx.lineTo(bx + Math.sin(y * 0.08 + i) * 3.5, y);
    ctx.stroke();
  }

  // 9 foliage layers — dense overlapping canopy
  const layers = [
    { cy: size * 0.80, rx: size * 0.50, ry: size * 0.20, h: 0 },
    { cy: size * 0.68, rx: size * 0.46, ry: size * 0.24, h: 1 },
    { cy: size * 0.55, rx: size * 0.42, ry: size * 0.23, h: 2 },
    { cy: size * 0.43, rx: size * 0.36, ry: size * 0.22, h: 3 },
    { cy: size * 0.32, rx: size * 0.30, ry: size * 0.21, h: 4 },
    { cy: size * 0.23, rx: size * 0.23, ry: size * 0.18, h: 5 },
    { cy: size * 0.16, rx: size * 0.17, ry: size * 0.15, h: 6 },
    { cy: size * 0.10, rx: size * 0.12, ry: size * 0.11, h: 7 },
    { cy: size * 0.06, rx: size * 0.07, ry: size * 0.07, h: 8 },
  ];

  const palette = [
    { dark: "#0A1C0A", mid: "#142C16", bright: "#1E4220" },
    { dark: "#122A14", mid: "#1E5222", bright: "#266630" },
    { dark: "#183618", mid: "#2A6030", bright: "#347A3C" },
    { dark: "#1E4020", mid: "#306A38", bright: "#3C8846" },
    { dark: "#224824", mid: "#367040", bright: "#44904E" },
    { dark: "#264E28", mid: "#3A7844", bright: "#4A9E56" },
    { dark: "#2A5430", mid: "#3E8050", bright: "#52AA60" },
    { dark: "#2E5A34", mid: "#428856", bright: "#58B468" },
    { dark: "#305E36", mid: "#448E5A", bright: "#5AB86E" },
  ];

  for (let li = 0; li < layers.length; li++) {
    const l = layers[li];
    const p = palette[li];

    const g = ctx.createRadialGradient(size / 2, l.cy, 0, size / 2, l.cy, Math.max(l.rx, l.ry));
    g.addColorStop(0,    p.bright + "F8"); g.addColorStop(0.30, p.bright + "D0");
    g.addColorStop(0.52, p.mid    + "A8"); g.addColorStop(0.72, p.dark   + "70");
    g.addColorStop(0.88, p.dark   + "38"); g.addColorStop(1,    p.dark   + "00");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(size / 2, l.cy, l.rx, l.ry, 0, 0, Math.PI * 2); ctx.fill();

    // Dense leaf dab clusters — 40 per layer for ultra-dense look
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2 + li * 0.45;
      const rad   = (0.25 + (Math.sin(i * 2.7) * 0.5 + 0.5) * 0.68) * l.rx;
      const lx    = size / 2 + Math.cos(angle) * rad;
      const ly    = l.cy + Math.sin(angle) * l.ry * 0.78;
      const ls    = 2.5 + Math.abs(Math.sin(i * 3.1)) * 5.5;
      ctx.globalAlpha = 0.10 + Math.abs(Math.sin(i * 2.3)) * 0.16;
      const r2    = 65  + Math.sin(i * 4)  * 28 + l.h * 8;
      const g2    = 130 + Math.cos(i * 3)  * 32 + l.h * 6;
      const b2    = 32  + Math.sin(i * 5)  * 14;
      ctx.fillStyle = `rgb(${Math.min(255,r2)},${Math.min(255,g2)},${b2})`;
      ctx.beginPath(); ctx.ellipse(lx, ly, ls, ls * 0.62, i * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Specular leaf glints
    for (let i = 0; i < 12; i++) {
      const gx = size / 2 + Math.sin(i * 4.7 + li) * l.rx * 0.55;
      const gy = l.cy + Math.cos(i * 3.3 + li * 0.1) * l.ry * 0.55;
      ctx.globalAlpha = 0.05 + Math.abs(Math.sin(i * 2.1)) * 0.07;
      ctx.fillStyle = "#CCFF88";
      ctx.beginPath(); ctx.ellipse(gx, gy, 3.5, 2, i * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Sun rim highlight
  const hg = ctx.createRadialGradient(size * 0.36, size * 0.09, 0, size * 0.36, size * 0.09, size * 0.30);
  hg.addColorStop(0, "rgba(210,255,130,0.40)"); hg.addColorStop(0.5, "rgba(170,240,100,0.20)");
  hg.addColorStop(1, "rgba(170,240,100,0)");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(size * 0.36, size * 0.09, size * 0.30, size * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();

  // Ambient shadow underside
  const sg = ctx.createRadialGradient(size / 2, size * 0.72, 0, size / 2, size * 0.72, size * 0.44);
  sg.addColorStop(0, "rgba(0,0,0,0.38)"); sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(size / 2, size * 0.72, size * 0.44, size * 0.15, 0, 0, Math.PI * 2); ctx.fill();

  return cv;
}

export default function Forest() {
  const { weather } = useWeather();

  const treeRef1 = useRef<THREE.InstancedMesh>(null);
  const treeRef2 = useRef<THREE.InstancedMesh>(null);
  const treeRef3 = useRef<THREE.InstancedMesh>(null);
  const acRef1   = useRef<THREE.InstancedMesh>(null);
  const acRef2   = useRef<THREE.InstancedMesh>(null);
  const acRef3   = useRef<THREE.InstancedMesh>(null);
  const trunkRef  = useRef<THREE.InstancedMesh>(null);
  const atrunkRef = useRef<THREE.InstancedMesh>(null);

  const treePos   = useMemo(() => generateTreePositions(TREE_COUNT,   70, 160, 1.0), []);
  const acaciaPos = useMemo(() => generateTreePositions(ACACIA_COUNT, 55, 145, 3.7), []);

  const treeTex = useMemo(() => {
    const t = new THREE.CanvasTexture(makeDenseCanopyTex(512));
    t.anisotropy = 16;
    return t;
  }, []);

  const acaciaTex = useMemo(() => {
    const t = new THREE.CanvasTexture(makeAcaciaTexture(512));
    t.anisotropy = 8;
    return t;
  }, []);

  const barkTex = useMemo(() => {
    const t = new THREE.CanvasTexture(makeTreeBarkTex(256));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 3); t.anisotropy = 8;
    return t;
  }, []);

  const planeGeo  = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const trunkGeo  = useMemo(() => new THREE.CylinderGeometry(0.055, 0.085, 1, 8), []);
  const atrunkGeo = useMemo(() => new THREE.CylinderGeometry(0.048, 0.072, 1, 7), []);

  // ── Wind-animated tree material ───────────────────────────────────────────
  const treeShaderRef = useRef<THREE.WebGLProgramParametersWithUniforms | null>(null);
  const acShaderRef   = useRef<THREE.WebGLProgramParametersWithUniforms | null>(null);

  const treeMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: treeTex, transparent: true, alphaTest: 0.12,
      side: THREE.DoubleSide, roughness: 0.82, metalness: 0.0,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWind = { value: 0.18 };
      shader.vertexShader = `uniform float uTime;\nuniform float uWind;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float topF = smoothstep(0.0, 1.0, (position.y + 0.5));
        float sw1 = sin(ip.x * 0.8 + ip.z * 0.6 + uTime * 1.4) * 0.012;
        float sw2 = cos(ip.x * 1.4 - ip.z * 1.1 + uTime * 2.1 + 0.8) * 0.006;
        float swayX = (sw1 + sw2) * uWind * topF;
        float swayZ = swayX * 0.38;
        transformed.x += swayX;
        transformed.z += swayZ;
        `,
      );
      treeShaderRef.current = shader;
    };
    return mat;
  }, [treeTex]);

  const acaciaMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: acaciaTex, transparent: true, alphaTest: 0.12,
      side: THREE.DoubleSide, roughness: 0.82, metalness: 0.0,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWind = { value: 0.18 };
      shader.vertexShader = `uniform float uTime;\nuniform float uWind;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float topF = smoothstep(0.0, 1.0, (position.y + 0.5));
        float sw1 = sin(ip.x * 0.7 + ip.z * 0.55 + uTime * 1.2 + 1.5) * 0.014;
        float sw2 = cos(ip.x * 1.2 - ip.z * 0.9 + uTime * 1.9 + 0.5) * 0.007;
        float swayX = (sw1 + sw2) * uWind * topF;
        transformed.x += swayX;
        transformed.z += swayX * 0.42;
        `,
      );
      acShaderRef.current = shader;
    };
    return mat;
  }, [acaciaTex]);

  const barkMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: barkTex, roughness: 0.92, metalness: 0.02, color: "#2A1208",
  }), [barkTex]);

  useEffect(() => {
    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const q0  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), 0);
    const q60 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI / 3);
    const q120= new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI * 2 / 3);
    const qId = new THREE.Quaternion();
    const sc  = new THREE.Vector3();

    const refs = [
      { ref: treeRef1, q: q0 },
      { ref: treeRef2, q: q60 },
      { ref: treeRef3, q: q120 },
    ];

    for (const { ref, q } of refs) {
      if (!ref.current) continue;
      treePos.forEach(([x, y, z, scale], i) => {
        const h = 5.8 * scale; const w = 4.2 * scale;
        pos.set(x, y + h / 2 - 0.25, z);
        sc.set(w, h, 1);
        mat.compose(pos, q, sc);
        ref.current!.setMatrixAt(i, mat);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    }

    if (trunkRef.current) {
      treePos.forEach(([x, y, z, scale], i) => {
        const h = 2.2 * scale;
        pos.set(x, y + h / 2, z); sc.set(scale, h, scale);
        mat.compose(pos, qId, sc);
        trunkRef.current!.setMatrixAt(i, mat);
      });
      trunkRef.current.instanceMatrix.needsUpdate = true;
    }

    const acRefs = [
      { ref: acRef1, q: q0 },
      { ref: acRef2, q: q60 },
      { ref: acRef3, q: q120 },
    ];
    for (const { ref, q } of acRefs) {
      if (!ref.current) continue;
      acaciaPos.forEach(([x, y, z, scale], i) => {
        const h = 4.2 * scale; const w = 7.2 * scale;
        pos.set(x, y + h / 2, z); sc.set(w, h, 1);
        mat.compose(pos, q, sc);
        ref.current!.setMatrixAt(i, mat);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    }

    if (atrunkRef.current) {
      acaciaPos.forEach(([x, y, z, scale], i) => {
        const h = 1.9 * scale;
        pos.set(x, y + h / 2, z); sc.set(scale, h, scale);
        mat.compose(pos, qId, sc);
        atrunkRef.current!.setMatrixAt(i, mat);
      });
      atrunkRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [treePos, acaciaPos]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const windStr = weather.mode === "clear"
      ? 0.22
      : weather.mode === "fluctuating"
        ? 0.15 + Math.abs(Math.sin(t * 0.25)) * 0.35
        : 0.40;

    if (treeShaderRef.current) {
      treeShaderRef.current.uniforms.uTime.value = t;
      treeShaderRef.current.uniforms.uWind.value = windStr;
    }
    if (acShaderRef.current) {
      acShaderRef.current.uniforms.uTime.value = t;
      acShaderRef.current.uniforms.uWind.value = windStr * 1.15;
    }
  });

  return (
    <>
      <instancedMesh ref={treeRef1} args={[planeGeo, treeMat,   TREE_COUNT]}   castShadow />
      <instancedMesh ref={treeRef2} args={[planeGeo, treeMat,   TREE_COUNT]}   castShadow />
      <instancedMesh ref={treeRef3} args={[planeGeo, treeMat,   TREE_COUNT]}   castShadow />
      <instancedMesh ref={trunkRef} args={[trunkGeo,  barkMat,  TREE_COUNT]}   castShadow />

      <instancedMesh ref={acRef1}   args={[planeGeo, acaciaMat, ACACIA_COUNT]} castShadow />
      <instancedMesh ref={acRef2}   args={[planeGeo, acaciaMat, ACACIA_COUNT]} castShadow />
      <instancedMesh ref={acRef3}   args={[planeGeo, acaciaMat, ACACIA_COUNT]} castShadow />
      <instancedMesh ref={atrunkRef} args={[atrunkGeo, barkMat, ACACIA_COUNT]} castShadow />
    </>
  );
}
