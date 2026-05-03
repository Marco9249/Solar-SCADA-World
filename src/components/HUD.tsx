import { useWeather } from "../context/WeatherContext";

interface Props {
  zombieCount:  number;
  playerHealth: number;
  visible:      boolean;
}

export default function HUD({ zombieCount, playerHealth, visible }: Props) {
  const { weather, isRaining } = useWeather();

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      top: 20, left: 20,
      pointerEvents: "none",
      userSelect: "none",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      zIndex: 150,
    }}>
      {/* Main stats panel */}
      <div style={{
        background: "rgba(4,10,20,0.85)",
        border: "1px solid rgba(100,180,255,0.18)",
        borderRadius: 10,
        padding: "12px 16px",
        backdropFilter: "blur(12px)",
        minWidth: 230,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#5A9FC8",
          letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10,
        }}>
          Solar SCADA — Omdurman
        </div>

        <MetricRow icon="⚡" label="Solar Output"
          value={`${weather.power.toLocaleString()} W`}
          color={weather.mode === "clear" ? "#FFD700" : weather.mode === "fluctuating" ? "#FFA040" : "#FF7070"}
          barVal={weather.power / 11973} />
        <MetricRow icon="☀️" label="Irradiance"
          value={`${weather.irradiance} W/m²`}
          color="#FFB020" barVal={weather.irradiance / 950} />
        <MetricRow icon="💧" label="Flow Rate"
          value={`${weather.flowRate.toFixed(2)} m³/h`}
          color="#4FC3F7" barVal={weather.flowRate / 14.06} />
        <MetricRow icon="🏗️" label="Tank Level"
          value={`${weather.waterLevelTarget.toFixed(2)} m`}
          color="#29B6F6" barVal={weather.waterLevelTarget / 6} />
        <MetricRow icon="🔋" label="Battery SoC"
          value={`${weather.avgSoc}%`}
          color={weather.avgSoc > 60 ? "#66BB6A" : weather.avgSoc > 35 ? "#FFA726" : "#EF5350"}
          barVal={weather.avgSoc / 100} />

        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
          <WeatherDot mode={weather.mode} />
          <span style={{ fontSize: 11, color: "#6A9AB8" }}>
            {weather.label}{isRaining ? " · 🌧 Rain" : ""}
          </span>
        </div>
      </div>

      {/* Combat status panel */}
      <div style={{
        marginTop: 8,
        background: "rgba(4,10,20,0.82)",
        border: "1px solid rgba(255,80,80,0.2)",
        borderRadius: 10,
        padding: "10px 16px",
        backdropFilter: "blur(12px)",
        minWidth: 230,
      }}>
        <div style={{ marginBottom: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#708090" }}>❤️ Health</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: playerHealth > 50 ? "#55CC55" : playerHealth > 25 ? "#FFAA00" : "#FF4444" }}>
              {Math.ceil(playerHealth)}%
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.max(2, playerHealth)}%`,
              background: playerHealth > 50 ? "#44CC44" : playerHealth > 25 ? "#FFAA00" : "#FF3333",
              borderRadius: 2, transition: "width 0.3s, background 0.5s",
            }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#708090" }}>🧟 Zombies</span>
          <span style={{
            fontSize: 14, fontWeight: 800,
            color: zombieCount === 0 ? "#55CC55" : zombieCount < 10 ? "#FFB020" : "#FF4444",
            textShadow: zombieCount > 0 ? "0 0 8px currentColor" : "none",
          }}>
            {zombieCount}
          </span>
        </div>
        {zombieCount === 0 && (
          <div style={{ fontSize: 10, color: "#2A6A3A", marginTop: 4, letterSpacing: 0.3 }}>
            Press [5] to spawn zombies
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div style={{
        marginTop: 6, background: "rgba(4,10,20,0.6)",
        borderRadius: 6, padding: "4px 10px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ fontSize: 10, color: "#2A4A60" }}>
          WASD · Space · Shift · E · Scroll · V weapon · H hud · 6 rain
        </span>
      </div>
    </div>
  );
}

function MetricRow({ icon, label, value, color, barVal }: {
  icon: string; label: string; value: string; color: string; barVal: number;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: "#708090" }}><span style={{ marginRight: 5 }}>{icon}</span>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${Math.max(2, Math.min(100, barVal * 100))}%`,
          background: color, borderRadius: 1, transition: "width 0.8s ease", opacity: 0.8,
        }} />
      </div>
    </div>
  );
}

function WeatherDot({ mode }: { mode: string }) {
  const colors: Record<string, string> = { clear: "#FFD700", fluctuating: "#FFA040", overcast: "#8AABB8" };
  return (
    <div style={{
      width: 7, height: 7, borderRadius: "50%",
      background: colors[mode] ?? "#888",
      boxShadow: `0 0 6px ${colors[mode] ?? "#888"}`,
      flexShrink: 0,
    }} />
  );
}
