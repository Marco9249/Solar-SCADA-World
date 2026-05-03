import { useMemo } from "react";
import * as THREE from "three";
import { heightAt } from "../utils/terrain";
import { useWeather } from "../context/WeatherContext";

const SEGS = 128;
const SIZE = 340;

/** High-fidelity sandy desert ground texture */
function makeSandTex(size = 512) {
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0,   "#C8AA72");
  bg.addColorStop(0.35,"#BFA060");
  bg.addColorStop(0.7, "#C8A870");
  bg.addColorStop(1,   "#B89858");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);

  // Micro-grain specks
  for (let i = 0; i < 8000; i++) {
    const x = (Math.sin(i * 7.3 + 1) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 5.1 + 2) * 0.5 + 0.5) * size;
    const r = 0.6 + (Math.sin(i * 2.7) * 0.5 + 0.5) * 2.2;
    const l = 40 + Math.sin(i * 3.9 + 0.5) * 16;
    const s = 30 + Math.sin(i * 2.3 + 1.1) * 14;
    ctx.globalAlpha = 0.55 + Math.sin(i * 4.1) * 0.38;
    ctx.fillStyle = `hsl(34,${s}%,${l}%)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Aeolian ripple lines
  for (let y2 = 0; y2 < size; y2 += 6 + Math.sin(y2 * 0.15) * 2.5) {
    ctx.strokeStyle = `rgba(130,90,35,0.09)`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(size, y2 + Math.sin(y2 * 0.22) * 10); ctx.stroke();
  }

  // Larger pebbles
  for (let i = 0; i < 250; i++) {
    const x = (Math.sin(i * 11.3 + 3) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 8.7 + 1) * 0.5 + 0.5) * size;
    const r = 1.2 + Math.abs(Math.sin(i * 5.9)) * 5;
    const l = 26 + Math.sin(i * 3.3) * 14;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = `hsl(25,22%,${l}%)`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.65, i * 0.8, 0, Math.PI * 2); ctx.fill();
    // Highlight
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = `rgba(255,242,200,0.5)`;
    ctx.beginPath(); ctx.ellipse(x - r * 0.22, y - r * 0.28, r * 0.3, r * 0.22, i * 0.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  return cv;
}

/** High-detail rock/mountain texture */
function makeRockTex(size = 512) {
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#5E5448"; ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4000; i++) {
    const x = (Math.sin(i * 11.3 + 1) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 7.7 + 2) * 0.5 + 0.5) * size;
    const r = 1.5 + (Math.cos(i * 4.1) * 0.5 + 0.5) * 6;
    const l = 24 + Math.sin(i * 5.3 + 0.7) * 16;
    const h = 22 + Math.sin(i * 2.1) * 9;
    ctx.globalAlpha = 0.45 + Math.abs(Math.sin(i * 3.7)) * 0.48;
    ctx.fillStyle = `hsl(${h},16%,${l}%)`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, i * 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 32; i++) {
    const sx = (Math.sin(i * 13.7) * 0.5 + 0.5) * size;
    const sy = (Math.cos(i * 9.3) * 0.5 + 0.5) * size;
    const len = 35 + Math.abs(Math.sin(i * 4.1)) * 90;
    const angle = Math.sin(i * 2.7) * Math.PI;
    ctx.strokeStyle = `rgba(18,12,8,${0.22 + Math.abs(Math.sin(i * 3.1)) * 0.22})`;
    ctx.lineWidth = 0.8 + Math.abs(Math.sin(i * 5.3));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(
      sx + Math.cos(angle + 0.5) * len * 0.6, sy + Math.sin(angle + 0.5) * len * 0.4,
      sx + Math.cos(angle) * len, sy + Math.sin(angle) * len
    );
    ctx.stroke();
  }
  return cv;
}

/** Irrigated dark soil texture for farm compound */
function makeFarmTex(size = 512) {
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;

  ctx.fillStyle = "#5A4A32"; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    const x = (Math.sin(i * 9.1) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 7.3) * 0.5 + 0.5) * size;
    const r = 1 + Math.abs(Math.sin(i * 3.7)) * 3.5;
    const l = 18 + Math.sin(i * 4.2) * 10;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = `hsl(25,55%,${l}%)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Gravel/small aggregate scatter
  for (let i = 0; i < 80; i++) {
    const x = (Math.sin(i * 13.1) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 10.3) * 0.5 + 0.5) * size;
    const r = 2 + Math.abs(Math.sin(i * 6.7)) * 5;
    ctx.fillStyle = `hsl(30,20%,${32 + Math.sin(i * 4) * 10}%)`;
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, i * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  return cv;
}

export default function Terrain() {
  const { isRaining } = useWeather();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];

    for (let zi = 0; zi <= SEGS; zi++) {
      for (let xi = 0; xi <= SEGS; xi++) {
        const x = (xi / SEGS - 0.5) * SIZE;
        const z = (zi / SEGS - 0.5) * SIZE;
        const y = heightAt(x, z);

        positions.push(x, y, z);
        uvs.push((xi / SEGS) * 24, (zi / SEGS) * 24);

        const dist    = Math.sqrt(x * x + z * z);
        const heightF = Math.min(1, Math.max(0, (y - 2) / 30));
        const farmF   = Math.max(0, 1 - dist / 52);
        const r = (0.80 * (1 - heightF) * (1 - farmF * 0.25) + 0.50 * heightF) * (1 - farmF * 0.3);
        const gg= (0.67 * (1 - heightF) * (1 - farmF * 0.18) + 0.46 * heightF) * (1 - farmF * 0.25);
        const b = (0.42 * (1 - heightF) + 0.44 * heightF) * (1 - farmF * 0.2);
        colors.push(r, gg, b);
      }
    }

    const indices: number[] = [];
    for (let zi = 0; zi < SEGS; zi++) {
      for (let xi = 0; xi < SEGS; xi++) {
        const a = zi * (SEGS + 1) + xi;
        const b = a + 1;
        const c = (zi + 1) * (SEGS + 1) + xi;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute("color",    new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);

  const sandTex = useMemo(() => {
    const t = new THREE.CanvasTexture(makeSandTex(512));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(24, 24);
    t.anisotropy = 8;
    return t;
  }, []);

  const farmTex = useMemo(() => {
    const t = new THREE.CanvasTexture(makeFarmTex(512));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 5);
    t.anisotropy = 4;
    return t;
  }, []);

  // Wet-weather surface roughness — lower when raining
  const terrainRoughness = isRaining ? 0.55 : 0.94;
  const terrainMetalness = isRaining ? 0.18 : 0.02;

  return (
    <>
      {/* Main terrain mesh */}
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          map={sandTex}
          vertexColors
          roughness={terrainRoughness}
          metalness={terrainMetalness}
          envMapIntensity={isRaining ? 0.6 : 0.15}
        />
      </mesh>

      {/* ── Farm compound surface (fixed: larger, raised to y=0.04 to prevent z-fighting) ── */}
      {/* Outer gravel border */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.025, -1]}>
        <planeGeometry args={[52, 40, 1, 1]} />
        <meshStandardMaterial color="#7A6E5A" roughness={0.93} metalness={0.04} />
      </mesh>

      {/* Inner paved compound with proper soil texture */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.04, -1]}>
        <planeGeometry args={[48, 36, 1, 1]} />
        <meshStandardMaterial
          map={farmTex}
          color={isRaining ? "#483C26" : "#6A5C42"}
          roughness={isRaining ? 0.52 : 0.88}
          metalness={isRaining ? 0.22 : 0.05}
        />
      </mesh>

      {/* Water-tank area fill — ensures no gap/clip near WaterTank [18,0,2] */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[18, 0.045, 2]}>
        <planeGeometry args={[12, 12, 1, 1]} />
        <meshStandardMaterial
          map={farmTex}
          color="#5A4E36"
          roughness={0.90}
          metalness={0.05}
        />
      </mesh>

      {/* Pump area fill */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.045, 4]}>
        <planeGeometry args={[10, 10, 1, 1]} />
        <meshStandardMaterial color="#52472F" roughness={0.92} metalness={0.04} />
      </mesh>
    </>
  );
}
