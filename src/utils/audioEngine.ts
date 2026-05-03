/**
 * Procedural Web Audio Engine — all sounds synthesized, no external files.
 * Weapon fire, reload, shell casings, rain ambience, thunder.
 */

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _rainGain: GainNode | null = null;
let _rainSrc: AudioBufferSourceNode | null = null;
let _thunderTimer = 12;

function ctx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = 1.0;
    _masterGain.connect(_ctx.destination);
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

function master(): GainNode {
  ctx();
  return _masterGain!;
}

// ── Noise buffer (cached per-duration) ───────────────────────────────────────
const _noiseCache = new Map<number, AudioBuffer>();
function noiseBuffer(dur: number): AudioBuffer {
  const c = ctx();
  const key = Math.round(dur * 100);
  if (_noiseCache.has(key)) return _noiseCache.get(key)!;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  _noiseCache.set(key, buf);
  return buf;
}

interface NoiseOpts {
  freq?: number;
  freqEnd?: number;
  q?: number;
  type?: BiquadFilterType;
  attack?: number;
  decay?: number;
  gain?: number;
  delay?: number;
}

function noiseShot(opts: NoiseOpts = {}): void {
  const c = ctx();
  const {
    freq = 1000, freqEnd, q = 1.2, type = "bandpass",
    attack = 0.002, decay = 0.12, gain = 0.6, delay = 0,
  } = opts;

  const dur = attack + decay + 0.05;
  const now = c.currentTime + delay;

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(Math.min(dur + 0.1, 3));

  const filt = c.createBiquadFilter();
  filt.type = type;
  filt.frequency.setValueAtTime(freq, now);
  filt.Q.value = q;
  if (freqEnd !== undefined) filt.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + attack + decay * 0.7);

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(gain, now + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

  src.connect(filt); filt.connect(env); env.connect(master());
  src.start(now); src.stop(now + dur);
}

function toneBurst(freq: number, attack: number, decay: number, gain: number, delay = 0): void {
  const c = ctx();
  const now = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.3), now + decay * 0.8);

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(gain, now + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

  osc.connect(env); env.connect(master());
  osc.start(now); osc.stop(now + attack + decay + 0.02);
}

// ── Weapon sounds ─────────────────────────────────────────────────────────────

export function playPistol(): void {
  try {
    noiseShot({ freq: 4200, freqEnd: 600, q: 0.7, attack: 0.001, decay: 0.10, gain: 1.1 });
    noiseShot({ freq: 280,  freqEnd: 80,  q: 1.4, type: "lowpass", attack: 0.001, decay: 0.16, gain: 0.5 });
    toneBurst(200, 0.001, 0.10, 0.35);
    // High transient snap
    noiseShot({ freq: 8000, q: 0.5, type: "highpass", attack: 0.0005, decay: 0.022, gain: 0.45 });
  } catch (_) { /* audio blocked */ }
}

export function playMachineGun(): void {
  try {
    noiseShot({ freq: 3000, freqEnd: 500, q: 0.8, attack: 0.001, decay: 0.07, gain: 0.85 });
    noiseShot({ freq: 350,  freqEnd: 100, q: 1.2, type: "lowpass", attack: 0.001, decay: 0.10, gain: 0.38 });
    toneBurst(160, 0.001, 0.07, 0.25);
  } catch (_) { /* audio blocked */ }
}

export function playBazooka(): void {
  try {
    // Whoosh launch
    noiseShot({ freq: 1800, freqEnd: 200, q: 0.6, type: "bandpass", attack: 0.005, decay: 0.18, gain: 0.6 });
    // Deep concussion boom
    noiseShot({ freq: 80, freqEnd: 30, q: 0.5, type: "lowpass", attack: 0.008, decay: 1.1, gain: 1.4 });
    toneBurst(55, 0.005, 1.4, 0.9);
    toneBurst(38, 0.01,  2.0, 0.6);
    // Mid crack
    noiseShot({ freq: 1200, freqEnd: 300, q: 0.9, attack: 0.001, decay: 0.28, gain: 0.7, delay: 0.04 });
    // Debris rattle
    noiseShot({ freq: 2500, freqEnd: 800, q: 1.5, attack: 0.002, decay: 0.38, gain: 0.35, delay: 0.12 });
  } catch (_) { /* audio blocked */ }
}

export function playShellCasing(): void {
  try {
    const f = 2800 + Math.random() * 1200;
    toneBurst(f, 0.0005, 0.04 + Math.random() * 0.05, 0.14);
    toneBurst(f * 0.6, 0.001, 0.025, 0.07);
    noiseShot({ freq: 4000, q: 2, type: "highpass", attack: 0.0005, decay: 0.018, gain: 0.12 });
  } catch (_) { /* audio blocked */ }
}

export function playEmptyClick(): void {
  try {
    noiseShot({ freq: 1600, q: 3, attack: 0.001, decay: 0.022, gain: 0.3 });
    toneBurst(900, 0.001, 0.018, 0.12);
  } catch (_) { /* audio blocked */ }
}

export function playWeaponSwitch(): void {
  try {
    noiseShot({ freq: 800, q: 2, attack: 0.002, decay: 0.055, gain: 0.22 });
    toneBurst(550, 0.001, 0.04, 0.15);
  } catch (_) { /* audio blocked */ }
}

export function playReload(weapon: "pistol" | "machinegun" | "bazooka"): void {
  try {
    if (weapon === "pistol") {
      // Mag drop
      noiseShot({ freq: 500, q: 1.5, attack: 0.003, decay: 0.07, gain: 0.35 });
      // Mag insert
      noiseShot({ freq: 650, q: 1.8, attack: 0.003, decay: 0.08, gain: 0.38, delay: 0.32 });
      // Slide rack
      noiseShot({ freq: 1800, freqEnd: 1100, q: 1.2, attack: 0.001, decay: 0.055, gain: 0.52, delay: 0.62 });
      toneBurst(700, 0.001, 0.04, 0.22, 0.62);
    } else if (weapon === "machinegun") {
      noiseShot({ freq: 400, q: 1.4, attack: 0.003, decay: 0.09, gain: 0.4 });
      noiseShot({ freq: 600, q: 1.6, attack: 0.003, decay: 0.07, gain: 0.38, delay: 0.22 });
      noiseShot({ freq: 900, q: 1.5, attack: 0.002, decay: 0.06, gain: 0.42, delay: 0.45 });
      noiseShot({ freq: 1100,freqEnd: 800, q: 1.2, attack: 0.001, decay: 0.05, gain: 0.48, delay: 0.68 });
    } else {
      // Bazooka — heavy mechanical
      noiseShot({ freq: 220, q: 0.8, type: "lowpass", attack: 0.008, decay: 0.22, gain: 0.75 });
      noiseShot({ freq: 300, q: 1.0, type: "lowpass", attack: 0.006, decay: 0.18, gain: 0.65, delay: 0.7 });
    }
  } catch (_) { /* audio blocked */ }
}

// ── Rain & storm ambient ──────────────────────────────────────────────────────

function ensureRainChain(): void {
  const c = ctx();
  if (_rainGain) return;

  _rainGain = c.createGain();
  _rainGain.gain.value = 0;

  const lpf = c.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 3500;
  lpf.Q.value = 0.3;

  const hpf = c.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = 320;
  hpf.Q.value = 0.4;

  // Second noise layer for "hiss" texture
  const lpf2 = c.createBiquadFilter();
  lpf2.type = "bandpass";
  lpf2.frequency.value = 5500;
  lpf2.Q.value = 0.6;

  const hissGain = c.createGain();
  hissGain.gain.value = 0.3;

  _rainGain.connect(lpf);
  lpf.connect(hpf);
  hpf.connect(master());

  _rainGain.connect(lpf2);
  lpf2.connect(hissGain);
  hissGain.connect(master());
}

function ensureRainSource(): void {
  const c = ctx();
  ensureRainChain();
  if (_rainSrc) return;
  const buf = noiseBuffer(4);
  _rainSrc = c.createBufferSource();
  _rainSrc.buffer = buf;
  _rainSrc.loop = true;
  _rainSrc.connect(_rainGain!);
  _rainSrc.start();
}

export function setRainIntensity(intensity: number): void {
  try {
    const c = ctx();
    if (intensity > 0.01) {
      ensureRainSource();
      _rainGain!.gain.setTargetAtTime(intensity * 0.42, c.currentTime, 0.8);
    } else if (_rainGain) {
      _rainGain.gain.setTargetAtTime(0, c.currentTime, 0.5);
    }
  } catch (_) { /* audio blocked */ }
}

export function playThunder(): void {
  try {
    noiseShot({ freq: 50,  freqEnd: 25, q: 0.4, type: "lowpass", attack: 0.02, decay: 3.5, gain: 1.1 });
    noiseShot({ freq: 90,  freqEnd: 45, q: 0.5, type: "lowpass", attack: 0.01, decay: 2.8, gain: 0.7 });
    noiseShot({ freq: 180, freqEnd: 80, q: 0.7, attack: 0.005, decay: 1.2,  gain: 0.45, delay: 0.05 });
    toneBurst(48, 0.015, 3.0, 0.65);
    toneBurst(35, 0.02,  4.0, 0.45);
  } catch (_) { /* audio blocked */ }
}

/** Call from useFrame to tick ambient audio */
export function tickAmbience(delta: number, isRaining: boolean, isStorm: boolean): void {
  if (!isRaining) {
    setRainIntensity(0);
    return;
  }
  setRainIntensity(isStorm ? 0.95 : 0.58);
  if (isStorm) {
    _thunderTimer -= delta;
    if (_thunderTimer <= 0) {
      playThunder();
      _thunderTimer = 9 + Math.random() * 20;
    }
  } else {
    _thunderTimer = 12;
  }
}
