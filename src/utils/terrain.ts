/**
 * Shared terrain height function — deterministic, no random calls.
 * Farm center is flat. Hills rise outside ~45 units. Mountains form beyond ~90 units.
 */
export function heightAt(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);

  const flatRadius      = 40;
  const transitionWidth = 22;
  const farmFactor      = Math.max(0, Math.min(1, (dist - flatRadius) / transitionWidth));

  const noise =
    Math.sin(x * 0.038 + 2.1) * Math.cos(z * 0.032 + 0.8) * 4.0 +
    Math.sin(x * 0.082 + z * 0.071 + 1.5) * 2.2 +
    Math.cos(x * 0.16  + 0.6) * Math.sin(z * 0.14 + 1.1) * 1.2 +
    Math.sin(x * 0.24  - z * 0.2 + 3.2) * 0.6 +
    Math.cos(x * 0.38  + z * 0.33) * 0.3;

  const mDist = Math.max(0, dist - 88);
  const angle = Math.atan2(z, x);
  const angularVariation =
    Math.sin(angle * 6 + 1.3) * 0.12 +
    Math.cos(angle * 11 + 0.7) * 0.06;
  const mountainH = mDist * mDist * 0.011 * (1 + angularVariation) +
    Math.sin(x * 0.055 + 4.1) * Math.cos(z * 0.048 + 2.3) * mDist * 0.06;

  return noise * farmFactor + mountainH;
}

export function sampleHeight(x: number, z: number): number {
  return heightAt(x, z);
}

/** High-fidelity sandy desert ground canvas texture */
export function makeDesertTexture(size = 512): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#C8A870"; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5000; i++) {
    const px = (Math.sin(i * 7.3) * 0.5 + 0.5) * size;
    const py = (Math.cos(i * 5.1) * 0.5 + 0.5) * size;
    const r  = 0.7 + (Math.sin(i * 2.7) * 0.5 + 0.5) * 3;
    const l  = 52 + Math.sin(i * 3.9) * 16;
    ctx.globalAlpha = 0.55 + Math.sin(i * 4.1) * 0.38;
    ctx.fillStyle = `hsl(34,40%,${l}%)`;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let y = 0; y < size; y += 7 + Math.floor(Math.sin(y * 0.4) * 3 + 3)) {
    ctx.strokeStyle = `rgba(155,115,55,0.10)`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y + Math.sin(y * 0.2) * 10); ctx.stroke();
  }
  return canvas;
}

/** Rocky mountain texture */
export function makeRockTexture(size = 512): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#6A6058"; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3500; i++) {
    const px = (Math.sin(i * 11.3 + 1) * 0.5 + 0.5) * size;
    const py = (Math.cos(i * 7.7  + 2) * 0.5 + 0.5) * size;
    const r  = 1.5 + (Math.cos(i * 4.1) * 0.5 + 0.5) * 7;
    const l  = 28 + Math.sin(i * 5.3) * 15;
    ctx.globalAlpha = 0.5 + Math.abs(Math.sin(i * 3.7)) * 0.42;
    ctx.fillStyle = `hsl(25,18%,${l}%)`;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 24; i++) {
    const sx = (Math.sin(i * 13.7) * 0.5 + 0.5) * size;
    const sy = (Math.cos(i * 9.3)  * 0.5 + 0.5) * size;
    ctx.strokeStyle = `rgba(35,25,15,0.28)`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.sin(i * 2.1) * 65, sy + Math.cos(i * 1.7) * 85);
    ctx.stroke();
  }
  return canvas;
}

/** High-fidelity tree billboard — dense layered canopy + detailed bark */
export function makeTreeTexture(size = 512): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  // ── Detailed bark trunk ──────────────────────────────────────────────────
  const trunkW = size * 0.11;
  const trunkH = size * 0.40;
  const trunkX = size / 2 - trunkW / 2;
  const trunkY = size - trunkH;

  // Bark base gradient
  const tg = ctx.createLinearGradient(trunkX, 0, trunkX + trunkW, 0);
  tg.addColorStop(0,    "#1F0E03");
  tg.addColorStop(0.2,  "#3A1A08");
  tg.addColorStop(0.5,  "#4E2810");
  tg.addColorStop(0.75, "#3A1A08");
  tg.addColorStop(1,    "#1F0E03");
  ctx.fillStyle = tg; ctx.fillRect(trunkX, trunkY, trunkW, trunkH);

  // Bark micro-texture particles
  for (let i = 0; i < 80; i++) {
    const bx = trunkX + (Math.sin(i * 7.3) * 0.5 + 0.5) * trunkW;
    const by = trunkY + (Math.sin(i * 5.1) * 0.5 + 0.5) * trunkH;
    const br = 1 + Math.abs(Math.sin(i * 4.2)) * 3;
    const bl = 10 + Math.sin(i * 3.7) * 7;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = `hsl(22,${28 + Math.abs(Math.sin(i * 2)) * 12}%,${bl}%)`;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Vertical bark ridges
  for (let i = 0; i < 14; i++) {
    const bx = trunkX + (i / 13) * trunkW;
    const wave = Math.sin(i * 0.8 + 1) * 3;
    ctx.strokeStyle = `rgba(10,4,1,${0.28 + Math.abs(Math.sin(i * 2.1)) * 0.18})`;
    ctx.lineWidth = 0.8 + Math.abs(Math.sin(i)) * 0.6;
    ctx.beginPath();
    ctx.moveTo(bx + wave, trunkY);
    ctx.bezierCurveTo(bx + wave * 0.5, trunkY + trunkH * 0.33,
                      bx - wave * 0.3, trunkY + trunkH * 0.66,
                      bx + wave * 0.2, trunkY + trunkH);
    ctx.stroke();
  }

  // Horizontal bark plates
  for (let i = 0; i < 12; i++) {
    const by = trunkY + (i / 11) * trunkH;
    ctx.strokeStyle = `rgba(10,4,1,${0.14 + Math.abs(Math.sin(i * 3.1)) * 0.12})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(trunkX, by + Math.sin(i * 2.1) * 3);
    ctx.lineTo(trunkX + trunkW, by + Math.cos(i * 1.7) * 3);
    ctx.stroke();
  }

  // ── Layered foliage — 7 layers for dense canopy depth ────────────────────
  const layers = [
    { cy: size * 0.76, rx: size * 0.47, ry: size * 0.22, dark: "#0E1E0E", mid: "#182E1A", bright: "#1E4020" },
    { cy: size * 0.62, rx: size * 0.42, ry: size * 0.24, dark: "#162C16", mid: "#225228", bright: "#2A6830" },
    { cy: size * 0.48, rx: size * 0.37, ry: size * 0.22, dark: "#1C3A1C", mid: "#2E6634", bright: "#387A3E" },
    { cy: size * 0.36, rx: size * 0.30, ry: size * 0.21, dark: "#224422", mid: "#387040", bright: "#428848" },
    { cy: size * 0.25, rx: size * 0.23, ry: size * 0.18, dark: "#284E28", mid: "#3E7848", bright: "#4A9255" },
    { cy: size * 0.16, rx: size * 0.16, ry: size * 0.14, dark: "#2C5430", mid: "#44824E", bright: "#52A060" },
    { cy: size * 0.09, rx: size * 0.10, ry: size * 0.09, dark: "#305836", mid: "#488C56", bright: "#58AA66" },
  ];

  for (const l of layers) {
    // Main canopy ellipse with radial gradient
    const g = ctx.createRadialGradient(size / 2, l.cy, 0, size / 2, l.cy, Math.max(l.rx, l.ry));
    g.addColorStop(0,    l.bright + "F5");
    g.addColorStop(0.40, l.mid    + "D8");
    g.addColorStop(0.70, l.dark   + "A0");
    g.addColorStop(0.90, l.dark   + "50");
    g.addColorStop(1,    l.dark   + "00");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(size / 2, l.cy, l.rx, l.ry, 0, 0, Math.PI * 2); ctx.fill();

    // Dense leaf dab cluster (30 dabs per layer)
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + l.cy * 0.01;
      const rad   = (0.3 + (Math.sin(i * 2.7) * 0.5 + 0.5) * 0.6) * l.rx;
      const lx    = size / 2 + Math.cos(angle) * rad;
      const ly    = l.cy + Math.sin(angle) * l.ry * 0.75;
      const ls    = 3 + Math.abs(Math.sin(i * 3.1)) * 5;
      const alpha = 0.12 + Math.abs(Math.sin(i * 2.3)) * 0.14;
      const r2    = 80  + Math.sin(i * 4) * 30;
      const g2    = 140 + Math.cos(i * 3) * 35;
      const b2    = 40  + Math.sin(i * 5) * 15;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${r2},${g2},${b2})`;
      ctx.beginPath(); ctx.ellipse(lx, ly, ls, ls * 0.65, i * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Specular leaf glint (backlit)
    for (let i = 0; i < 8; i++) {
      const gx = size / 2 + (Math.sin(i * 4.7 + l.cy) * 0.5) * l.rx;
      const gy = l.cy + (Math.cos(i * 3.3 + l.cy * 0.01) * 0.5) * l.ry;
      ctx.globalAlpha = 0.06 + Math.abs(Math.sin(i * 2)) * 0.06;
      ctx.fillStyle = "#CCFF88";
      ctx.beginPath(); ctx.ellipse(gx, gy, 4, 2.5, i * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ── Sun highlight (top-left rim light) ────────────────────────────────────
  const hg = ctx.createRadialGradient(size * 0.38, size * 0.12, 0, size * 0.38, size * 0.12, size * 0.28);
  hg.addColorStop(0, "rgba(200,255,130,0.35)");
  hg.addColorStop(0.5,"rgba(160,230,100,0.18)");
  hg.addColorStop(1, "rgba(160,230,100,0)");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(size * 0.38, size * 0.12, size * 0.28, size * 0.20, -0.3, 0, Math.PI * 2); ctx.fill();

  // ── Ambient shadow underside ───────────────────────────────────────────────
  const sg = ctx.createRadialGradient(size / 2, size * 0.68, 0, size / 2, size * 0.68, size * 0.4);
  sg.addColorStop(0, "rgba(0,0,0,0.32)");
  sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(size / 2, size * 0.68, size * 0.4, size * 0.14, 0, 0, Math.PI * 2); ctx.fill();

  return canvas;
}

/** High-fidelity bark texture for tree cylinder trunks */
export function makeTreeBarkTex(size = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Base
  ctx.fillStyle = "#2A1208"; ctx.fillRect(0, 0, size, size);

  // Bark grain
  for (let i = 0; i < 3000; i++) {
    const x = (Math.sin(i * 7.3) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 5.1) * 0.5 + 0.5) * size;
    const r = 0.8 + Math.abs(Math.sin(i * 3.7)) * 2.5;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = `hsl(22,${30 + Math.abs(Math.sin(i * 2)) * 10}%,${10 + Math.sin(i * 4.2) * 6}%)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Vertical fissures
  for (let i = 0; i < 18; i++) {
    const sx = (i / 17) * size + Math.sin(i * 2.3) * 4;
    ctx.strokeStyle = `rgba(8,3,0,${0.3 + Math.abs(Math.sin(i * 2.1)) * 0.25})`;
    ctx.lineWidth = 1 + Math.abs(Math.sin(i * 3)) * 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    for (let y = 0; y < size; y += 20) {
      ctx.lineTo(sx + Math.sin(y * 0.1 + i) * 4, y);
    }
    ctx.stroke();
  }

  // Horizontal rings
  for (let i = 0; i < 10; i++) {
    const sy = (i / 9) * size;
    ctx.strokeStyle = `rgba(10,4,1,0.20)`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(size, sy + Math.sin(i * 3) * 6); ctx.stroke();
  }

  return canvas;
}

/** High-fidelity acacia (flat-topped desert tree) */
export function makeAcaciaTexture(size = 512): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  // Curved trunk with detailed bark
  const trunkGrad = ctx.createLinearGradient(size * 0.44, 0, size * 0.56, 0);
  trunkGrad.addColorStop(0, "#1E0C03");
  trunkGrad.addColorStop(0.4, "#3A1A08");
  trunkGrad.addColorStop(0.7, "#4A2210");
  trunkGrad.addColorStop(1, "#1E0C03");

  ctx.strokeStyle = trunkGrad as unknown as string;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(size / 2, size);
  ctx.bezierCurveTo(size * 0.54, size * 0.72, size * 0.46, size * 0.50, size * 0.50, size * 0.35);
  ctx.stroke();

  // Bark detail strokes
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = `rgba(10,4,0,${0.22 + Math.abs(Math.sin(i * 2.1)) * 0.15})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(size * 0.46 + i * 1.5, size * 0.88);
    ctx.bezierCurveTo(
      size * 0.47 + i * 1.3, size * 0.72,
      size * 0.46 + i * 1.4, size * 0.55,
      size * 0.48 + i * 1.2 + Math.sin(i) * 3, size * 0.37
    );
    ctx.stroke();
  }

  // Flat umbrella crown — 3 layers
  const flatY = size * 0.32;

  // Outer dark canopy
  const g1 = ctx.createRadialGradient(size / 2, flatY, 0, size / 2, flatY, size * 0.48);
  g1.addColorStop(0,    "rgba(55,105,25,0.97)");
  g1.addColorStop(0.45, "rgba(42,85,18,0.90)");
  g1.addColorStop(0.72, "rgba(32,66,12,0.60)");
  g1.addColorStop(1,    "rgba(25,55,8,0)");
  ctx.fillStyle = g1;
  ctx.beginPath(); ctx.ellipse(size / 2, flatY, size * 0.48, size * 0.15, 0, 0, Math.PI * 2); ctx.fill();

  // Mid lighter layer
  const g2 = ctx.createRadialGradient(size / 2, flatY - size * 0.05, 0, size / 2, flatY - size * 0.05, size * 0.34);
  g2.addColorStop(0, "rgba(75,140,35,0.88)");
  g2.addColorStop(0.55, "rgba(58,112,26,0.58)");
  g2.addColorStop(1, "rgba(45,90,18,0)");
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.ellipse(size / 2, flatY - size * 0.05, size * 0.34, size * 0.10, 0, 0, Math.PI * 2); ctx.fill();

  // Bright top highlight layer
  const g3 = ctx.createRadialGradient(size * 0.48, flatY - size * 0.09, 0, size * 0.48, flatY - size * 0.09, size * 0.20);
  g3.addColorStop(0, "rgba(95,165,45,0.75)");
  g3.addColorStop(1, "rgba(75,140,35,0)");
  ctx.fillStyle = g3;
  ctx.beginPath(); ctx.ellipse(size * 0.48, flatY - size * 0.09, size * 0.20, size * 0.06, 0, 0, Math.PI * 2); ctx.fill();

  // Dense leaf dabs (50 across canopy)
  for (let i = 0; i < 50; i++) {
    const lx = size * 0.06 + (Math.sin(i * 7.3) * 0.5 + 0.5) * size * 0.88;
    const ly = flatY - size * 0.05 + (Math.cos(i * 5.1) * 0.5 + 0.5) * size * 0.14;
    const ls = 3 + Math.abs(Math.sin(i * 3.1)) * 5;
    ctx.globalAlpha = 0.22 + Math.abs(Math.sin(i * 2)) * 0.18;
    ctx.fillStyle = `rgb(${80 + Math.sin(i * 3) * 22},${140 + Math.cos(i * 4) * 28},${28 + Math.sin(i * 2) * 14})`;
    ctx.beginPath(); ctx.ellipse(lx, ly, ls, ls * 0.55, i * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Sun-hit highlight
  const gh = ctx.createRadialGradient(size * 0.40, flatY - size * 0.07, 0, size * 0.40, flatY - size * 0.07, size * 0.30);
  gh.addColorStop(0, "rgba(190,255,110,0.28)");
  gh.addColorStop(0.5,"rgba(160,230,90,0.12)");
  gh.addColorStop(1, "rgba(160,230,90,0)");
  ctx.fillStyle = gh;
  ctx.beginPath(); ctx.ellipse(size * 0.40, flatY - size * 0.07, size * 0.30, size * 0.09, 0, 0, Math.PI * 2); ctx.fill();

  // Shadow underneath
  const gs = ctx.createRadialGradient(size / 2, flatY + size * 0.06, 0, size / 2, flatY + size * 0.06, size * 0.38);
  gs.addColorStop(0, "rgba(0,0,0,0.28)");
  gs.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gs;
  ctx.beginPath(); ctx.ellipse(size / 2, flatY + size * 0.06, size * 0.38, size * 0.10, 0, 0, Math.PI * 2); ctx.fill();

  return canvas;
}
