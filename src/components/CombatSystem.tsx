import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  playPistol, playMachineGun, playBazooka,
  playShellCasing, playEmptyClick, playReload, playWeaponSwitch,
} from "../utils/audioEngine";

// ─── Types ────────────────────────────────────────────────────────────────────
export type WeaponType = "pistol" | "machinegun" | "bazooka";

interface ZombieData {
  id: number;
  x: number; z: number;
  health: number; maxHealth: number;
  state: "alive" | "hit" | "dying" | "dead";
  stateTimer: number;
  deathAngle: number;
  facingAngle: number;
}

interface BulletData {
  id: number;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  traveled: number;
  maxRange: number;
}

interface ExplosionData {
  id: number;
  pos: THREE.Vector3;
  timer: number;
  maxTimer: number;
}

const MAX_ZOMBIES  = 50;
const ZOMBIE_SPEED = 1.7;
const ZOMBIE_RUN   = 3.4;
const ATTACK_RANGE = 1.9;
const EXPLOSION_R  = 7.5;

const WEAPON_CFG = {
  pistol:     { dmg: 60,  cd: 0.55, recoilZ: 0.07, recoilY: 0.03,  muzzle: "#FFE040" },
  machinegun: { dmg: 18,  cd: 0.09, recoilZ: 0.03, recoilY: 0.012, muzzle: "#FFAA22" },
  bazooka:    { dmg: 200, cd: 2.2,  recoilZ: 0.12, recoilY: 0.06,  muzzle: "#FF6600" },
};

const HIP_OFFSET = new THREE.Vector3(0.22, -0.18, -0.42);
const ADS_OFFSET = new THREE.Vector3(0.00, -0.13, -0.30);

let _uid = 1;

interface Props {
  isLocked:       boolean;
  showWeapon:     boolean;
  onZombieCount:  (n: number) => void;
  onWeaponChange: (w: WeaponType) => void;
  onPlayerHit:    (dmg: number) => void;
}

// ─── Terrifying zombie skin texture ──────────────────────────────────────────
function makeZombieSkinTex(size = 256) {
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#2B4A22"); bg.addColorStop(0.4, "#1E3A18"); bg.addColorStop(1, "#2A4020");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 500; i++) {
    const x = (Math.sin(i * 7.3 + 1) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 5.1 + 2) * 0.5 + 0.5) * size;
    const r = 1.5 + Math.abs(Math.sin(i * 4.1)) * 6;
    const l = 14 + Math.sin(i * 3.3) * 9;
    const h = 110 + Math.sin(i * 2.7) * 30;
    ctx.globalAlpha = 0.55 + Math.abs(Math.sin(i * 4.7)) * 0.38;
    ctx.fillStyle = `hsl(${h},${25 + Math.abs(Math.sin(i * 2)) * 18}%,${l}%)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 28; i++) {
    const x = (Math.sin(i * 11.3 + 0.7) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 8.7 + 1.1) * 0.5 + 0.5) * size;
    const r = 4 + Math.abs(Math.sin(i * 5.1)) * 10;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(20,10,5,0.7)";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(100,40,10,0.65)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 8; i++) {
    const x = (Math.sin(i * 9.3 + 2.2) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 6.7 + 0.8) * 0.5 + 0.5) * size;
    const w2 = 6 + Math.abs(Math.sin(i * 4.3)) * 12;
    const h2 = 3 + Math.abs(Math.sin(i * 7.1)) * 5;
    const wg = ctx.createRadialGradient(x, y, 0, x, y, w2);
    wg.addColorStop(0, "rgba(180,20,10,0.95)");
    wg.addColorStop(0.5,"rgba(120,15,8,0.75)");
    wg.addColorStop(1, "rgba(60,10,5,0)");
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.ellipse(x, y, w2, h2, i * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  for (let i = 0; i < 16; i++) {
    const sx = (Math.sin(i * 7.7) * 0.5 + 0.5) * size;
    const sy = (Math.cos(i * 5.9) * 0.5 + 0.5) * size;
    ctx.strokeStyle = `rgba(10,25,5,${0.35 + Math.abs(Math.sin(i * 2.7)) * 0.3})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + Math.sin(i * 3.1) * 20, sy + Math.cos(i * 2.3) * 15,
                         sx + Math.cos(i * 4.7) * 35, sy + Math.sin(i * 3.9) * 28);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(cv);
}

function makeZombieFaceTex(size = 256) {
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;

  ctx.fillStyle = "#22401A"; ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 200; i++) {
    const x = (Math.sin(i * 7.3) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 5.1) * 0.5 + 0.5) * size;
    const r = 2 + Math.abs(Math.sin(i * 4.1)) * 7;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = `hsl(${105 + Math.sin(i * 3) * 25},${20 + Math.abs(Math.sin(i * 2)) * 18}%,${12 + Math.sin(i * 4.2) * 8}%)`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const eyes = [[size * 0.35, size * 0.38], [size * 0.65, size * 0.38]];
  for (const [ex, ey] of eyes) {
    ctx.fillStyle = "rgba(5,5,5,0.95)";
    ctx.beginPath(); ctx.ellipse(ex, ey, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(180,100,80,0.7)";
    ctx.beginPath(); ctx.ellipse(ex, ey, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(250,220,0,0.9)";
    ctx.beginPath(); ctx.ellipse(ex, ey, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.beginPath(); ctx.ellipse(ex, ey, 2, 5, 0, 0, Math.PI * 2); ctx.fill();
    for (let v = 0; v < 5; v++) {
      const vAngle = (v / 5) * Math.PI * 2;
      ctx.strokeStyle = "rgba(160,30,10,0.55)"; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(vAngle) * 5, ey + Math.sin(vAngle) * 4);
      ctx.lineTo(ex + Math.cos(vAngle) * 11, ey + Math.sin(vAngle) * 8);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "rgba(5,5,5,0.65)";
  ctx.beginPath(); ctx.ellipse(size * 0.5, size * 0.56, 8, 6, 0, 0, Math.PI * 2); ctx.fill();

  const mouthY = size * 0.72; const mouthW = size * 0.38; const mouthH = size * 0.15;
  ctx.fillStyle = "rgba(0,0,0,0.98)";
  ctx.beginPath(); ctx.ellipse(size * 0.5, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2); ctx.fill();
  const rimG = ctx.createRadialGradient(size * 0.5, mouthY, mouthH * 0.3, size * 0.5, mouthY, mouthH + 10);
  rimG.addColorStop(0, "rgba(150,15,5,0.9)"); rimG.addColorStop(1, "rgba(80,5,2,0)");
  ctx.fillStyle = rimG;
  ctx.beginPath(); ctx.ellipse(size * 0.5, mouthY, mouthW + 10, mouthH + 10, 0, 0, Math.PI * 2); ctx.fill();
  const teethN = 5;
  for (let t = 0; t < teethN; t++) {
    const tx = size * 0.5 - mouthW * 0.6 + t * (mouthW * 1.2 / (teethN - 1));
    ctx.fillStyle = `rgba(${210 + Math.sin(t * 3.3) * 20},${195 + Math.sin(t * 2.1) * 12},${160 + Math.sin(t) * 20},0.9)`;
    ctx.beginPath();
    ctx.moveTo(tx - 6, mouthY - mouthH * 0.4); ctx.lineTo(tx + 6, mouthY - mouthH * 0.4);
    ctx.lineTo(tx + 4, mouthY + 6); ctx.lineTo(tx - 4, mouthY + 6);
    ctx.closePath(); ctx.fill();
  }
  const tg = ctx.createRadialGradient(size * 0.5, mouthY + 8, 0, size * 0.5, mouthY + 8, 20);
  tg.addColorStop(0, "rgba(160,30,30,0.9)"); tg.addColorStop(1, "rgba(100,15,15,0)");
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.ellipse(size * 0.5, mouthY + 8, 20, 12, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = "rgba(100,10,5,0.75)"; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size * 0.35, size * 0.22);
  ctx.bezierCurveTo(size * 0.42, size * 0.20, size * 0.55, size * 0.24, size * 0.68, size * 0.22);
  ctx.stroke();

  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(cv);
}

export default function CombatSystem({ isLocked, showWeapon, onZombieCount, onWeaponChange, onPlayerHit }: Props) {
  const { camera } = useThree();

  const weapon        = useRef<WeaponType>("pistol");
  const cooldown      = useRef(0);
  const mouseDown     = useRef(false);
  const isADS         = useRef(false);
  const recoilZ       = useRef(0);
  const recoilY       = useRef(0);
  const muzzleTimer   = useRef(0);
  const prevCamPos    = useRef(new THREE.Vector3());
  const weaponBobY    = useRef(0);
  const weaponBobX    = useRef(0);
  const bobAccum      = useRef(0);

  const zombies    = useRef<ZombieData[]>([]);
  const bullets    = useRef<BulletData[]>([]);
  const explosions = useRef<ExplosionData[]>([]);

  const bodyRef        = useRef<THREE.InstancedMesh>(null);
  const headRef        = useRef<THREE.InstancedMesh>(null);
  const legLRef        = useRef<THREE.InstancedMesh>(null);
  const legRRef        = useRef<THREE.InstancedMesh>(null);
  const armLRef        = useRef<THREE.InstancedMesh>(null);
  const armRRef        = useRef<THREE.InstancedMesh>(null);
  const bulletMeshRef  = useRef<THREE.InstancedMesh>(null);
  const explodeMeshRef = useRef<THREE.InstancedMesh>(null);
  const weaponGroupRef = useRef<THREE.Group>(null);
  const muzzleLightRef = useRef<THREE.PointLight>(null);

  const bodyGeo    = useMemo(() => new THREE.BoxGeometry(0.50, 0.74, 0.26), []);
  const headGeo    = useMemo(() => new THREE.SphereGeometry(0.23, 10, 8), []);
  const limbGeo    = useMemo(() => new THREE.CapsuleGeometry(0.078, 0.40, 3, 8), []);
  const bulletGeo  = useMemo(() => new THREE.SphereGeometry(0.17, 6, 5), []);
  const explodeGeo = useMemo(() => new THREE.SphereGeometry(1, 9, 7), []);

  const skinTex = useMemo(() => makeZombieSkinTex(256), []);
  const faceTex = useMemo(() => makeZombieFaceTex(256), []);

  const bodyMat    = useMemo(() => new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.88, metalness: 0.0 }), [skinTex]);
  const headMat    = useMemo(() => new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.75, metalness: 0.0 }), [faceTex]);
  const limbMat    = useMemo(() => new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.88, metalness: 0.0 }), [skinTex]);
  const bulletMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: "#FF6600", emissive: "#FF3300", emissiveIntensity: 3, roughness: 0.3 }), []);
  const explodeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#FF5500", emissive: "#FF2200", emissiveIntensity: 2, transparent: true, opacity: 0.75, depthWrite: false }), []);

  // ── Input listeners ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isLocked) return;
      if (e.code === "Digit5") { spawnZombie(); }
      if (e.code === "Tab")    { e.preventDefault(); cycleWeapon(); }
      if (e.code === "KeyR")   { playReload(weapon.current); }
    };
    const onWheel   = (e: WheelEvent)  => { if (isLocked) cycleWeapon(e.deltaY > 0 ? 1 : -1); };
    const onMD      = (e: MouseEvent)  => {
      if (!isLocked) return;
      if (e.button === 0) { mouseDown.current = true; tryShoot(); }
      if (e.button === 2) isADS.current = true;
    };
    const onMU      = (e: MouseEvent)  => {
      if (e.button === 0) mouseDown.current = false;
      if (e.button === 2) isADS.current = false;
    };
    const onCtxMenu = (e: MouseEvent)  => { if (isLocked) e.preventDefault(); };

    document.addEventListener("keydown",     onKey);
    document.addEventListener("wheel",       onWheel);
    document.addEventListener("mousedown",   onMD);
    document.addEventListener("mouseup",     onMU);
    document.addEventListener("contextmenu", onCtxMenu);
    return () => {
      document.removeEventListener("keydown",     onKey);
      document.removeEventListener("wheel",       onWheel);
      document.removeEventListener("mousedown",   onMD);
      document.removeEventListener("mouseup",     onMU);
      document.removeEventListener("contextmenu", onCtxMenu);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  function cycleWeapon(dir = 1) {
    const order: WeaponType[] = ["pistol", "machinegun", "bazooka"];
    const next = order[(order.indexOf(weapon.current) + dir + 3) % 3];
    weapon.current = next;
    onWeaponChange(next);
    playWeaponSwitch();
  }

  // ── Zombie spawn — close enough to be immediately visible ─────────────────
  function spawnZombie() {
    const alive = zombies.current.filter(z => z.state !== "dead").length;
    if (alive >= MAX_ZOMBIES) return;
    const angle = Math.random() * Math.PI * 2;
    // Spawn 8–20 units away (was 22-42): immediately visible and threatening
    const dist  = 8 + Math.random() * 12;
    const x     = camera.position.x + Math.cos(angle) * dist;
    const z     = camera.position.z + Math.sin(angle) * dist;
    zombies.current.push({
      id:          _uid++,
      x, z,
      health:      100, maxHealth: 100,
      state:       "alive",
      stateTimer:  0,
      deathAngle:  0,
      facingAngle: angle + Math.PI,
    });
    onZombieCount(zombies.current.filter(z => z.state !== "dead").length);
  }

  function tryShoot() {
    if (cooldown.current > 0) {
      if (cooldown.current > 0.01) playEmptyClick();
      return;
    }
    const cfg        = WEAPON_CFG[weapon.current];
    cooldown.current = cfg.cd;
    recoilZ.current  = cfg.recoilZ;
    recoilY.current  = cfg.recoilY;
    muzzleTimer.current = 0.08;

    // Audio
    if (weapon.current === "pistol") {
      playPistol();
      setTimeout(() => playShellCasing(), 80 + Math.random() * 60);
    } else if (weapon.current === "machinegun") {
      playMachineGun();
      setTimeout(() => playShellCasing(), 55 + Math.random() * 40);
    } else {
      playBazooka();
    }

    if (weapon.current === "bazooka") {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      bullets.current.push({ id: _uid++, pos: camera.position.clone().addScaledVector(dir, 0.9), dir: dir.clone(), traveled: 0, maxRange: 120 });
    } else {
      hitscan(WEAPON_CFG[weapon.current].dmg);
    }
  }

  function hitscan(dmg: number) {
    const origin = camera.position.clone();
    const dir    = new THREE.Vector3(); camera.getWorldDirection(dir);
    const minDot = weapon.current === "pistol" ? 0.978 : 0.962;
    for (const z of zombies.current) {
      if (z.state !== "alive" && z.state !== "hit") continue;
      const dv = new THREE.Vector3(z.x - origin.x, 0.5 - origin.y, z.z - origin.z);
      if (dv.length() > 55) continue;
      dv.normalize();
      if (dv.dot(dir) > minDot) {
        damageZombie(z, dmg);
        if (weapon.current === "pistol") break;
      }
    }
  }

  function damageZombie(z: ZombieData, dmg: number) {
    z.health -= dmg;
    if (z.health <= 0) { z.state = "dying"; z.stateTimer = 1.3; }
    else               { z.state = "hit";   z.stateTimer = 0.14; }
  }

  function explodeAt(pos: THREE.Vector3) {
    explosions.current.push({ id: _uid++, pos: pos.clone(), timer: 0, maxTimer: 0.9 });
    for (const z of zombies.current) {
      if (z.state !== "alive" && z.state !== "hit") continue;
      const d = Math.hypot(z.x - pos.x, z.z - pos.z);
      if (d < EXPLOSION_R) damageZombie(z, WEAPON_CFG.bazooka.dmg * (1 - d / EXPLOSION_R));
    }
    onZombieCount(zombies.current.filter(z => z.state !== "dead").length);
  }

  // ── Scratch objects (re-created per useFrame call) ────────────────────────
  const _m     = new THREE.Matrix4();
  const _p     = new THREE.Vector3();
  const _q     = new THREE.Quaternion();
  const _s     = new THREE.Vector3();
  const _c     = new THREE.Color();
  const _bodyQ = new THREE.Quaternion();
  const _headQ = new THREE.Quaternion();
  const _limbQ = new THREE.Quaternion();
  const _euler = new THREE.Euler();
  const _tmpV  = new THREE.Vector3();
  const _yAxis = new THREE.Vector3(0, 1, 0);
  const _xAxis = new THREE.Vector3(1, 0, 0);

  function updateZombieInstances(elapsed: number, camPos: THREE.Vector3) {
    const bm = bodyRef.current, hm = headRef.current;
    const ll = legLRef.current, lr = legRRef.current;
    const al = armLRef.current, ar = armRRef.current;
    if (!bm || !hm || !ll || !lr || !al || !ar) return;

    for (let i = 0; i < MAX_ZOMBIES; i++) {
      const z = zombies.current[i];
      if (!z || z.state === "dead") {
        _m.compose(_p.set(0, -500, 0), _q.identity(), _s.set(0, 0, 0));
        bm.setMatrixAt(i, _m); hm.setMatrixAt(i, _m);
        ll.setMatrixAt(i, _m); lr.setMatrixAt(i, _m);
        al.setMatrixAt(i, _m); ar.setMatrixAt(i, _m);
        continue;
      }

      const deathX  = z.state === "dying" ? z.deathAngle : 0;
      const groundY = 0.37 * Math.cos(deathX);
      const px = z.x, pz = z.z;

      // Body quaternion
      _euler.set(deathX, z.facingAngle, 0, "YXZ");
      _bodyQ.setFromEuler(_euler);
      _p.set(px, groundY, pz); _s.set(1, 1, 1);
      _m.compose(_p, _bodyQ, _s);
      bm.setMatrixAt(i, _m);

      // Head — tracks toward player (60% blend)
      const toPlayerYaw = Math.atan2(camPos.x - px, camPos.z - pz);
      const headBlend   = z.state === "dying" ? 0 : 0.6;
      const headYaw     = z.facingAngle + (toPlayerYaw - z.facingAngle) * headBlend;
      const headTilt    = z.state === "dying" ? 0 : Math.sin(elapsed * 1.8 + z.id * 1.2) * 0.12;
      _euler.set(deathX * 0.5, headYaw, headTilt, "YXZ");
      _headQ.setFromEuler(_euler);
      _tmpV.set(0, 0.78, 0.05).applyQuaternion(_bodyQ);
      _p.set(px + _tmpV.x, groundY + 0.70 + _tmpV.y * 0.15, pz + _tmpV.z);
      _m.compose(_p, _headQ, _s);
      hm.setMatrixAt(i, _m);

      // Limbs
      const isMoving = z.state === "alive" || z.state === "hit";
      const walkP    = isMoving ? elapsed * 3.8 + z.id * 0.78 : 0;
      const legSwing = Math.sin(walkP) * 0.44;
      const armSwing = -legSwing * 0.65;
      const distToPlayer = Math.hypot(px - camPos.x, pz - camPos.z);
      const lungeSwing   = distToPlayer < 3 ? -0.85 : armSwing;

      _limbQ.setFromAxisAngle(_xAxis, legSwing).premultiply(_bodyQ);
      _tmpV.set(-0.17, -0.64, 0).applyQuaternion(_bodyQ);
      _p.set(px + _tmpV.x, Math.max(0.06, groundY - 0.22 + Math.cos(walkP) * 0.04 * Number(isMoving)), pz + _tmpV.z);
      _m.compose(_p, _limbQ, _s); ll.setMatrixAt(i, _m);

      _limbQ.setFromAxisAngle(_xAxis, -legSwing).premultiply(_bodyQ);
      _tmpV.set(0.17, -0.64, 0).applyQuaternion(_bodyQ);
      _p.set(px + _tmpV.x, Math.max(0.06, groundY - 0.22 + Math.cos(walkP + Math.PI) * 0.04 * Number(isMoving)), pz + _tmpV.z);
      _m.compose(_p, _limbQ, _s); lr.setMatrixAt(i, _m);

      _limbQ.setFromAxisAngle(_xAxis, lungeSwing).premultiply(_bodyQ);
      _tmpV.set(-0.33, 0.20, 0).applyQuaternion(_bodyQ);
      _p.set(px + _tmpV.x, groundY + 0.22, pz + _tmpV.z);
      _m.compose(_p, _limbQ, _s); al.setMatrixAt(i, _m);

      _limbQ.setFromAxisAngle(_xAxis, -lungeSwing).premultiply(_bodyQ);
      _tmpV.set(0.33, 0.20, 0).applyQuaternion(_bodyQ);
      _p.set(px + _tmpV.x, groundY + 0.22, pz + _tmpV.z);
      _m.compose(_p, _limbQ, _s); ar.setMatrixAt(i, _m);

      // Color tint by state
      if (z.state === "hit") {
        const red = new THREE.Color(1, 0.08, 0.08);
        bm.setColorAt(i, red); hm.setColorAt(i, red);
        ll.setColorAt(i, red); lr.setColorAt(i, red);
        al.setColorAt(i, red); ar.setColorAt(i, red);
      } else if (z.state === "dying") {
        const dead = new THREE.Color(0.22, 0.16, 0.07);
        bm.setColorAt(i, dead); hm.setColorAt(i, dead);
        ll.setColorAt(i, dead); lr.setColorAt(i, dead);
        al.setColorAt(i, dead); ar.setColorAt(i, dead);
      } else {
        const hp = z.health / z.maxHealth;
        _c.setRGB(0.18 + (1 - hp) * 0.62, 0.50 + hp * 0.12, 0.14);
        bm.setColorAt(i, _c); hm.setColorAt(i, _c);
        ll.setColorAt(i, _c); lr.setColorAt(i, _c);
        al.setColorAt(i, _c); ar.setColorAt(i, _c);
      }
    }

    for (const m of [bm, hm, ll, lr, al, ar]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  // ── Main loop ────────────────────────────────────────────────────────────────
  useFrame(({ clock }, delta) => {
    const elapsed = clock.getElapsedTime();
    cooldown.current    = Math.max(0, cooldown.current - delta);
    muzzleTimer.current = Math.max(0, muzzleTimer.current - delta);

    if (isLocked && mouseDown.current && weapon.current === "machinegun" && cooldown.current <= 0) tryShoot();

    // Weapon bob
    const camPos = camera.position;
    const moved  = camPos.distanceTo(prevCamPos.current);
    prevCamPos.current.copy(camPos);
    if (moved > 0.002 && isLocked) {
      bobAccum.current += delta * 10;
      weaponBobY.current = Math.sin(bobAccum.current * 1.1) * 0.007;
      weaponBobX.current = Math.sin(bobAccum.current * 0.55) * 0.004;
    } else {
      weaponBobY.current *= 0.88;
      weaponBobX.current *= 0.88;
    }

    const idleSwayX = Math.sin(elapsed * 0.72) * 0.0022 + Math.cos(elapsed * 1.28) * 0.001;
    const idleSwayY = Math.sin(elapsed * 0.51 + 1.2) * 0.0018;

    recoilZ.current = THREE.MathUtils.lerp(recoilZ.current, 0, delta * 11);
    recoilY.current = THREE.MathUtils.lerp(recoilY.current, 0, delta * 11);

    // Stable weapon attachment
    const wg = weaponGroupRef.current;
    if (wg) {
      wg.visible = isLocked && showWeapon;
      if (isLocked && showWeapon) {
        const baseOffset  = isADS.current ? ADS_OFFSET : HIP_OFFSET;
        const localOffset = new THREE.Vector3(
          baseOffset.x + idleSwayX + weaponBobX.current,
          baseOffset.y + idleSwayY + weaponBobY.current - recoilY.current,
          baseOffset.z - recoilZ.current * 1.8,
        );
        localOffset.applyMatrix4(camera.matrixWorld);
        wg.position.copy(localOffset);
        wg.quaternion.copy(camera.quaternion);
      }
    }

    // Muzzle flash
    const ml = muzzleLightRef.current;
    if (ml) {
      ml.intensity = muzzleTimer.current > 0 ? 16 : 0;
      if (muzzleTimer.current > 0) {
        const fwdDir = new THREE.Vector3(); camera.getWorldDirection(fwdDir);
        ml.position.copy(camPos).addScaledVector(fwdDir, 0.65);
      }
    }

    // Zombie AI
    let changed = false;
    for (const z of zombies.current) {
      if (z.state === "dead") continue;
      z.stateTimer -= delta;
      if (z.state === "hit"   && z.stateTimer <= 0) z.state = "alive";
      if (z.state === "dying") {
        z.deathAngle = Math.min(Math.PI / 2, z.deathAngle + delta * 2.6);
        if (z.stateTimer <= 0) { z.state = "dead"; changed = true; }
        continue;
      }
      const dx   = camPos.x - z.x, dz = camPos.z - z.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      z.facingAngle = Math.atan2(dx, dz);
      const spd = dist < 9 ? ZOMBIE_RUN : ZOMBIE_SPEED;
      if (dist > ATTACK_RANGE) { z.x += (dx / dist) * spd * delta; z.z += (dz / dist) * spd * delta; }
      else onPlayerHit(7 * delta);
    }
    if (changed) onZombieCount(zombies.current.filter(z => z.state !== "dead").length);

    // Bazooka projectiles
    bullets.current = bullets.current.filter(b => {
      b.pos.addScaledVector(b.dir, 30 * delta);
      b.traveled += 30 * delta;
      for (const z of zombies.current) {
        if (z.state !== "alive" && z.state !== "hit") continue;
        if (Math.hypot(b.pos.x - z.x, b.pos.z - z.z) < 1.3) { explodeAt(b.pos); return false; }
      }
      if (b.traveled > b.maxRange || b.pos.y < -3) { explodeAt(b.pos); return false; }
      return true;
    });

    const bulM = bulletMeshRef.current;
    if (bulM) {
      for (let i = 0; i < 10; i++) {
        const b = bullets.current[i];
        if (b) { _m.compose(b.pos, _q.identity(), _s.set(1, 1, 1)); }
        else   { _m.compose(_p.set(0, -500, 0), _q.identity(), _s.set(0, 0, 0)); }
        bulM.setMatrixAt(i, _m);
      }
      bulM.instanceMatrix.needsUpdate = true;
    }

    // Explosions
    explosions.current = explosions.current.filter(ex => { ex.timer += delta; return ex.timer < ex.maxTimer; });
    const em = explodeMeshRef.current;
    if (em) {
      for (let i = 0; i < 5; i++) {
        const ex = explosions.current[i];
        if (ex) {
          const t  = ex.timer / ex.maxTimer;
          const sc = t * (2 - t) * EXPLOSION_R;
          _m.compose(ex.pos, _q.identity(), _s.set(sc, sc, sc));
          (em.material as THREE.MeshStandardMaterial).opacity = 0.8 * (1 - t);
        } else {
          _m.compose(_p.set(0, -500, 0), _q.identity(), _s.set(0, 0, 0));
        }
        em.setMatrixAt(i, _m);
      }
      em.instanceMatrix.needsUpdate = true;
    }

    updateZombieInstances(elapsed, camPos);
  });

  return (
    <>
      <instancedMesh ref={bodyRef}        args={[bodyGeo,    bodyMat,    MAX_ZOMBIES]} castShadow />
      <instancedMesh ref={headRef}        args={[headGeo,    headMat,    MAX_ZOMBIES]} castShadow />
      <instancedMesh ref={legLRef}        args={[limbGeo,    limbMat,    MAX_ZOMBIES]} castShadow />
      <instancedMesh ref={legRRef}        args={[limbGeo,    limbMat,    MAX_ZOMBIES]} castShadow />
      <instancedMesh ref={armLRef}        args={[limbGeo,    limbMat,    MAX_ZOMBIES]} castShadow />
      <instancedMesh ref={armRRef}        args={[limbGeo,    limbMat,    MAX_ZOMBIES]} castShadow />
      <instancedMesh ref={bulletMeshRef}  args={[bulletGeo,  bulletMat,  10]} />
      <instancedMesh ref={explodeMeshRef} args={[explodeGeo, explodeMat,  5]} />

      <pointLight ref={muzzleLightRef} intensity={0} color="#FFDD44" distance={14} decay={2} />

      <group ref={weaponGroupRef}>
        <WeaponModel weaponRef={weapon} />
      </group>
    </>
  );
}

// ── Procedural PBR weapon textures ───────────────────────────────────────────
function makeGunmetalTex(size = 128): THREE.CanvasTexture {
  const cv = document.createElement("canvas"); cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#1A1A1C"; ctx.fillRect(0, 0, size, size);
  // Brushed steel direction lines
  for (let i = 0; i < 80; i++) {
    const y = (i / 79) * size;
    ctx.strokeStyle = `rgba(${55 + Math.abs(Math.sin(i*4.1))*38},${55+Math.abs(Math.sin(i*3.7))*38},${60+Math.abs(Math.sin(i*2.9))*42},${0.06+Math.abs(Math.sin(i*5.1))*0.06})`;
    ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y + Math.sin(i*0.5)*1.5); ctx.stroke();
  }
  // Scratches
  for (let i = 0; i < 18; i++) {
    const sx = (Math.sin(i*7.3)*0.5+0.5)*size; const sy = (Math.cos(i*5.1)*0.5+0.5)*size;
    const angle = i*0.8; const len = 4+Math.abs(Math.sin(i*4.2))*22;
    ctx.strokeStyle = `rgba(120,120,128,${0.08+Math.abs(Math.sin(i*3.1))*0.10})`; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx+Math.cos(angle)*len, sy+Math.sin(angle)*len); ctx.stroke();
  }
  // Slight edge highlight
  const eg = ctx.createLinearGradient(0,0,size,0);
  eg.addColorStop(0,"rgba(80,80,88,0.22)"); eg.addColorStop(0.08,"rgba(0,0,0,0)");
  eg.addColorStop(0.92,"rgba(0,0,0,0)"); eg.addColorStop(1,"rgba(80,80,88,0.18)");
  ctx.fillStyle = eg; ctx.fillRect(0,0,size,size);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; return t;
}

function makeGripTex(size = 64): THREE.CanvasTexture {
  const cv = document.createElement("canvas"); cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#1C1510"; ctx.fillRect(0, 0, size, size);
  // Diamond-checkered grip pattern
  const cell = 6;
  for (let y = 0; y < size; y += cell) {
    for (let x = (y/cell%2)*cell/2; x < size; x += cell) {
      ctx.fillStyle = `rgba(40,28,16,0.55)`;
      ctx.beginPath(); ctx.arc(x+cell/2, y+cell/2, cell*0.32, 0, Math.PI*2); ctx.fill();
    }
  }
  // Horizontal grip ridges
  for (let y = 0; y < size; y += 5) {
    ctx.strokeStyle = `rgba(8,5,2,0.35)`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cv); return t;
}

function makeTubeTex(size = 128): THREE.CanvasTexture {
  const cv = document.createElement("canvas"); cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d")!;
  // OD green / military olive base
  const bg = ctx.createLinearGradient(0,0,size,0);
  bg.addColorStop(0,"#2E3020"); bg.addColorStop(0.3,"#3A3C28"); bg.addColorStop(0.6,"#2E3020"); bg.addColorStop(1,"#262816");
  ctx.fillStyle = bg; ctx.fillRect(0,0,size,size);
  // Texture noise
  for (let i=0;i<3000;i++) {
    const x=(Math.sin(i*7.3)*0.5+0.5)*size; const y=(Math.cos(i*5.1)*0.5+0.5)*size;
    ctx.globalAlpha=0.22+Math.abs(Math.sin(i*4.1))*0.22;
    ctx.fillStyle=`hsl(${64+Math.sin(i*3)*8},${22+Math.abs(Math.sin(i*2))*10}%,${16+Math.sin(i*4.2)*6}%)`;
    ctx.beginPath(); ctx.arc(x,y,0.8+Math.abs(Math.sin(i*3.7))*1.5,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
  // Wear/scratch marks
  for (let i=0;i<12;i++) {
    const sx=(Math.sin(i*9.1)*0.5+0.5)*size; const sy=(Math.cos(i*7.3)*0.5+0.5)*size;
    ctx.strokeStyle=`rgba(50,54,35,${0.25+Math.abs(Math.sin(i*2.1))*0.2})`; ctx.lineWidth=0.7;
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+Math.sin(i*2.3)*18, sy+Math.cos(i*1.7)*8); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,2); return t;
}

// ─── Photorealistic Weapon Models ─────────────────────────────────────────────
function WeaponModel({ weaponRef }: { weaponRef: React.MutableRefObject<WeaponType> }) {
  const gunTex  = useMemo(() => makeGunmetalTex(128), []);
  const gripTex = useMemo(() => makeGripTex(64), []);
  const tubeTex = useMemo(() => makeTubeTex(128), []);

  // Tick to read current weapon each frame
  const wRef = useRef<WeaponType>(weaponRef.current);
  useFrame(() => { wRef.current = weaponRef.current; });
  const w = wRef.current;

  // ── Shared material constructors ──────────────────────────────────────────
  const M = (color: string, rough: number, metal: number, tex?: THREE.CanvasTexture) => (
    <meshStandardMaterial color={color} roughness={rough} metalness={metal}
      map={tex} depthTest={false} />
  );

  // Gunmetal: near-black steel with scratch map
  const GM  = M("#18181A", 0.20, 0.92, gunTex);
  // Parkerized steel: matte dark
  const PKZ = M("#222224", 0.42, 0.78, gunTex);
  // Polymer frame
  const POL = M("#131310", 0.68, 0.05);
  // Rubber grip
  const GRP = <meshStandardMaterial color="#120F0A" roughness={0.82} metalness={0.04}
    map={gripTex} depthTest={false} />;
  // Brass
  const BRS = M("#8A6830", 0.28, 0.88);
  // OD green tube
  const OD  = <meshStandardMaterial color="#2E3020" roughness={0.75} metalness={0.18}
    map={tubeTex} depthTest={false} />;

  const RO = 999;
  const P2 = Math.PI / 2;

  // ── PISTOL — detailed 9mm semi-auto ──────────────────────────────────────
  if (w === "pistol") return (
    <group renderOrder={RO}>
      {/* Frame / lower receiver */}
      <mesh position={[0, 0, 0.06]} renderOrder={RO}>
        <boxGeometry args={[0.062, 0.068, 0.20]} />{POL}
      </mesh>
      {/* Slide — slightly wider, rides above frame */}
      <mesh position={[0, 0.020, -0.02]} renderOrder={RO}>
        <boxGeometry args={[0.060, 0.052, 0.255]} />{GM}
      </mesh>
      {/* Slide serrations (rear) — tiny ridges */}
      {[-0.100, -0.114, -0.128].map((z, i) => (
        <mesh key={i} position={[0, 0.020, z]} renderOrder={RO}>
          <boxGeometry args={[0.062, 0.054, 0.006]} />{PKZ}
        </mesh>
      ))}
      {/* Barrel — extends forward past slide */}
      <mesh position={[0, 0.018, -0.175]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.018, 0.020, 0.285, 10]} />{GM}
      </mesh>
      {/* Muzzle crown — slight flare */}
      <mesh position={[0, 0.018, -0.320]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.022, 0.018, 0.022, 10]} />{PKZ}
      </mesh>
      {/* Ejection port opening (dark slot on right side of slide) */}
      <mesh position={[0.030, 0.022, -0.008]} renderOrder={RO}>
        <boxGeometry args={[0.005, 0.022, 0.065]} />
        <meshStandardMaterial color="#080808" depthTest={false} />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.048, -0.290]} renderOrder={RO}>
        <boxGeometry args={[0.006, 0.014, 0.006]} />{GM}
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.048, -0.086]} renderOrder={RO}>
        <boxGeometry args={[0.028, 0.012, 0.008]} />{GM}
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.018, 0.024]} rotation={[0.18,0,0]} renderOrder={RO}>
        <torusGeometry args={[0.024, 0.005, 6, 14, Math.PI * 1.05]} />
        <meshStandardMaterial color="#181818" metalness={0.75} roughness={0.30} depthTest={false} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.024, 0.030]} rotation={[0.35,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.005, 0.022, 0.008]} />{BRS}
      </mesh>
      {/* Grip (polymer) */}
      <mesh position={[0, -0.072, 0.088]} rotation={[-0.22,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.052, 0.128, 0.072]} />{GRP}
      </mesh>
      {/* Grip backstrap */}
      <mesh position={[0, -0.068, 0.124]} rotation={[-0.10,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.048, 0.115, 0.010]} />{GRP}
      </mesh>
      {/* Magazine base plate */}
      <mesh position={[0, -0.135, 0.094]} renderOrder={RO}>
        <boxGeometry args={[0.050, 0.012, 0.070]} />{GM}
      </mesh>
      {/* Picatinny rail underbarrel */}
      <mesh position={[0, -0.012, -0.085]} renderOrder={RO}>
        <boxGeometry args={[0.046, 0.008, 0.100]} />{PKZ}
      </mesh>
    </group>
  );

  // ── MACHINE GUN — M4-style assault carbine ────────────────────────────────
  if (w === "machinegun") return (
    <group renderOrder={RO}>
      {/* Lower receiver */}
      <mesh position={[0, 0, 0.085]} renderOrder={RO}>
        <boxGeometry args={[0.068, 0.080, 0.220]} />{POL}
      </mesh>
      {/* Upper receiver */}
      <mesh position={[0, 0.052, -0.010]} renderOrder={RO}>
        <boxGeometry args={[0.062, 0.058, 0.280]} />{GM}
      </mesh>
      {/* Charging handle */}
      <mesh position={[0, 0.086, -0.136]} renderOrder={RO}>
        <boxGeometry args={[0.014, 0.018, 0.030]} />{PKZ}
      </mesh>
      {/* Handguard — M-LOK style with flat sides */}
      <mesh position={[0, 0.030, -0.200]} renderOrder={RO}>
        <boxGeometry args={[0.068, 0.068, 0.220]} />{PKZ}
      </mesh>
      {/* Handguard top rail */}
      <mesh position={[0, 0.068, -0.200]} renderOrder={RO}>
        <boxGeometry args={[0.028, 0.010, 0.220]} />{GM}
      </mesh>
      {/* M-LOK slots on handguard sides */}
      {[-0.14,-0.08,-0.02,0.04,0.10].map((z,i) => (
        <mesh key={i} position={[0.036, 0.030, z]} renderOrder={RO}>
          <boxGeometry args={[0.005, 0.016, 0.020]} />
          <meshStandardMaterial color="#0A0A0C" depthTest={false} />
        </mesh>
      ))}
      {/* Barrel — chrome-lined 14.5" */}
      <mesh position={[0, 0.030, -0.380]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.016, 0.019, 0.390, 10]} />{GM}
      </mesh>
      {/* Flash hider — A2 style */}
      <mesh position={[0, 0.030, -0.580]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.024, 0.016, 0.052, 5]} />{PKZ}
      </mesh>
      <mesh position={[0, 0.030, -0.606]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.016, 0.024, 0.008, 5]} />{GM}
      </mesh>
      {/* Gas block */}
      <mesh position={[0, 0.050, -0.310]} renderOrder={RO}>
        <boxGeometry args={[0.028, 0.024, 0.030]} />{GM}
      </mesh>
      {/* Front sight post */}
      <mesh position={[0, 0.082, -0.498]} renderOrder={RO}>
        <boxGeometry args={[0.007, 0.018, 0.007]} />{GM}
      </mesh>
      {/* Rear BUIS sight */}
      <mesh position={[0, 0.082, -0.078]} renderOrder={RO}>
        <boxGeometry args={[0.030, 0.020, 0.012]} />{GM}
      </mesh>
      {/* Magazine — 30-round STANAG */}
      <mesh position={[0, -0.070, 0.048]} rotation={[0.08,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.050, 0.165, 0.048]} />{POL}
      </mesh>
      {/* Magazine follower (brass tip) */}
      <mesh position={[0, -0.072-0.082, 0.048+0.008]} rotation={[0.08,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.048, 0.012, 0.046]} />{BRS}
      </mesh>
      {/* Pistol grip */}
      <mesh position={[0, -0.070, 0.168]} rotation={[-0.15,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.044, 0.110, 0.048]} />{GRP}
      </mesh>
      {/* Buffer tube */}
      <mesh position={[0, 0.012, 0.232]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.020, 0.020, 0.095, 8]} />{PKZ}
      </mesh>
      {/* Stock body */}
      <mesh position={[0, -0.004, 0.290]} renderOrder={RO}>
        <boxGeometry args={[0.044, 0.062, 0.100]} />{POL}
      </mesh>
      {/* Butt pad */}
      <mesh position={[0, -0.004, 0.340]} renderOrder={RO}>
        <boxGeometry args={[0.042, 0.060, 0.010]} />{GRP}
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.018, 0.130]} rotation={[0.12,0,0]} renderOrder={RO}>
        <torusGeometry args={[0.022, 0.005, 5, 14, Math.PI * 1.0]} />
        <meshStandardMaterial color="#141414" metalness={0.65} roughness={0.38} depthTest={false} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.026, 0.132]} rotation={[0.30,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.005, 0.022, 0.008]} />{BRS}
      </mesh>
      {/* Foregrip */}
      <mesh position={[0, -0.048, -0.190]} rotation={[0.05,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.044, 0.090, 0.042]} />{GRP}
      </mesh>
    </group>
  );

  // ── BAZOOKA — RPG-7 style shoulder-fired rocket launcher ─────────────────
  return (
    <group renderOrder={RO}>
      {/* Main launch tube — 40mm bore */}
      <mesh position={[0, 0, -0.080]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.060, 0.066, 0.820, 12]} />{OD}
      </mesh>
      {/* Front bell — flares out for venturi */}
      <mesh position={[0, 0, -0.498]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.075, 0.060, 0.060, 12]} />{OD}
      </mesh>
      {/* Rear blast cone */}
      <mesh position={[0, 0, 0.340]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.055, 0.080, 0.075, 12]} />{OD}
      </mesh>
      {/* Blast shield ring x3 */}
      {[-0.30, -0.06, 0.22].map((z, i) => (
        <mesh key={i} position={[0, 0, z]} rotation={[P2,0,0]} renderOrder={RO}>
          <torusGeometry args={[0.068, 0.010, 6, 14]} />
          <meshStandardMaterial color="#404535" metalness={0.55} roughness={0.62} depthTest={false} />
        </mesh>
      ))}
      {/* Shoulder rest */}
      <mesh position={[0, 0.090, 0.080]} renderOrder={RO}>
        <boxGeometry args={[0.200, 0.048, 0.200]} />{GRP}
      </mesh>
      <mesh position={[0, 0.072, 0.080]} renderOrder={RO}>
        <boxGeometry args={[0.180, 0.018, 0.180]} />{OD}
      </mesh>
      {/* Trigger housing */}
      <mesh position={[0, -0.042, 0.070]} renderOrder={RO}>
        <boxGeometry args={[0.055, 0.072, 0.095]} />{OD}
      </mesh>
      {/* Pistol grip */}
      <mesh position={[0, -0.115, 0.055]} rotation={[-0.12,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.042, 0.110, 0.044]} />{GRP}
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.052, 0.035]} rotation={[0.42,0,0]} renderOrder={RO}>
        <boxGeometry args={[0.005, 0.025, 0.009]} />{BRS}
      </mesh>
      {/* Optical sight body */}
      <mesh position={[0, 0.090, -0.040]} renderOrder={RO}>
        <boxGeometry args={[0.038, 0.040, 0.095]} />{OD}
      </mesh>
      {/* Sight lens — blue glass */}
      <mesh position={[0, 0.090, -0.090]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.014, 0.014, 0.012, 10]} />
        <meshStandardMaterial color="#3A6A9A" roughness={0.04} metalness={0.8}
          transparent opacity={0.7} depthTest={false} />
      </mesh>
      {/* Iron sight bracket */}
      <mesh position={[0, 0.082, -0.300]} renderOrder={RO}>
        <boxGeometry args={[0.008, 0.032, 0.008]} />{GM}
      </mesh>
      <mesh position={[0, 0.098, -0.300]} renderOrder={RO}>
        <boxGeometry args={[0.026, 0.006, 0.006]} />{GM}
      </mesh>
      {/* Warhead (rocket) visible at front */}
      <mesh position={[0, 0, -0.540]} rotation={[P2,0,0]} renderOrder={RO}>
        <cylinderGeometry args={[0.055, 0.055, 0.035, 10]} />
        <meshStandardMaterial color="#8A1A0A" roughness={0.62} metalness={0.35} depthTest={false} />
      </mesh>
      <mesh position={[0, 0, -0.562]} rotation={[P2,0,0]} renderOrder={RO}>
        <coneGeometry args={[0.055, 0.075, 10]} />
        <meshStandardMaterial color="#A82010" roughness={0.58} metalness={0.40} depthTest={false} />
      </mesh>
    </group>
  );
}
