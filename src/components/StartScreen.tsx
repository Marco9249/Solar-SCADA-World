import { useEffect } from "react";

interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onStart]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse at 50% 38%, #1A3A5A 0%, #0A1A2A 65%, #050D15 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        userSelect: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 60, marginBottom: 18, filter: "drop-shadow(0 0 22px rgba(255,180,0,0.65))" }}>
        ☀️
      </div>

      <div style={{
        fontSize: 27, fontWeight: 800, color: "#FFFFFF",
        letterSpacing: 0.8, marginBottom: 6,
        textShadow: "0 0 30px rgba(255,200,80,0.5)",
        textAlign: "center",
      }}>
        Solar SCADA — Omdurman, Sudan
      </div>

      <div style={{
        fontSize: 13, color: "#7EC8E3", marginBottom: 28,
        letterSpacing: 2, textTransform: "uppercase",
      }}>
        Interactive 3D World
      </div>

      {/* Big prominent enter button */}
      <button
        onClick={onStart}
        autoFocus
        style={{
          background: "linear-gradient(135deg, #F5A623 0%, #FF6B00 100%)",
          border: "none",
          borderRadius: 14,
          padding: "18px 64px",
          color: "#fff",
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: 1.5,
          cursor: "pointer",
          marginBottom: 28,
          boxShadow: "0 0 40px rgba(245,166,35,0.55), 0 4px 20px rgba(0,0,0,0.5)",
          fontFamily: "inherit",
          animation: "pulse 1.8s ease-in-out infinite",
          outline: "none",
          textTransform: "uppercase",
        }}
      >
        ▶ Enter World
      </button>

      <div style={{
        fontSize: 12, color: "#4A8AAA", marginBottom: 24,
        letterSpacing: 0.5,
      }}>
        Click the button · or press <kbd style={{
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: 4, padding: "1px 7px", fontSize: 11,
          color: "#AAD4EE", fontFamily: "inherit",
        }}>Enter</kbd> · then move mouse to look around
      </div>

      {/* Two-column controls grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 20px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: "16px 24px",
        marginBottom: 20,
        maxWidth: 480,
        width: "90%",
      }}>
        <Key label="W A S D"      desc="Move" />
        <Key label="Mouse"        desc="Look around" />
        <Key label="Shift"        desc="Sprint" />
        <Key label="Space"        desc="Jump" />
        <Key label="E"            desc="Inspect device" />
        <Key label="Esc"          desc="Pause / release" />
        <Key label="1 / 2 / 3"   desc="Clear / Fluctuating / Overcast" />
        <Key label="4"            desc="Toggle weather panel" />
        <Key label="Scroll / Tab" desc="Switch weapon" />
        <Key label="R"            desc="Reload weapon" />
        <Key label="Click"        desc="Shoot" />
        <Key label="5"            desc="Spawn zombie" />
        <Key label="6"            desc="Toggle rain" />
        <Key label="V"            desc="Hide/show weapon" />
        <Key label="H"            desc="Toggle HUD" />
        <Key label="0"            desc="Toggle combat UI" />
        <Key label="9"            desc="Cinematic mode" />
        <Key label="Click ×3"     desc="Bazooka AOE" />
      </div>

      {/* Weapon preview row */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 18,
        fontSize: 12, color: "#6A9AB8", flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {["🔫 Pistol", "💥 Machine Gun", "🚀 Bazooka AOE"].map(w => (
          <div key={w} style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(100,180,255,0.12)",
            borderRadius: 8, padding: "5px 14px",
          }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#2A5A7A", letterSpacing: 0.8, textAlign: "center" }}>
        Solar-Powered Smart Irrigation · Omdurman, Sudan · First-Person 3D
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 40px rgba(245,166,35,0.55), 0 4px 20px rgba(0,0,0,0.5); }
          50%       { transform: scale(1.04); box-shadow: 0 0 60px rgba(245,166,35,0.85), 0 4px 28px rgba(0,0,0,0.6); }
        }
        button:hover { filter: brightness(1.12); }
        button:active { transform: scale(0.97) !important; }
      `}</style>
    </div>
  );
}

function Key({ label, desc }: { label: string; desc: string }) {
  return (
    <>
      <div style={{
        background: "rgba(255,255,255,0.09)",
        borderRadius: 5, padding: "3px 10px",
        fontSize: 11, fontWeight: 700, color: "#FFFFFF",
        textAlign: "center", border: "1px solid rgba(255,255,255,0.16)",
        whiteSpace: "nowrap",
      }}>
        {label}
      </div>
      <div style={{ color: "#7AAABB", alignSelf: "center", fontSize: 12 }}>{desc}</div>
    </>
  );
}
