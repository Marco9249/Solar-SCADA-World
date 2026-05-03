import { useWeather, WeatherMode, WEATHER_PROFILES } from "../context/WeatherContext";

const modes: WeatherMode[] = ["clear", "fluctuating", "overcast"];

const icons: Record<WeatherMode, string> = {
  clear: "☀️",
  fluctuating: "⛅",
  overcast: "☁️",
};

interface Props {
  visible: boolean;
}

export default function WeatherSelector({ visible }: Props) {
  const { weather, setWeatherMode } = useWeather();

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: `translateX(-50%) translateY(${visible ? "0" : "110px"})`,
      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      display: "flex",
      gap: 12,
      background: "rgba(6,14,28,0.92)",
      borderRadius: 16,
      padding: "12px 18px",
      border: "1px solid rgba(100,160,220,0.25)",
      backdropFilter: "blur(12px)",
      userSelect: "none",
      zIndex: 150,
      pointerEvents: visible ? "auto" : "none",
    }}>
      {/* Toggle hint */}
      <div style={{
        position: "absolute",
        top: -22,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 10,
        color: "rgba(100,160,200,0.6)",
        letterSpacing: 0.5,
        whiteSpace: "nowrap",
        fontFamily: "system-ui",
      }}>
        [4] Toggle  ·  [1] Clear  ·  [2] Fluctuating  ·  [3] Overcast
      </div>

      <div style={{ color: "#7EC8E3", fontSize: 12, fontWeight: 600, alignSelf: "center", marginRight: 4, fontFamily: "system-ui" }}>
        Weather
      </div>
      {modes.map((m, idx) => {
        const profile = WEATHER_PROFILES[m];
        const active = weather.mode === m;
        return (
          <button
            key={m}
            onClick={() => setWeatherMode(m)}
            style={{
              background: active ? "rgba(80,140,220,0.35)" : "rgba(255,255,255,0.06)",
              border: active ? "1.5px solid rgba(100,180,255,0.7)" : "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "8px 14px",
              cursor: "pointer",
              color: active ? "#AADCFF" : "#8AABB8",
              fontFamily: "system-ui",
              fontSize: 12,
              fontWeight: active ? 700 : 400,
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              minWidth: 90,
              position: "relative",
            }}
          >
            {/* Keyboard shortcut badge */}
            <div style={{
              position: "absolute",
              top: 3, right: 5,
              fontSize: 9,
              color: active ? "#5A9FC8" : "#3A5A70",
              fontWeight: 700,
            }}>
              [{idx + 1}]
            </div>
            <span style={{ fontSize: 20 }}>{icons[m]}</span>
            <span style={{ fontSize: 11 }}>{profile.label}</span>
            <span style={{ fontSize: 10, color: active ? "#7EC8E3" : "#5A7A8A", fontWeight: 400 }}>
              {profile.irradiance} W/m²
            </span>
          </button>
        );
      })}
    </div>
  );
}
