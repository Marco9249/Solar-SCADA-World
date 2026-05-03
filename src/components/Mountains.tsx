import { useMemo } from "react";
import * as THREE from "three";

// ── Geological strata rock texture — 512px, layered sediment ─────────────────
function makeStrataRockTex(size = 512): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;

  // Base sedimentary color
  const base = ctx.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0,   "#8C7B6A"); base.addColorStop(0.18, "#7A6A58");
  base.addColorStop(0.35,"#6E5E4C"); base.addColorStop(0.52, "#827060");
  base.addColorStop(0.68,"#745E4E"); base.addColorStop(0.82, "#9A887A");
  base.addColorStop(1,   "#6A5848");
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);

  // Micro grain
  for (let i = 0; i < 8000; i++) {
    const x = (Math.sin(i * 11.3 + 1) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 7.7  + 2) * 0.5 + 0.5) * size;
    const r = 0.8 + Math.abs(Math.cos(i * 4.1)) * 3.5;
    const l = 28 + Math.sin(i * 5.3) * 14;
    ctx.globalAlpha = 0.45 + Math.abs(Math.sin(i * 3.7)) * 0.38;
    ctx.fillStyle = `hsl(${24 + Math.sin(i * 3.1) * 8},${18 + Math.sin(i * 2.3) * 8}%,${l}%)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Geological strata — horizontal banding (sedimentary layers)
  const strataColors = [
    "rgba(180,155,120,0.22)", "rgba(100, 80, 58,0.28)", "rgba(155,130,100,0.18)",
    "rgba( 75, 60, 42,0.30)", "rgba(200,175,140,0.16)", "rgba( 90, 72, 50,0.26)",
    "rgba(140,115, 85,0.20)", "rgba( 60, 48, 32,0.32)", "rgba(170,148,115,0.15)",
    "rgba(110, 88, 62,0.24)", "rgba( 50, 40, 26,0.28)", "rgba(130,108, 80,0.18)",
  ];
  for (let s = 0; s < strataColors.length; s++) {
    const y0 = (s / strataColors.length) * size;
    const h  = size / strataColors.length * (0.5 + Math.abs(Math.sin(s * 2.7)) * 0.7);
    // Wavy strata line
    ctx.fillStyle = strataColors[s];
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x = 0; x <= size; x += 8) {
      const wy = y0 + Math.sin(x * 0.022 + s * 1.1) * 6 + Math.cos(x * 0.011 + s * 0.7) * 4;
      ctx.lineTo(x, wy);
    }
    ctx.lineTo(size, y0 + h);
    ctx.lineTo(0, y0 + h);
    ctx.closePath(); ctx.fill();
  }

  // Vertical tectonic crack lines
  for (let i = 0; i < 32; i++) {
    const sx = (Math.sin(i * 13.7) * 0.5 + 0.5) * size;
    ctx.strokeStyle = `rgba(${20 + Math.abs(Math.sin(i * 3)) * 15},${14},${8},${0.22 + Math.abs(Math.sin(i * 2.1)) * 0.18})`;
    ctx.lineWidth = 0.8 + Math.abs(Math.sin(i * 3)) * 1.4;
    ctx.beginPath();
    let y = 0;
    ctx.moveTo(sx, y);
    while (y < size) {
      y += 12 + Math.abs(Math.sin(i * y * 0.001)) * 16;
      ctx.lineTo(sx + Math.sin(y * 0.08 + i) * 5, Math.min(y, size));
    }
    ctx.stroke();
  }

  // Diagonal shear fractures
  for (let i = 0; i < 14; i++) {
    const sx = (Math.sin(i * 9.1) * 0.5 + 0.5) * size;
    const sy = (Math.cos(i * 7.3) * 0.5 + 0.5) * size;
    ctx.strokeStyle = `rgba(15,10,5,${0.15 + Math.abs(Math.sin(i * 4)) * 0.12})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(i * 0.8) * 80, sy + Math.sin(i * 0.8) * 80);
    ctx.stroke();
  }

  // Surface weathering — lighter patches at top, darker eroded zones
  for (let i = 0; i < 40; i++) {
    const wx = (Math.sin(i * 8.3 + 2) * 0.5 + 0.5) * size;
    const wy = (Math.abs(Math.sin(i * 6.1)) * 0.35) * size;
    const wr = 10 + Math.abs(Math.sin(i * 4.7)) * 25;
    const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
    wg.addColorStop(0, "rgba(230,210,185,0.18)");
    wg.addColorStop(1, "rgba(200,180,155,0)");
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.ellipse(wx, wy, wr, wr * 0.65, i * 0.4, 0, Math.PI * 2); ctx.fill();
  }

  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 4);
  t.anisotropy = 16;
  return t;
}

function makeSnowTex(size = 128): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, "#F2F5F8"); g.addColorStop(0.5, "#E4EBF2"); g.addColorStop(1, "#D0DCE8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 800; i++) {
    const x = (Math.sin(i * 7.3) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 5.1) * 0.5 + 0.5) * size;
    ctx.globalAlpha = 0.12 + Math.abs(Math.sin(i * 3)) * 0.12;
    ctx.fillStyle = `hsl(220,30%,${88 + Math.sin(i * 4) * 6}%)`;
    ctx.beginPath(); ctx.arc(x, y, 1 + Math.abs(Math.sin(i * 4)) * 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  return t;
}

export default function Mountains() {
  const rockTex  = useMemo(() => makeStrataRockTex(512), []);
  const snowTex  = useMemo(() => makeSnowTex(128), []);

  // ── Mountain spires — 48 peaks with geological variation ──────────────────
  const spires = useMemo(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const angle  = (i / 48) * Math.PI * 2 + i * 0.13;
      const radius = 108 + Math.sin(i * 7.3) * 28 + Math.cos(i * 3.1) * 14;
      const h      = 30 + Math.abs(Math.sin(i * 3.7)) * 46 + Math.abs(Math.cos(i * 5.1)) * 20;
      const r      = 7  + Math.abs(Math.cos(i * 5.1)) * 14 + Math.abs(Math.sin(i * 2.3)) * 6;
      return {
        x:    Math.cos(angle) * radius,
        z:    Math.sin(angle) * radius,
        h, r,
        rot:  i * 0.85 + Math.sin(i * 2.1) * 0.4,
        // Color family: reddish / gray / sandy
        colorA: i % 3 === 0 ? "#7A6855" : i % 3 === 1 ? "#6E6260" : "#8A7462",
        colorB: i % 3 === 0 ? "#6A5845" : i % 3 === 1 ? "#5E5248" : "#7A6450",
        segs:   5 + (i % 3),
        hasSnow: h > 52,
        hasSub:  Math.sin(i * 4.1) > 0.2,
        subR:   r * (0.45 + Math.abs(Math.sin(i * 2.7)) * 0.22),
        subH:   h * (0.55 + Math.abs(Math.sin(i * 3.3)) * 0.28),
        subOX:  r * (0.5 + Math.abs(Math.cos(i * 3.9)) * 0.4),
        subOZ:  r * 0.3,
      };
    });
  }, []);

  // ── Mid-range rolling hills ────────────────────────────────────────────────
  const hills = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const angle  = (i / 28) * Math.PI * 2 + 0.3;
      const radius = 84 + Math.sin(i * 4.7) * 14 + Math.cos(i * 2.3) * 8;
      return {
        x:  Math.cos(angle) * radius,
        z:  Math.sin(angle) * radius,
        sx: 16 + Math.abs(Math.sin(i * 2.3)) * 22,
        sy:  5 + Math.abs(Math.cos(i * 3.1)) * 11,
        sz: 14 + Math.abs(Math.sin(i * 5.9)) * 20,
        color: i % 2 === 0 ? "#7E6E58" : "#8A7A62",
      };
    });
  }, []);

  // ── Rock outcroppings — angular boulders ───────────────────────────────────
  const boulders = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const angle  = i * 2.399 + 0.5;
      const radius = 55 + Math.sin(i * 9.1 + 1) * 32;
      return {
        x:   Math.cos(angle) * radius,
        z:   Math.sin(angle) * radius,
        s:   1.1 + Math.abs(Math.sin(i * 6.3)) * 3.2,
        rot: i * 1.15,
        tilt: Math.sin(i * 4.7) * 0.35,
        color: i % 3 === 0 ? "#7A6E62" : i % 3 === 1 ? "#6E6458" : "#847668",
      };
    });
  }, []);

  // ── Far horizon fill — atmospheric haze gradient ───────────────────────────
  const horizonRidges = useMemo(() => {
    return Array.from({ length: 32 }, (_, i) => {
      const angle = (i / 32) * Math.PI * 2;
      const r = 148 + Math.sin(i * 3.7) * 22 + Math.cos(i * 5.1) * 14;
      const sy = 24 + Math.abs(Math.sin(i * 2.9)) * 22;
      return {
        x: Math.cos(angle) * r, z: Math.sin(angle) * r, sy,
        sx: 38 + Math.abs(Math.sin(i * 3.3)) * 22,
        sz: 28 + Math.abs(Math.cos(i * 4.7)) * 18,
        // Atmospheric blue-shift for distance
        color: `hsl(${210 + Math.sin(i * 2.3) * 15},${12 + Math.abs(Math.sin(i * 3)) * 8}%,${30 + Math.abs(Math.sin(i * 1.7)) * 12}%)`,
      };
    });
  }, []);

  const rockMatProps = { map: rockTex, roughness: 0.90, metalness: 0.04 };

  return (
    <>
      {/* ── Major mountain spires ──────────────────────────────────────────── */}
      {spires.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}>
          {/* Main peak — higher poly cone for smoother silhouette */}
          <mesh castShadow receiveShadow>
            <coneGeometry args={[s.r, s.h, s.segs + 3, 6]} />
            <meshStandardMaterial {...rockMatProps} color={s.colorA} />
          </mesh>

          {/* Geological ledge band — horizontal stratum ring */}
          {s.h > 35 && (
            <mesh position={[0, s.h * 0.28, 0]} castShadow>
              <cylinderGeometry args={[s.r * 0.82, s.r * 1.05, s.h * 0.06, s.segs + 2]} />
              <meshStandardMaterial color={s.colorB} roughness={0.95} metalness={0.02}
                map={rockTex} />
            </mesh>
          )}
          {s.h > 50 && (
            <mesh position={[0, s.h * 0.52, 0]} castShadow>
              <cylinderGeometry args={[s.r * 0.55, s.r * 0.75, s.h * 0.05, s.segs + 1]} />
              <meshStandardMaterial color={s.colorA} roughness={0.95} metalness={0.02}
                map={rockTex} />
            </mesh>
          )}

          {/* Secondary shoulder peak */}
          {s.hasSub && (
            <mesh castShadow position={[s.subOX, 0, s.subOZ]}>
              <coneGeometry args={[s.subR, s.subH, s.segs + 1, 4]} />
              <meshStandardMaterial color={s.colorB} roughness={0.92} metalness={0.03}
                map={rockTex} />
            </mesh>
          )}

          {/* Tertiary small spire */}
          {s.h > 40 && (
            <mesh castShadow position={[-s.r * 0.4, 0, s.r * 0.35]}>
              <coneGeometry args={[s.r * 0.30, s.h * 0.45, s.segs, 3]} />
              <meshStandardMaterial color={s.colorB} roughness={0.94} metalness={0.02} />
            </mesh>
          )}

          {/* Snow cap — only on tall peaks, gradient from white to rock */}
          {s.hasSnow && (
            <>
              <mesh position={[0, s.h * 0.44, 0]}>
                <coneGeometry args={[s.r * 0.32, s.h * 0.16, s.segs + 1, 3]} />
                <meshStandardMaterial map={snowTex} color="#E8EFF6" roughness={0.55}
                  metalness={0.08} />
              </mesh>
              {/* Snow drape on shoulder */}
              <mesh position={[s.r * 0.18, s.h * 0.38, s.r * 0.1]}>
                <coneGeometry args={[s.r * 0.16, s.h * 0.06, s.segs, 2]} />
                <meshStandardMaterial color="#DDE8F0" roughness={0.6} metalness={0.06} />
              </mesh>
            </>
          )}

          {/* Rock scree at base */}
          <mesh position={[0, -s.h * 0.02, 0]} receiveShadow>
            <coneGeometry args={[s.r * 1.55, s.h * 0.08, s.segs + 2, 2]} />
            <meshStandardMaterial color="#6A5C4A" roughness={0.98} metalness={0.01} />
          </mesh>
        </group>
      ))}

      {/* ── Mid-range hills ────────────────────────────────────────────────── */}
      {hills.map((h, i) => (
        <group key={i} position={[h.x, -h.sy * 0.18, h.z]}>
          <mesh scale={[h.sx, h.sy, h.sz]} castShadow receiveShadow>
            <sphereGeometry args={[1, 9, 7]} />
            <meshStandardMaterial color={h.color} roughness={0.96} metalness={0.01} />
          </mesh>
          {/* Rock accent on hill shoulder */}
          <mesh position={[h.sx * 0.22, h.sy * 0.38, 0]} scale={[h.sx * 0.28, h.sy * 0.55, h.sz * 0.28]}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshStandardMaterial color="#6A5C4E" roughness={0.95} metalness={0.02}
              map={rockTex} />
          </mesh>
        </group>
      ))}

      {/* ── Angular rock boulders ──────────────────────────────────────────── */}
      {boulders.map((b, i) => (
        <group key={i} position={[b.x, b.s * 0.28, b.z]} rotation={[b.tilt, b.rot, b.tilt * 0.5]}>
          <mesh scale={b.s} castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={b.color} roughness={0.88} metalness={0.05}
              map={rockTex} />
          </mesh>
          {/* Small chips beside */}
          {i % 4 === 0 && (
            <mesh scale={b.s * 0.38} position={[b.s * 0.65, -b.s * 0.28, b.s * 0.4]}
              rotation={[0.8, b.rot * 0.5, 0.3]} castShadow>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={b.color} roughness={0.92} metalness={0.03} />
            </mesh>
          )}
        </group>
      ))}

      {/* ── Far atmospheric horizon ridge ──────────────────────────────────── */}
      {horizonRidges.map((r, i) => (
        <mesh key={i} position={[r.x, r.sy * 0.3, r.z]}
          scale={[r.sx, r.sy, r.sz]} castShadow>
          <sphereGeometry args={[1, 6, 5]} />
          <meshStandardMaterial color={r.color} roughness={1} metalness={0}
            transparent opacity={0.88} />
        </mesh>
      ))}
    </>
  );
}
