import { useEffect, useRef, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { heightAt } from "../utils/terrain";
import { useWeather } from "../context/WeatherContext";

const OBSTACLES = [
  { x: 18, z: 2,   r: 4.2 },
  { x: 2,  z: -8,  r: 5.5 },
  { x: -22,z: -8,  r: 7   },
  { x: -14,z: -20, r: 3.5 },
  { x: 10, z: 2,   r: 3   },
  { x: 14, z: 14,  r: 3   },
];

const INTERACTIVES = [
  { x: -22, z: -8,  r: 9,  label: "Inspect Solar Array",      type: "solar"   },
  { x: 2,   z: -8,  r: 7,  label: "Inspect Control Cabinets", type: "mpc"     },
  { x: -14, z: -20, r: 6,  label: "Inspect Weather Station",  type: "aiNode"  },
  { x: 18,  z: 2,   r: 6,  label: "Inspect Water Tank",       type: "tank"    },
  { x: 10,  z: 2,   r: 5,  label: "Inspect Pump System",      type: "pump"    },
  { x: 14,  z: 14,  r: 5,  label: "Inspect Battery Bank",     type: "battery" },
];

const SPEED_WALK    = 5.5;
const SPEED_RUN     = 11.0;
const PLAYER_HEIGHT = 1.72;
const MOUSE_SENS    = 0.0018;
const GRAVITY       = 22.0;
const JUMP_VELOCITY = 7.5;

interface Props {
  onLockChange:       (locked: boolean) => void;
  onInteractZone:     (label: string, type?: string | null) => void;
  requestLockRef:     React.MutableRefObject<(() => void) | null>;
  onWeatherKey?:      (key: "1" | "2" | "3") => void;
  onWeatherToggle?:   () => void;
  onRainToggle?:      () => void;
  onWeaponToggle?:    () => void;
  onHUDToggle?:       () => void;
  onCombatUIToggle?:  () => void;
  onAllUIToggle?:     () => void;
}

export default function FirstPersonController({
  onLockChange, onInteractZone, requestLockRef,
  onWeatherKey, onWeatherToggle, onRainToggle,
  onWeaponToggle, onHUDToggle, onCombatUIToggle, onAllUIToggle,
}: Props) {
  const { camera, gl } = useThree();
  const { setSelected } = useWeather();

  // ── Synthetic lock — works even when pointer lock API is blocked (iframes) ──
  const syntheticLocked = useRef(false);
  const hasPL           = useRef(false);   // whether real pointer lock is active
  const lastMousePos    = useRef({ x: -1, y: -1 });

  const euler        = useRef(new THREE.Euler(0, Math.PI, 0, "YXZ"));
  const keys         = useRef({ w: false, s: false, a: false, d: false, shift: false, e: false });
  const velocity     = useRef(new THREE.Vector3());
  const direction    = useRef(new THREE.Vector3());
  const rightVec     = useRef(new THREE.Vector3());
  const prevInteract = useRef<string | null>(null);
  const lastInteract = useRef(0);
  const jumpVel      = useRef(0);
  const isOnGround   = useRef(true);
  const bobAccum     = useRef(0);
  const bobAmt       = useRef(0);

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, -35);
    euler.current.set(-0.1, Math.PI, 0);
    camera.quaternion.setFromEuler(euler.current);
  }, [camera]);

  // ── Acquire lock (synthetic + optional real pointer lock) ─────────────────
  const acquireLock = useCallback(() => {
    syntheticLocked.current = true;
    lastMousePos.current    = { x: -1, y: -1 };
    onLockChange(true);
    // Attempt real pointer lock as an enhancement; ignore if blocked
    gl.domElement.requestPointerLock?.();
  }, [gl, onLockChange]);

  const releaseLock = useCallback(() => {
    syntheticLocked.current = false;
    hasPL.current           = false;
    onLockChange(false);
    try { document.exitPointerLock?.(); } catch { /* ignore */ }
  }, [onLockChange]);

  // Expose acquireLock so App.tsx can call it on start / resume
  useEffect(() => {
    requestLockRef.current = acquireLock;
  }, [acquireLock, requestLockRef]);

  const onLockChange_cb = useCallback((locked: boolean) => onLockChange(locked), [onLockChange]);

  useEffect(() => {
    const canvas = gl.domElement;

    // ── Mouse move: use movementX when PL active, else manual delta ──────────
    const onMouseMove = (e: MouseEvent) => {
      if (!syntheticLocked.current) return;

      let dx: number;
      let dy: number;

      if (hasPL.current) {
        dx = e.movementX;
        dy = e.movementY;
      } else {
        if (lastMousePos.current.x < 0) {
          lastMousePos.current = { x: e.clientX, y: e.clientY };
          return;
        }
        dx = e.clientX - lastMousePos.current.x;
        dy = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }

      euler.current.y -= dx * MOUSE_SENS;
      euler.current.x -= dy * MOUSE_SENS;
      euler.current.x  = Math.max(-1.25, Math.min(1.25, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    // ── Pointer lock change (real PL acquired/lost) ──────────────────────────
    const onPLChange = () => {
      hasPL.current = document.pointerLockElement === canvas;
    };

    // ── Canvas click: acquire synthetic lock ─────────────────────────────────
    const onCanvasClick = () => {
      if (!syntheticLocked.current) acquireLock();
    };

    // ── Keyboard ──────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":        keys.current.w     = true;  break;
        case "KeyS":        keys.current.s     = true;  break;
        case "KeyA":        keys.current.a     = true;  break;
        case "KeyD":        keys.current.d     = true;  break;
        case "ShiftLeft": case "ShiftRight":
                            keys.current.shift = true;  break;
        case "KeyE":        keys.current.e     = true;  break;
        case "Space":
          e.preventDefault();
          if (syntheticLocked.current && isOnGround.current) {
            jumpVel.current    = JUMP_VELOCITY;
            isOnGround.current = false;
          }
          break;
        case "Escape":
          releaseLock();
          break;
        case "Digit1": if (syntheticLocked.current) onWeatherKey?.("1");       break;
        case "Digit2": if (syntheticLocked.current) onWeatherKey?.("2");       break;
        case "Digit3": if (syntheticLocked.current) onWeatherKey?.("3");       break;
        case "Digit4": if (syntheticLocked.current) onWeatherToggle?.();       break;
        case "Digit6": if (syntheticLocked.current) onRainToggle?.();          break;
        case "KeyV":   if (syntheticLocked.current) onWeaponToggle?.();        break;
        case "KeyH":   if (syntheticLocked.current) onHUDToggle?.();           break;
        case "Digit0": if (syntheticLocked.current) onCombatUIToggle?.();      break;
        case "Digit9": if (syntheticLocked.current) onAllUIToggle?.();         break;
      }
      if (e.code === "KeyE" && syntheticLocked.current) triggerInteract();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":        keys.current.w     = false; break;
        case "KeyS":        keys.current.s     = false; break;
        case "KeyA":        keys.current.a     = false; break;
        case "KeyD":        keys.current.d     = false; break;
        case "ShiftLeft": case "ShiftRight":
                            keys.current.shift = false; break;
        case "KeyE":        keys.current.e     = false; break;
      }
    };

    document.addEventListener("mousemove",        onMouseMove);
    document.addEventListener("pointerlockchange", onPLChange);
    document.addEventListener("keydown",           onKeyDown);
    document.addEventListener("keyup",             onKeyUp);
    canvas.addEventListener("click",               onCanvasClick);

    return () => {
      document.removeEventListener("mousemove",        onMouseMove);
      document.removeEventListener("pointerlockchange", onPLChange);
      document.removeEventListener("keydown",           onKeyDown);
      document.removeEventListener("keyup",             onKeyUp);
      canvas.removeEventListener("click",               onCanvasClick);
    };
  }, [camera, gl, acquireLock, releaseLock, onLockChange_cb,
      onWeatherKey, onWeatherToggle, onRainToggle,
      onWeaponToggle, onHUDToggle, onCombatUIToggle, onAllUIToggle]);

  function triggerInteract() {
    const now = Date.now();
    if (now - lastInteract.current < 400) return;
    lastInteract.current = now;
    const px = camera.position.x, pz = camera.position.z;
    for (const zone of INTERACTIVES) {
      const dx = px - zone.x, dz = pz - zone.z;
      if (Math.sqrt(dx * dx + dz * dz) < zone.r) { openInfoForType(zone.type); return; }
    }
  }

  function openInfoForType(type: string) {
    const dataMap: Record<string, Parameters<typeof setSelected>[0]> = {
      solar:   { type: "solar",   title: "PV Array — 12.98 kW",
        lines: [
          { label: "Config",        value: "2 strings × 11 × 590 W" },
          { label: "Cell Type",     value: "Mono-Si, 21.3% η" },
          { label: "Max Output",    value: "11,973 W" },
          { label: "Array Voltage", value: "440 V DC" },
        ]},
      mpc:     { type: "mpc",     title: "Control Room — MPC & FOPID",
        lines: [
          { label: "MPC Horizon",   value: "300 steps" },
          { label: "Update Rate",   value: "60 s" },
          { label: "FOPID α/β",    value: "0.85 / 0.92" },
          { label: "AI RMSE",       value: "19.53 W/m²" },
        ]},
      aiNode:  { type: "aiNode",  title: "Weather Station & Edge AI",
        lines: [
          { label: "GHI Sensor",    value: "ISO 9060 Class A" },
          { label: "AI Model",      value: "Physics-Guided LSTM" },
          { label: "Quantization",  value: "8-bit INT" },
          { label: "Pruning",       value: "40% sparsity" },
        ]},
      tank:    { type: "tank",    title: "Water Storage Tank",
        lines: [
          { label: "Area",          value: "36 m²" },
          { label: "Max Height",    value: "6.0 m" },
          { label: "Max Volume",    value: "216 m³" },
        ]},
      pump:    { type: "pump",    title: "Centrifugal Pump & VFD",
        lines: [
          { label: "Pump Type",     value: "Centrifugal volute" },
          { label: "VFD Range",     value: "10 – 50 Hz" },
          { label: "Max Flow",      value: "14.06 m³/h" },
        ]},
      battery: { type: "battery", title: "Battery Bank",
        lines: [
          { label: "Capacity",      value: "48 kWh" },
          { label: "Chemistry",     value: "VRLA Lead-Acid" },
          { label: "Bus",           value: "48 V DC" },
        ]},
    };
    const info = dataMap[type];
    if (info) {
      setSelected(info);
      releaseLock();
    }
  }

  useFrame((_, delta) => {
    if (!syntheticLocked.current) return;

    const k        = keys.current;
    const speed    = k.shift ? SPEED_RUN : SPEED_WALK;
    const isMoving = k.w || k.s || k.a || k.d;

    direction.current.set(Math.sin(euler.current.y), 0, Math.cos(euler.current.y));
    rightVec.current.set(Math.cos(euler.current.y), 0, -Math.sin(euler.current.y));

    velocity.current.set(0, 0, 0);
    if (k.w) velocity.current.addScaledVector(direction.current, -1);
    if (k.s) velocity.current.addScaledVector(direction.current,  1);
    if (k.a) velocity.current.addScaledVector(rightVec.current,  -1);
    if (k.d) velocity.current.addScaledVector(rightVec.current,   1);
    if (velocity.current.length() > 0) velocity.current.normalize().multiplyScalar(speed * delta);

    let nx = camera.position.x + velocity.current.x;
    let nz = camera.position.z + velocity.current.z;
    nx = Math.max(-155, Math.min(155, nx));
    nz = Math.max(-155, Math.min(155, nz));

    for (const obs of OBSTACLES) {
      const dx   = nx - obs.x, dz = nz - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < obs.r + 0.6) {
        const push = (obs.r + 0.6 - dist) / dist;
        nx += dx * push; nz += dz * push;
      }
    }

    camera.position.x = nx;
    camera.position.z = nz;

    const groundY = heightAt(nx, nz);
    const targetY = groundY + PLAYER_HEIGHT;

    if (!isOnGround.current || camera.position.y > targetY + 0.05) {
      jumpVel.current   -= GRAVITY * delta;
      camera.position.y += jumpVel.current * delta;
      if (camera.position.y <= targetY) {
        camera.position.y  = targetY;
        jumpVel.current    = 0;
        isOnGround.current = true;
      }
    } else {
      camera.position.y  = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 12);
      isOnGround.current = true;
    }

    if (isMoving && isOnGround.current) {
      bobAccum.current += delta * (k.shift ? 14 : 9);
      bobAmt.current    = Math.sin(bobAccum.current) * 0.045;
    } else {
      bobAmt.current *= 0.85;
    }
    if (isOnGround.current) camera.position.y += bobAmt.current;

    const px = camera.position.x, pz = camera.position.z;
    let nearZone: { label: string; type: string } | null = null;
    for (const zone of INTERACTIVES) {
      const dx = px - zone.x, dz = pz - zone.z;
      if (Math.sqrt(dx * dx + dz * dz) < zone.r) { nearZone = zone; break; }
    }
    const zoneKey = nearZone?.type ?? null;
    if (zoneKey !== prevInteract.current) {
      prevInteract.current = zoneKey;
      onInteractZone(nearZone?.label ?? "", zoneKey);
    }
  });

  return null;
}
