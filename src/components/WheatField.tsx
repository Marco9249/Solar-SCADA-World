import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useWeather } from "../context/WeatherContext";

// ── GPU-instanced wheat — 150 000 blades with SSS + traveling wave wind ──────
const BLADE_COUNT = 150_000;
const FIELD_W     = 58;
const FIELD_D     = 40;
const BLADE_H     = 1.12;
const BLADE_W     = 0.038;

function buildBladeGeo() {
  const segs = 8;
  const geo  = new THREE.PlaneGeometry(BLADE_W, BLADE_H, 1, segs);
  const pos  = geo.attributes.position.array as Float32Array;
  // Pivot at base
  for (let i = 1; i < pos.length; i += 3) pos[i] += BLADE_H / 2;
  // Taper + curvature
  for (let i = 0; i < pos.length; i += 3) {
    const t    = pos[i + 1] / BLADE_H;
    pos[i]    *= (1 - t * 0.55);
    pos[i + 2] = t * t * 0.14;
  }
  geo.computeVertexNormals();
  return geo;
}

// ── 4K photorealistic soil with dynamic wetness channel ──────────────────────
function makeSoilTex() {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const ctx = cv.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0,   "#1C0E04"); bg.addColorStop(0.3, "#221104");
  bg.addColorStop(0.6, "#1E1005"); bg.addColorStop(1,   "#170B03");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 22000; i++) {
    const x = (Math.sin(i * 7.3 + 1.7) * 0.5 + 0.5) * S;
    const y = (Math.cos(i * 5.1 + 0.8) * 0.5 + 0.5) * S;
    const r = 0.4 + Math.abs(Math.sin(i * 3.7)) * 2.2;
    ctx.globalAlpha = 0.4 + Math.abs(Math.sin(i * 4.1)) * 0.38;
    ctx.fillStyle = `hsl(${22 + Math.sin(i * 2.7) * 9},58%,${8 + Math.abs(Math.sin(i * 4.2)) * 13}%)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 260; i++) {
    const x = (Math.sin(i * 9.1 + 2.3) * 0.5 + 0.5) * S;
    const y = (Math.cos(i * 7.7 + 0.5) * 0.5 + 0.5) * S;
    const r = 4 + Math.abs(Math.sin(i * 5.1)) * 20;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, `hsla(${18 + Math.sin(i * 3) * 5},55%,${7 + Math.sin(i * 4) * 4}%,0.60)`);
    g2.addColorStop(1, "hsla(20,50%,5%,0)");
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.72, i * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  for (let i = 0; i < 550; i++) {
    const x = (Math.sin(i * 13.1 + 3.4) * 0.5 + 0.5) * S;
    const y = (Math.cos(i * 9.7  + 1.1) * 0.5 + 0.5) * S;
    const r = 2 + Math.abs(Math.sin(i * 6.3)) * 9;
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = `hsl(${24 + Math.sin(i * 3) * 6},${42 + Math.sin(i * 2) * 12}%,${14 + Math.sin(i * 4.1) * 7}%)`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.65, i * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 110; i++) {
    const x = (Math.sin(i * 11.7 + 4.2) * 0.5 + 0.5) * S;
    const y = (Math.cos(i * 8.3  + 2.8) * 0.5 + 0.5) * S;
    const r = 3 + Math.abs(Math.sin(i * 7.1)) * 8;
    const lig = 22 + Math.sin(i * 5) * 12;
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = `hsl(32,22%,${lig}%)`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.72, i * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = `hsl(40,15%,${lig + 14}%)`;
    ctx.beginPath(); ctx.ellipse(x - r * 0.22, y - r * 0.22, r * 0.44, r * 0.28, i * 0.9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const rowH = S / 10;
  for (let r = 0; r < 11; r++) {
    const yf = r * rowH;
    ctx.fillStyle = "rgba(4,1,0,0.72)"; ctx.fillRect(0, yf - 5, S, 10);
    ctx.fillStyle = "rgba(10,4,0,0.42)"; ctx.fillRect(0, yf + 4, S, 6);
    const wg = ctx.createLinearGradient(0, yf - 9, 0, yf - 5);
    wg.addColorStop(0, "rgba(0,0,0,0)"); wg.addColorStop(1, "rgba(55,30,10,0.30)");
    ctx.fillStyle = wg; ctx.fillRect(0, yf - 9, S, 4);
    for (let c = 0; c < 14; c++) {
      const cx = (Math.sin(r * 3.7 + c * 7.1) * 0.5 + 0.5) * S;
      ctx.strokeStyle = "rgba(4,1,0,0.22)"; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(cx, yf + 8);
      ctx.lineTo(cx + Math.sin(c * 2.3) * 14, yf + rowH * 0.35);
      ctx.stroke();
    }
  }

  for (let r = 0; r < 11; r++) {
    const yf = r * rowH;
    const mg = ctx.createLinearGradient(0, yf - 20, 0, yf + 20);
    mg.addColorStop(0, "rgba(0,0,0,0)"); mg.addColorStop(0.5, "rgba(0,0,0,0.22)"); mg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = mg; ctx.fillRect(0, yf - 20, S, 40);
  }

  for (let i = 0; i < 70; i++) {
    const sx = (Math.sin(i * 7.7) * 0.5 + 0.5) * S;
    const sy = (Math.sin(i * 3.1 + 1) * 0.5 + 0.5) * S;
    ctx.strokeStyle = `rgba(${14 + Math.sin(i * 4) * 7},${7 + Math.sin(i * 3) * 4},0,0.16)`;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(
      sx + Math.sin(i * 3.2) * 24, sy + Math.cos(i * 2.1) * 20,
      sx + Math.cos(i * 5.1) * 20, sy + Math.sin(i * 3.8) * 26,
      sx + Math.sin(i * 1.9) * 32, sy + Math.cos(i * 4.4) * 34,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 4); t.anisotropy = 16;
  return t;
}

// ── Wheat blade texture with detailed vein/awn structure ─────────────────────
function makeWheatBladeTex() {
  const cv = document.createElement("canvas");
  cv.width = 64; cv.height = 256;
  const ctx = cv.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0,    "#4A2E08"); g.addColorStop(0.10, "#7C540E");
  g.addColorStop(0.28, "#A87A14"); g.addColorStop(0.50, "#CCA020");
  g.addColorStop(0.72, "#E8BC2E"); g.addColorStop(0.88, "#F0CE42");
  g.addColorStop(1,    "#C09030");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 256);

  ctx.strokeStyle = "rgba(255,248,160,0.60)"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(32, 252); ctx.lineTo(32, 4); ctx.stroke();

  for (let v = 0; v < 5; v++) {
    const vx = 10 + v * 11;
    ctx.strokeStyle = `rgba(255,250,185,0.${14 + v * 2})`; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(vx, 235); ctx.lineTo(32 + (vx - 32) * 0.28, 18); ctx.stroke();
  }

  for (let i = 0; i < 22; i++) {
    const y = 8 + i * 11;
    const alpha = 0.028 + Math.abs(Math.sin(i * 4.1)) * 0.048;
    ctx.fillStyle = `rgba(255,255,205,${alpha})`; ctx.fillRect(0, y, 64, 4);
  }

  const tg = ctx.createLinearGradient(0, 0, 0, 55);
  tg.addColorStop(0, "rgba(65,42,4,0.96)"); tg.addColorStop(0.5, "rgba(120,88,12,0.62)"); tg.addColorStop(1, "rgba(170,120,18,0)");
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.moveTo(22, 55); ctx.lineTo(32, 1); ctx.lineTo(42, 55); ctx.closePath(); ctx.fill();

  for (let a = 0; a < 7; a++) {
    ctx.strokeStyle = `rgba(75,50,7,${0.30 + a * 0.07})`; ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(27 + a * 1.8, 50 - a * 4.5);
    ctx.lineTo(24 + a * 1.5, 18 - a * 2.8);
    ctx.stroke();
  }

  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WheatField({ position }: { position: [number, number, number] }) {
  const { weather, isRaining } = useWeather();
  const meshRef     = useRef<THREE.InstancedMesh>(null);
  const shaderRef   = useRef<THREE.WebGLProgramParametersWithUniforms | null>(null);
  const soilMatRef  = useRef<THREE.MeshStandardMaterial>(null);

  const bladeGeo = useMemo(() => buildBladeGeo(), []);
  const bladeTex = useMemo(() => makeWheatBladeTex(), []);
  const soilTex  = useMemo(() => makeSoilTex(), []);

  // ── Blade material — SSS + multi-octave traveling wave wind ─────────────────
  const bladeMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map:       bladeTex,
      roughness: 0.78,
      metalness: 0.02,
      side:      THREE.DoubleSide,
      alphaTest: 0.08,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWind = { value: 0.38 };

      // ── Vertex: traveling wave + Gerstner swaying ────────────────────────
      shader.vertexShader = `uniform float uTime;\nuniform float uWind;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        vec3 instPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float hf = position.y / ${BLADE_H.toFixed(4)};
        hf = hf * hf * hf;

        // Multi-octave Gerstner sway
        float w1 = sin(instPos.x * 2.2 + instPos.z * 1.7 + uTime * 2.5) * 0.55 + 0.45;
        float w2 = sin(instPos.x * 4.8 - instPos.z * 3.3 + uTime * 4.1 + 1.4) * 0.28;
        float w3 = cos(instPos.x * 9.1 + instPos.z * 6.5 + uTime * 7.2 + 2.3) * 0.11;

        // Traveling wave front propagating across field at angle
        float twave = sin(instPos.x * 0.35 + instPos.z * 0.18 - uTime * 3.0);
        float tpulse = smoothstep(-0.4, 0.4, twave) * (1.0 - smoothstep(0.4, 0.8, twave));

        // Storm gust surge (slow amplitude modulation)
        float surge = sin(uTime * 0.38 + instPos.x * 0.05) * 0.5 + 0.5;

        float sway = (w1 + w2 + w3) * uWind * hf
                   + tpulse * uWind * hf * 1.35 * (0.6 + surge * 0.4);
        transformed.x += sway;
        transformed.z += sway * 0.24;
        transformed.y -= abs(sway) * hf * 0.18;

        // Lateral flutter
        float lat = sin(instPos.x * 5.8 + uTime * 3.1 + instPos.z * 2.4) * uWind * hf * 0.22;
        transformed.z += lat;

        // Tip turbulence
        float tipT = sin(instPos.z * 12.3 + uTime * 9.4 + float(gl_InstanceID) * 0.012) * uWind * hf * 0.045;
        transformed.x += tipT;
        `,
      );

      // ── Fragment: Subsurface Scattering (SSS) ────────────────────────────
      // Inject warm backlit translucency before final outgoingLight composition
      shader.fragmentShader = shader.fragmentShader.replace(
        "vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse",
        `
        // SSS: golden sunlight passing through thin wheat leaf
        vec3 sssDir    = normalize(vec3(0.55, 1.0, 0.35));
        float sssBack  = pow(max(0.0, dot(-normal, sssDir)), 2.0);
        float sssFwd   = pow(max(0.0, dot( normal, sssDir)), 1.8) * 0.22;
        vec3  sssColor = vec3(1.10, 0.90, 0.48);
        reflectedLight.directDiffuse += diffuseColor.rgb * sssColor
                                      * (sssBack * 0.62 + sssFwd * 0.20);
        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse
        `,
      );

      shaderRef.current = shader;
    };
    return mat;
  }, [bladeTex]);

  // ── Soil material with dynamic wetness ───────────────────────────────────────
  const soilMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map:      soilTex,
      roughness: 0.94,
      metalness: 0.02,
      envMapIntensity: 0.1,
    });
    return mat;
  }, [soilTex]);

  // Store ref for dynamic updates
  useEffect(() => {
    soilMatRef.current = soilMat;
  }, [soilMat]);

  // ── Stratified grid placement — no sparse patches ─────────────────────────
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const sc  = new THREE.Vector3();

    const cols = Math.ceil(Math.sqrt(BLADE_COUNT * (FIELD_W / FIELD_D)));
    const rows = Math.ceil(BLADE_COUNT / cols);
    const cellW = FIELD_W / cols;
    const cellD = FIELD_D / rows;

    let idx = 0;
    outer:
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (idx >= BLADE_COUNT) break outer;
        const jx = (Math.sin(idx * 13.7 + 0.3) * 0.5 + 0.5) * cellW;
        const jz = (Math.cos(idx * 9.1  + 1.2) * 0.5 + 0.5) * cellD;
        const u  = -FIELD_W / 2 + c * cellW + jx;
        const v  = -FIELD_D / 2 + r * cellD + jz;

        const yRot  = idx * 2.3999 + Math.sin(idx * 3.3) * Math.PI;
        const scale = 0.72 + (Math.sin(idx * 4.7) * 0.5 + 0.5) * 0.60;

        pos.set(u, 0, v);
        rot.setFromEuler(new THREE.Euler(0, yRot, 0));
        sc.set(scale, scale + (Math.sin(idx * 2.1) * 0.5 + 0.5) * 0.32, scale);
        mat.compose(pos, rot, sc);
        mesh.setMatrixAt(idx, mat);

        const hue = (36 + Math.sin(idx * 2.9) * 8) / 360;
        const sat = (68 + Math.sin(idx * 5.3) * 16) / 100;
        const lig = (40 + Math.sin(idx * 3.7) * 12) / 100;
        mesh.setColorAt(idx, new THREE.Color().setHSL(hue, sat, lig));
        idx++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useEffect(() => {
    if (meshRef.current) {
      // Fix culling issue when wheat moves with shader: disable frustum culling
      meshRef.current.frustumCulled = false;
      // Compute bounding sphere to cover entire field area
      if (meshRef.current.geometry) {
        meshRef.current.geometry.computeBoundingSphere();
        if (meshRef.current.geometry.boundingSphere) {
          // Expand sphere to cover max field dimensions + wind sway margin
          meshRef.current.geometry.boundingSphere.radius = Math.hypot(FIELD_W, FIELD_D) / 2 + 12;
        }
      }
    }
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = t;
      const windStr = weather.mode === "clear"
        ? (isRaining ? 0.62 : 0.40)
        : weather.mode === "fluctuating"
          ? 0.28 + Math.abs(Math.sin(t * 0.28)) * 0.52
          : 0.14;
      shaderRef.current.uniforms.uWind.value = windStr;
    }

    // Dynamic wetness — darken + increase reflectivity when raining
    const m = soilMatRef.current;
    if (m) {
      const targetRough   = isRaining ? 0.22 : 0.94;
      const targetMetal   = isRaining ? 0.32 : 0.02;
      const targetEnv     = isRaining ? 0.80 : 0.10;
      m.roughness         = THREE.MathUtils.lerp(m.roughness,  targetRough, 0.015);
      m.metalness         = THREE.MathUtils.lerp(m.metalness,  targetMetal, 0.015);
      m.envMapIntensity   = THREE.MathUtils.lerp(m.envMapIntensity, targetEnv, 0.015);
      // Color shift (dark wet clay vs dry)
      const wetness       = 1 - m.roughness / 0.94;
      const baseL         = 0.18 + (1 - wetness) * 0.22;
      m.color.setHSL(0.066, 0.55, baseL);
      m.needsUpdate       = false; // avoid recompile
    }
  });

  return (
    <group position={position}>
      {/* Photorealistic irrigated soil */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <planeGeometry args={[FIELD_W + 4, FIELD_D + 4, 12, 12]} />
        <primitive object={soilMat} attach="material" />
      </mesh>

      {/* Drip irrigation lines */}
      {Array.from({ length: 10 }).map((_, r) => (
        <mesh key={r} receiveShadow position={[0, 0.032, (r / 9 - 0.5) * FIELD_D]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[FIELD_W, 0.10]} />
          <meshStandardMaterial color="#121212" roughness={0.85} metalness={0.38} />
        </mesh>
      ))}

      {/* Drip emitters */}
      {Array.from({ length: 10 }).map((_, r) =>
        Array.from({ length: 18 }).map((__, c) => (
          <mesh key={`${r}-${c}`} position={[(c / 17 - 0.5) * FIELD_W, 0.042, (r / 9 - 0.5) * FIELD_D]}>
            <cylinderGeometry args={[0.030, 0.030, 0.048, 5]} />
            <meshStandardMaterial color="#181818" metalness={0.65} roughness={0.36} />
          </mesh>
        ))
      )}

      {/* Dense GPU-instanced wheat blades — 150 000 */}
      <instancedMesh ref={meshRef} args={[bladeGeo, bladeMat, BLADE_COUNT]} castShadow receiveShadow />

      {/* Field sign */}
      <mesh position={[0, 1.4, -(FIELD_D / 2) - 0.8]} castShadow>
        <boxGeometry args={[5.5, 0.65, 0.1]} />
        <meshStandardMaterial color="#1A3A10" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.4, -(FIELD_D / 2) - 0.85]}>
        <boxGeometry args={[5.2, 0.5, 0.06]} />
        <meshStandardMaterial color="#2A6A18" emissive="#003300" emissiveIntensity={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}
