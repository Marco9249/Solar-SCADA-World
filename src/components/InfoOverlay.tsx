import { useWeather } from "../context/WeatherContext";

export default function InfoOverlay() {
  const { selected, setSelected } = useWeather();

  if (!selected) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        right: 24,
        transform: "translateY(-50%)",
        background: "rgba(8,18,36,0.92)",
        border: "1px solid rgba(100,180,255,0.35)",
        borderRadius: 14,
        padding: "18px 22px",
        color: "#E8F0FF",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        minWidth: 280,
        maxWidth: 340,
        backdropFilter: "blur(12px)",
        zIndex: 100,
        boxShadow: "0 8px 32px rgba(0,60,120,0.5)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#7EC8E3", lineHeight: 1.3, paddingRight: 12 }}>
          {selected.title}
        </div>
        <button
          onClick={() => setSelected(null)}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 6,
            color: "#8AABB8",
            cursor: "pointer",
            fontSize: 16,
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(100,160,220,0.2)", marginBottom: 12 }} />

      {/* Data lines */}
      {selected.lines.map((line, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 0",
            borderBottom: i < selected.lines.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}
        >
          <span style={{ color: "#8AABB8", fontSize: 12 }}>{line.label}</span>
          <span style={{ color: "#C8E8FF", fontWeight: 600, fontSize: 13, textAlign: "right", maxWidth: 160 }}>
            {line.value}
          </span>
        </div>
      ))}

      {/* Close hint */}
      <div style={{ marginTop: 14, fontSize: 11, color: "#4A6A7A", textAlign: "center" }}>
        Click elsewhere or × to close
      </div>
    </div>
  );
}
