import { useMemo } from "react";
import * as THREE from "three";

interface RockDef {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
  detail: number;
}

// Pre-defined formation clusters (near fence boundary + mountain transition)
const FORMATIONS: { center: [number, number]; rocks: RockDef[] }[] = [
  // NW corner cluster
  { center: [-42, -38], rocks: [
    { pos: [-42, 0.4, -38], rot: [0.2, 0.8, 0.1],   scale: 2.2,  detail: 2 },
    { pos: [-39, 0.1, -36], rot: [0.5, 1.8, -0.2],  scale: 1.1,  detail: 1 },
    { pos: [-44, 0.2, -35], rot: [0.1, 2.7, 0.4],   scale: 1.6,  detail: 2 },
    { pos: [-40, 0.05, -40], rot: [0.7, 0.3, 0.2],  scale: 0.7,  detail: 1 },
    { pos: [-46, 0.3, -41], rot: [0.3, 3.5, -0.1],  scale: 1.9,  detail: 2 },
  ]},
  // NE cluster
  { center: [38, -40], rocks: [
    { pos: [38, 0.35, -40], rot: [0.1, 1.2, 0.3],   scale: 2.0,  detail: 2 },
    { pos: [41, 0.1, -38],  rot: [0.6, 0.4, -0.2],  scale: 1.3,  detail: 1 },
    { pos: [36, 0.2, -43],  rot: [0.2, 2.1, 0.5],   scale: 1.7,  detail: 2 },
    { pos: [43, 0.05, -41], rot: [0.4, 3.8, 0.1],   scale: 0.9,  detail: 1 },
  ]},
  // SW cluster  
  { center: [-45, 35], rocks: [
    { pos: [-45, 0.5, 35],  rot: [0.3, 0.6, 0.2],   scale: 2.5,  detail: 2 },
    { pos: [-42, 0.1, 38],  rot: [0.7, 2.2, -0.3],  scale: 1.4,  detail: 1 },
    { pos: [-48, 0.3, 32],  rot: [0.1, 1.5, 0.4],   scale: 1.8,  detail: 2 },
    { pos: [-43, 0.05, 33], rot: [0.5, 4.0, -0.1],  scale: 0.65, detail: 1 },
    { pos: [-50, 0.2, 37],  rot: [0.2, 2.8, 0.3],   scale: 1.1,  detail: 1 },
  ]},
  // SE cluster
  { center: [42, 38], rocks: [
    { pos: [42, 0.4, 38],   rot: [0.4, 1.0, 0.2],   scale: 2.1,  detail: 2 },
    { pos: [45, 0.15, 35],  rot: [0.2, 3.2, -0.1],  scale: 1.5,  detail: 2 },
    { pos: [39, 0.1, 41],   rot: [0.6, 0.7, 0.3],   scale: 1.2,  detail: 1 },
    { pos: [47, 0.3, 40],   rot: [0.1, 2.4, 0.5],   scale: 0.8,  detail: 1 },
  ]},
  // East ridge
  { center: [60, -5], rocks: [
    { pos: [60, 0.6, -5],   rot: [0.2, 1.8, 0.1],   scale: 3.0,  detail: 2 },
    { pos: [63, 0.2, -8],   rot: [0.5, 0.5, 0.3],   scale: 1.8,  detail: 2 },
    { pos: [57, 0.3, -2],   rot: [0.3, 2.9, 0.2],   scale: 2.2,  detail: 2 },
    { pos: [65, 0.05, -4],  rot: [0.7, 1.1, -0.2],  scale: 1.0,  detail: 1 },
    { pos: [61, 0.4, 3],    rot: [0.1, 3.7, 0.4],   scale: 2.4,  detail: 2 },
    { pos: [58, 0.1, 7],    rot: [0.4, 0.8, 0.1],   scale: 1.3,  detail: 1 },
  ]},
  // West ridge
  { center: [-58, 0], rocks: [
    { pos: [-58, 0.5, 0],   rot: [0.3, 0.9, 0.2],   scale: 2.8,  detail: 2 },
    { pos: [-61, 0.2, 4],   rot: [0.6, 2.1, -0.1],  scale: 1.9,  detail: 2 },
    { pos: [-55, 0.3, -3],  rot: [0.1, 3.4, 0.3],   scale: 2.1,  detail: 2 },
    { pos: [-63, 0.1, -1],  rot: [0.4, 0.6, 0.2],   scale: 1.1,  detail: 1 },
    { pos: [-59, 0.4, -6],  rot: [0.2, 1.7, 0.4],   scale: 1.6,  detail: 1 },
  ]},
  // Scattered field-boundary pebble patch
  { center: [-30, 15], rocks: [
    { pos: [-30, 0.05, 15], rot: [0.1, 0.5, 0.2],   scale: 0.5,  detail: 1 },
    { pos: [-28, 0.03, 18], rot: [0.3, 2.3, -0.1],  scale: 0.35, detail: 0 },
    { pos: [-32, 0.04, 12], rot: [0.2, 1.1, 0.3],   scale: 0.42, detail: 0 },
    { pos: [-26, 0.06, 16], rot: [0.5, 3.2, 0.1],   scale: 0.55, detail: 0 },
  ]},
];

/** Photorealistic baked rock texture */
function makeRockTex(seed: number) {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 256;
  const ctx = cv.getContext("2d")!;

  const baseL = 28 + (seed % 12);
  ctx.fillStyle = `hsl(22,14%,${baseL}%)`;
  ctx.fillRect(0, 0, 256, 256);

  // Grain blobs
  for (let i = 0; i < 800; i++) {
    const x = (Math.sin(i * (7.3 + seed) + 1) * 0.5 + 0.5) * 256;
    const y = (Math.cos(i * (5.1 + seed * 0.5) + 2) * 0.5 + 0.5) * 256;
    const r = 2 + Math.abs(Math.sin(i * 4.7 + seed)) * 8;
    const l = baseL - 8 + Math.sin(i * 3.3 + seed * 0.7) * 14;
    ctx.globalAlpha = 0.5 + Math.abs(Math.sin(i * 2.1)) * 0.45;
    ctx.fillStyle = `hsl(${20 + Math.sin(i * 1.3 + seed) * 8},${12 + Math.abs(Math.sin(i * 3)) * 10}%,${l}%)`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.65, i * 1.1 + seed, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Cracks
  for (let i = 0; i < 12; i++) {
    const sx = (Math.sin(i * (13.7 + seed) + 3) * 0.5 + 0.5) * 256;
    const sy = (Math.cos(i * (9.3 + seed) + 1) * 0.5 + 0.5) * 256;
    const len = 20 + Math.abs(Math.sin(i * 4.1 + seed)) * 60;
    const angle = (i * 1.1 + seed) % (Math.PI * 2);
    ctx.strokeStyle = `rgba(10,7,5,${0.2 + Math.abs(Math.sin(i * 2.9)) * 0.25})`;
    ctx.lineWidth = 1 + Math.abs(Math.sin(i * 3.7)) * 1.5;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(
      sx + Math.cos(angle + 0.4) * len * 0.5, sy + Math.sin(angle + 0.4) * len * 0.5,
      sx + Math.cos(angle) * len, sy + Math.sin(angle) * len,
    );
    ctx.stroke();
  }

  // Lichen patches
  for (let i = 0; i < 8; i++) {
    const x = (Math.sin(i * 6.3 + seed * 0.8) * 0.5 + 0.5) * 256;
    const y = (Math.cos(i * 4.7 + seed) * 0.5 + 0.5) * 256;
    const r = 8 + Math.abs(Math.sin(i * 5.1)) * 18;
    ctx.fillStyle = `rgba(${50 + Math.abs(Math.sin(i) | 0) * 20},${80 + (i * 7) % 30},${30},0.25)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  return cv;
}

/** Distorted rock geometry */
function makeRockGeo(detail: number, seed: number) {
  const geo = new THREE.IcosahedronGeometry(1, detail + 1);
  const pos = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length; i += 3) {
    const xi = pos[i], yi = pos[i+1], zi = pos[i+2];
    const n = 0.12 + 0.22 * Math.abs(Math.sin(xi * (3.1 + seed) + yi * 5.7 + zi * (2.3 + seed * 0.5)));
    pos[i]   *= 1 + n;
    pos[i+1] *= 0.65 + Math.abs(Math.sin(xi * 2.7 + zi * 3.1 + seed)) * 0.28;
    pos[i+2] *= 1 + n * 0.8;
  }
  geo.computeVertexNormals();
  return geo;
}

export default function RockFormations() {
  const rockData = useMemo(() => {
    const result: { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial; pos: [number,number,number]; rot: [number,number,number]; scale: number }[] = [];
    let seed = 0;
    for (const formation of FORMATIONS) {
      for (const r of formation.rocks) {
        const s = seed++;
        const geo = makeRockGeo(r.detail, s * 0.37);
        const tex = new THREE.CanvasTexture(makeRockTex(s));
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          color: new THREE.Color(`hsl(${22 + (s % 8)},${12 + (s % 10)}%,${28 + (s % 14)}%)`),
          roughness: 0.9,
          metalness: 0.04,
          envMapIntensity: 0.15,
        });
        result.push({ geo, mat, pos: r.pos, rot: r.rot, scale: r.scale });
      }
    }
    return result;
  }, []);

  // Ground scatter: small pebbles via InstancedMesh
  const pebbleData = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: "#6A5A4A", roughness: 0.92, metalness: 0.04 });
    const matrices: THREE.Matrix4[] = [];
    for (let i = 0; i < 400; i++) {
      const angle = Math.sin(i * 13.7) * Math.PI * 2;
      const dist = 32 + Math.abs(Math.sin(i * 7.3)) * 60;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (Math.abs(x) < 35 && Math.abs(z) < 35) continue; // avoid farm
      const sc = 0.06 + Math.abs(Math.sin(i * 4.1)) * 0.18;
      const m = new THREE.Matrix4();
      m.compose(
        new THREE.Vector3(x, sc * 0.4, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i * 0.7, 0)),
        new THREE.Vector3(sc, sc * 0.55, sc * 0.9)
      );
      matrices.push(m);
    }
    return { geo, mat, matrices };
  }, []);

  return (
    <group>
      {rockData.map((r, i) => (
        <mesh key={i} position={r.pos} rotation={r.rot} scale={r.scale} castShadow receiveShadow>
          <primitive object={r.geo} attach="geometry" />
          <primitive object={r.mat} attach="material" />
        </mesh>
      ))}

      {/* Pebble scatter InstancedMesh */}
      {pebbleData.matrices.length > 0 && (
        <instancedMesh
          args={[pebbleData.geo, pebbleData.mat, pebbleData.matrices.length]}
          receiveShadow
          ref={(mesh) => {
            if (!mesh) return;
            pebbleData.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
            mesh.instanceMatrix.needsUpdate = true;
          }}
        />
      )}
    </group>
  );
}
