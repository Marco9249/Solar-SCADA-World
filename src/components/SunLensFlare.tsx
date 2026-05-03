import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWeather } from "../context/WeatherContext";

// Sun directions per weather mode (normalised)
const SUN_DIRS: Record<string, THREE.Vector3> = {
  clear:       new THREE.Vector3( 0.545,  0.743, -0.388).normalize(),
  fluctuating: new THREE.Vector3( 0.508,  0.616, -0.602).normalize(),
  overcast:    new THREE.Vector3( 0.469,  0.342, -0.815).normalize(),
};

// Secondary flare ring specs: [lerpT, size, colorRgba]
const RINGS = [
  [0.22, 28, "rgba(180,220,255,0.45)"],
  [0.44, 18, "rgba(255,180,100,0.42)"],
  [0.63, 40, "rgba(155,210,255,0.30)"],
  [0.80, 12, "rgba(255,220,150,0.55)"],
  [1.08, 58, "rgba(175,200,255,0.20)"],
  [1.38, 22, "rgba(255,160,80,0.38)"],
] as const;

/** Lens flare overlay — runs inside Canvas to access camera, but writes HTML imperatively */
export default function SunLensFlare() {
  const { camera } = useThree();
  const { weather } = useWeather();

  // All DOM nodes stored in refs so we can update them in useFrame
  const rootRef   = useRef<HTMLDivElement | null>(null);
  const coronaRef = useRef<HTMLDivElement | null>(null);
  const mainRef   = useRef<HTMLDivElement | null>(null);
  const streakVRef = useRef<HTMLDivElement | null>(null);
  const streakHRef = useRef<HTMLDivElement | null>(null);
  const ringRefs  = useRef<HTMLDivElement[]>([]);
  const weatherRef = useRef(weather.mode);

  // Keep weather ref in sync
  weatherRef.current = weather.mode;

  // Build the entire flare DOM tree once
  useEffect(() => {
    const root = document.createElement("div");
    root.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:500;
      transition: opacity 0.35s ease;
    `;

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      .lf-corona   { position:absolute; border-radius:50%; background:radial-gradient(circle,rgba(255,230,150,0.19)0%,transparent 65%); filter:blur(7px); width:290px; height:290px; transform:translate(-50%,-50%); }
      .lf-main     { position:absolute; border-radius:50%; background:radial-gradient(circle,rgba(255,252,210,0.95)0%,rgba(255,220,100,0.5)30%,rgba(255,180,50,0.14)65%,transparent 82%); filter:blur(2px); width:118px; height:118px; transform:translate(-50%,-50%); }
      .lf-sv       { position:absolute; width:2.5px; height:360px; background:linear-gradient(to bottom,transparent,rgba(255,242,185,0.32)50%,transparent); filter:blur(1px); transform:translate(-50%,-50%); }
      .lf-sh       { position:absolute; width:440px; height:2px;   background:linear-gradient(to right,transparent,rgba(255,242,185,0.26)50%,transparent); filter:blur(1px); transform:translate(-50%,-50%); }
      .lf-ring     { position:absolute; border-radius:50%; border:1.5px solid; transform:translate(-50%,-50%); }
    `;
    document.head.appendChild(styleEl);

    const corona = document.createElement("div"); corona.className = "lf-corona"; root.appendChild(corona);
    const main   = document.createElement("div"); main.className   = "lf-main";   root.appendChild(main);
    const sv     = document.createElement("div"); sv.className     = "lf-sv";     root.appendChild(sv);
    const sh     = document.createElement("div"); sh.className     = "lf-sh";     root.appendChild(sh);

    const rings: HTMLDivElement[] = RINGS.map(([, size, color]) => {
      const el = document.createElement("div");
      el.className = "lf-ring";
      el.style.width  = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderColor = color as string;
      root.appendChild(el);
      return el;
    });

    document.body.appendChild(root);
    rootRef.current   = root;
    coronaRef.current = corona;
    mainRef.current   = main;
    streakVRef.current = sv;
    streakHRef.current = sh;
    ringRefs.current  = rings;

    return () => {
      document.body.removeChild(root);
      document.head.removeChild(styleEl);
    };
  }, []);

  const _proj = new THREE.Vector3();
  const _camDir = new THREE.Vector3();

  useFrame(() => {
    const root   = rootRef.current;
    if (!root || !coronaRef.current) return;

    const sun = SUN_DIRS[weatherRef.current] ?? SUN_DIRS.clear;

    // Project sun direction to NDC
    _proj.copy(sun).project(camera);
    const sx = ( _proj.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-_proj.y * 0.5 + 0.5) * window.innerHeight;

    // Visibility: dot of camera fwd with sun dir, fade when behind
    camera.getWorldDirection(_camDir);
    const dot = Math.max(0, _camDir.dot(sun));
    const vis = _proj.z < 1 ? Math.pow(dot, 2.2) : 0;

    root.style.opacity = String(vis.toFixed(3));
    if (vis < 0.005) return; // skip DOM updates when invisible

    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const dx = sx - cx, dy = sy - cy;

    const pos = (el: HTMLDivElement, x: number, y: number) => {
      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;
    };

    pos(coronaRef.current!,  sx, sy);
    pos(mainRef.current!,    sx, sy);
    pos(streakVRef.current!, sx, sy);
    pos(streakHRef.current!, sx, sy);

    // Secondary rings lie along center→sun axis
    RINGS.forEach(([t], i) => {
      const el = ringRefs.current[i];
      if (el) pos(el, cx + dx * (t as number), cy + dy * (t as number));
    });
  });

  // Nothing rendered in the R3F scene — all output is imperative DOM
  return null;
}
