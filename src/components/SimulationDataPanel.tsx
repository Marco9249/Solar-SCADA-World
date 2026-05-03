import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useWeather, SimStep } from "../context/WeatherContext";
import { useImport } from "../context/ImportContext";

interface SimData {
  meta: {
    title: string;
    source: string;
    duration_h: number;
    timestep_min: number;
    steps: number;
    system: { pv_kW: number; tank_m3: number; pump_max_m3h: number; battery_kWh: number };
    columns: string[];
  };
  data: SimStep[];
}

// ── Mini SVG sparkline ────────────────────────────────────────────────────────
function Sparkline({ data, color, w = 120, h = 32 }: { data: number[]; color: string; w?: number; h?: number }) {
  const path = useMemo(() => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const rng = max - min || 1;
    const pts = data.map((v, i) =>
      `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / rng) * (h - 4)}`
    );
    return `M ${pts.join(" L ")}`;
  }, [data, w, h]);

  const fillPath = path + ` L ${w},${h} L 0,${h} Z`;

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg_${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sg_${color.replace("#","")})`} />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Parse CSV helper ──────────────────────────────────────────────────────────
function parseCSV(text: string): SimStep[] {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",").map(s => s.trim());
  const result: SimStep[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(Number);
    if (vals.length < 8) continue;
    const get = (name: string, fb = 0) => {
      const idx = header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
      return idx >= 0 ? vals[idx] : fb;
    };
    result.push({
      t:          get("t_h") || get("time") || i * 0.25,
      irr:        get("irradiance"),
      pv:         get("pv_power") || get("power"),
      soc:        get("soc") || get("battery"),
      tank_level: get("tank_level") || get("tank"),
      pump_rpm:   get("pump_rpm") || get("rpm"),
      flow:       get("flow_rate") || get("flow"),
      temp:       get("temp"),
      mpc_sp:     get("mpc_setpoint") || get("setpoint"),
      fopid_err:  get("fopid_err") || get("error"),
      lstm:       get("lstm_forecast") || get("lstm"),
      wind:       get("wind_speed") || get("wind"),
    });
  }
  return result;
}

const SPEED_OPTIONS = [1, 5, 30, 60, 120, 300];

export default function SimulationDataPanel({ visible }: { visible: boolean }) {
  const { setSimStep, setSimActive } = useWeather();
  const { setObjContent } = useImport();

  const [simData,   setSimData]   = useState<SimData | null>(null);
  const [step,      setStep]      = useState(0);
  const [playing,   setPlaying]   = useState(false);
  const [speed,     setSpeed]     = useState(60);
  const [minimized, setMinimized] = useState(false);
  const [dragOver,  setDragOver]  = useState<"data" | "obj" | null>(null);
  const [objName,   setObjName]   = useState<string | null>(null);
  const [fileName,  setFileName]  = useState<string>("simulation_72h.json");
  const [simOn,     setSimOn]     = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objInputRef  = useRef<HTMLInputElement>(null);

  // Auto-load default simulation data
  useEffect(() => {
    fetch("/data/simulation_72h.json")
      .then(r => r.json())
      .then(d => { setSimData(d); setFileName("simulation_72h.json"); })
      .catch(() => console.warn("Could not load simulation data"));
  }, []);

  // Playback engine (interval drives steps at simulation speed)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing || !simData) return;

    // Each real second = speed × 15 min simulation time
    const stepsPerSec = speed / 15; // steps per real second
    const msPerStep   = 1000 / stepsPerSec;

    intervalRef.current = setInterval(() => {
      setStep(s => {
        const next = (s + 1) % simData.data.length;
        return next;
      });
    }, Math.max(50, msPerStep));

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, simData]);

  // Drive weather context with current step
  useEffect(() => {
    if (!simData || !simOn) return;
    const d = simData.data[step];
    if (d) setSimStep(d);
  }, [step, simData, simOn, setSimStep]);

  // Toggle simulation override
  const toggleSim = useCallback(() => {
    const next = !simOn;
    setSimOn(next);
    setSimActive(next);
    if (!next) setSimStep(null);
  }, [simOn, setSimOn, setSimActive, setSimStep]);

  // Load file (JSON or CSV)
  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileName(file.name);
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          if (parsed.data) {
            setSimData(parsed);
            setStep(0);
          }
        } catch { console.warn("Invalid JSON"); }
      } else if (file.name.endsWith(".csv")) {
        const rows = parseCSV(text);
        if (rows.length > 0) {
          setSimData({
            meta: {
              title: file.name, source: "User imported CSV", duration_h: rows.length * 0.25,
              timestep_min: 15, steps: rows.length,
              system: { pv_kW: 12.98, tank_m3: 216, pump_max_m3h: 14.06, battery_kWh: 48 },
              columns: [],
            },
            data: rows,
          });
          setStep(0);
        }
      }
    };
    reader.readAsText(file);
  }, []);

  // Load OBJ file
  const loadOBJ = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setObjContent(e.target?.result as string, file.name);
      setObjName(file.name);
    };
    reader.readAsText(file);
  }, [setObjContent]);

  const cur = simData?.data[step];
  const totalSteps = simData?.data.length ?? 1;

  // Subsample sparkline data (every 12th point = 3h intervals)
  const spark = useMemo(() => {
    if (!simData) return { irr: [], pv: [], tank: [], soc: [], rpm: [] };
    const sub = (key: keyof SimStep) =>
      simData.data.filter((_, i) => i % 12 === 0).map(d => d[key] as number);
    return {
      irr:  sub("irr"),
      pv:   sub("pv"),
      tank: sub("tank_level"),
      soc:  sub("soc"),
      rpm:  sub("pump_rpm"),
    };
  }, [simData]);

  const panelStyle: React.CSSProperties = {
    position:      "fixed",
    bottom:        18,
    left:          18,
    zIndex:        180,
    width:         minimized ? 210 : 310,
    background:    "rgba(4,10,22,0.94)",
    border:        "1px solid rgba(0,200,160,0.25)",
    borderRadius:  12,
    fontFamily:    "'Segoe UI', system-ui, sans-serif",
    color:         "#AAD8CC",
    backdropFilter: "blur(16px)",
    boxShadow:     "0 4px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,160,0.08)",
    overflow:      "hidden",
    transition:    "width 0.25s ease",
    pointerEvents: "auto",
    fontSize:      11,
  };

  if (!visible) return null;

  return (
    <div style={panelStyle}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: "1px solid rgba(0,200,160,0.12)",
        background: "rgba(0,30,24,0.6)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: simOn ? "#00E8B0" : "#556677", boxShadow: simOn ? "0 0 6px #00E8B0" : "none" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#88CCBB", letterSpacing: 0.8 }}>
            SCADA SIMULATION
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={toggleSim} style={{
            background: simOn ? "rgba(0,200,140,0.18)" : "rgba(80,100,120,0.18)",
            border: `1px solid ${simOn ? "rgba(0,200,140,0.4)" : "rgba(80,120,140,0.25)"}`,
            borderRadius: 4, padding: "2px 8px", color: simOn ? "#00E8B0" : "#6699AA",
            fontSize: 9, cursor: "pointer", letterSpacing: 0.5,
          }}>
            {simOn ? "● LIVE" : "○ OFF"}
          </button>
          <button onClick={() => setMinimized(m => !m)} style={{
            background: "none", border: "none", color: "#4477AA",
            cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "0 2px",
          }}>
            {minimized ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* ── Playback controls ── */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {/* Time info */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ color: "#557799" }}>
                {cur ? `T + ${cur.t.toFixed(2)} h` : "—"}
              </span>
              <span style={{ color: "#4477AA" }}>
                {simData ? `${fileName}` : "No data"}
              </span>
            </div>

            {/* Seek bar */}
            <input
              type="range" min={0} max={totalSteps - 1} value={step}
              onChange={e => setStep(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#00C8A0", cursor: "pointer", marginBottom: 5 }}
            />

            {/* Play / Pause / Speed */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <button
                onClick={() => setPlaying(p => !p)}
                disabled={!simData}
                style={{
                  background: playing ? "rgba(0,180,120,0.22)" : "rgba(0,120,180,0.18)",
                  border: "1px solid rgba(0,200,160,0.3)",
                  borderRadius: 5, padding: "3px 14px", color: "#00DDB0",
                  fontSize: 14, cursor: "pointer", minWidth: 38,
                }}
              >
                {playing ? "⏸" : "▶"}
              </button>
              <button onClick={() => setStep(0)} style={{
                background: "none", border: "1px solid rgba(80,120,140,0.25)", borderRadius: 5,
                padding: "3px 8px", color: "#4477AA", fontSize: 11, cursor: "pointer",
              }}>
                ↩
              </button>
              <span style={{ color: "#33667A", marginLeft: 4 }}>×</span>
              {SPEED_OPTIONS.map(s => (
                <button key={s} onClick={() => setSpeed(s)} style={{
                  background: speed === s ? "rgba(0,200,160,0.18)" : "none",
                  border: `1px solid ${speed === s ? "rgba(0,200,160,0.4)" : "rgba(80,120,140,0.2)"}`,
                  borderRadius: 4, padding: "2px 5px",
                  color: speed === s ? "#00DDB0" : "#445566",
                  fontSize: 9, cursor: "pointer",
                }}>
                  {s >= 60 ? `${s/60}h` : `${s}m`}
                </button>
              ))}
            </div>
          </div>

          {/* ── Live metrics ── */}
          {cur && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px" }}>
                {[
                  { label: "☀️ Irradiance",  val: `${cur.irr} W/m²`,          color: "#FFD020" },
                  { label: "⚡ PV Power",    val: `${(cur.pv/1000).toFixed(2)} kW`, color: "#FFB020" },
                  { label: "💧 Tank Level",  val: `${cur.tank_level.toFixed(2)} m`, color: "#40C8FF" },
                  { label: "🔋 Battery SoC", val: `${cur.soc.toFixed(1)}%`,    color: cur.soc > 60 ? "#44CC88" : cur.soc > 35 ? "#FFAA22" : "#FF4444" },
                  { label: "🔄 Pump RPM",    val: `${cur.pump_rpm}`,           color: "#88CCFF" },
                  { label: "🌊 Flow Rate",   val: `${cur.flow.toFixed(2)} m³/h`, color: "#44BBDD" },
                  { label: "🌡️ Temp",        val: `${cur.temp.toFixed(1)} °C`, color: "#FF8844" },
                  { label: "🎯 MPC Setpt",   val: `${cur.mpc_sp.toFixed(2)} m`, color: "#AA88FF" },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div style={{ color: "#3A5A6A", fontSize: 9 }}>{label}</div>
                    <div style={{ color, fontWeight: 700, fontSize: 11 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* FOPID error + LSTM forecast */}
              <div style={{ marginTop: 6, display: "flex", gap: 10, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 5 }}>
                <div>
                  <div style={{ color: "#3A5A6A", fontSize: 9 }}>FOPID Error</div>
                  <div style={{ color: Math.abs(cur.fopid_err) < 0.1 ? "#44CC88" : "#FF8844", fontWeight: 700 }}>
                    {cur.fopid_err > 0 ? "+" : ""}{cur.fopid_err.toFixed(3)} m
                  </div>
                </div>
                <div>
                  <div style={{ color: "#3A5A6A", fontSize: 9 }}>LSTM Forecast</div>
                  <div style={{ color: "#88BBFF", fontWeight: 700 }}>{cur.lstm} W/m²</div>
                </div>
                <div>
                  <div style={{ color: "#3A5A6A", fontSize: 9 }}>Wind</div>
                  <div style={{ color: "#AACCEE", fontWeight: 700 }}>{cur.wind.toFixed(1)} m/s</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Sparkline charts ── */}
          {simData && (
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 9, color: "#2A4A5A", marginBottom: 5, letterSpacing: 0.5 }}>72-HOUR TRENDS</div>
              {[
                { label: "Solar Irradiance",  data: spark.irr,  color: "#FFD020", unit: "W/m²" },
                { label: "Tank Level",         data: spark.tank, color: "#40C8FF", unit: "m"    },
                { label: "Battery SoC",        data: spark.soc,  color: "#44CC88", unit: "%"    },
                { label: "Pump RPM",           data: spark.rpm,  color: "#88CCFF", unit: "rpm"  },
              ].map(({ label, data, color, unit }) => (
                <div key={label} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                    <span style={{ color: "#3A5A72", fontSize: 9 }}>{label}</span>
                    <span style={{ color, fontSize: 9 }}>
                      {data[Math.floor(step / 12)]?.toFixed(1)} {unit}
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <Sparkline data={data} color={color} w={274} h={28} />
                    {/* Step indicator */}
                    <div style={{
                      position: "absolute", top: 0, bottom: 0,
                      left: `${(step / (totalSteps - 1)) * 100}%`,
                      width: 1.5, background: "rgba(255,255,255,0.4)",
                      pointerEvents: "none",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── File Import ── */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 9, color: "#2A4A5A", marginBottom: 6, letterSpacing: 0.5 }}>DATA IMPORT</div>

            {/* CSV / JSON drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver("data"); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault(); setDragOver(null);
                const file = e.dataTransfer.files[0];
                if (file) loadFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1px dashed ${dragOver === "data" ? "#00E8B0" : "rgba(0,180,140,0.3)"}`,
                borderRadius: 6, padding: "7px 10px", cursor: "pointer",
                background: dragOver === "data" ? "rgba(0,200,160,0.08)" : "rgba(0,30,24,0.3)",
                textAlign: "center", marginBottom: 5, transition: "all 0.2s",
              }}
            >
              <div style={{ color: dragOver === "data" ? "#00E8B0" : "#338877" }}>
                📂 Drop CSV / JSON
              </div>
              <div style={{ color: "#224433", fontSize: 9, marginTop: 2 }}>
                MATLAB · Python · Simulink output
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.json" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />

            {/* OBJ drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver("obj"); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault(); setDragOver(null);
                const file = e.dataTransfer.files[0];
                if (file && file.name.endsWith(".obj")) loadOBJ(file);
              }}
              onClick={() => objInputRef.current?.click()}
              style={{
                border: `1px dashed ${dragOver === "obj" ? "#4499FF" : "rgba(60,100,180,0.28)"}`,
                borderRadius: 6, padding: "7px 10px", cursor: "pointer",
                background: dragOver === "obj" ? "rgba(60,100,200,0.08)" : "rgba(4,14,30,0.3)",
                textAlign: "center", transition: "all 0.2s",
              }}
            >
              <div style={{ color: dragOver === "obj" ? "#4499FF" : "#334466" }}>
                🧱 Drop OBJ / CAD File
              </div>
              <div style={{ color: "#223344", fontSize: 9, marginTop: 2 }}>
                {objName ? `✓ ${objName}` : "Wavefront OBJ format"}
              </div>
            </div>
            <input ref={objInputRef} type="file" accept=".obj" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) loadOBJ(f); }} />
          </div>

          {/* ── System info ── */}
          {simData?.meta && (
            <div style={{ padding: "6px 12px" }}>
              <div style={{ fontSize: 8, color: "#1A3040", lineHeight: 1.5 }}>
                {simData.meta.source}<br />
                {simData.meta.steps} steps · {simData.meta.timestep_min}min · {simData.meta.duration_h}h
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
