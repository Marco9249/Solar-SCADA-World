import type { WeaponType } from "./CombatSystem";

interface CrosshairProps {
  canInteract:   boolean;
  interactLabel: string;
  weapon:        WeaponType;
  isAiming:      boolean;
  visible:       boolean;
}

export default function Crosshair({ canInteract, interactLabel, weapon, isAiming, visible }: CrosshairProps) {
  if (!visible) return null;

  const color    = canInteract ? "#FFD700" : "rgba(255,255,255,0.88)";

  return (
    <>
      {/* Weapon-specific crosshair */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 200,
      }}>
        {weapon === "pistol" && (
          <svg width="28" height="28" viewBox="0 0 28 28">
            <line x1="14" y1="4" x2="14" y2="9"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="14" y1="19" x2="14" y2="24" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="4"  y1="14" x2="9"  y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="19" y1="14" x2="24" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="14" cy="14" r="1.8" fill={color} />
          </svg>
        )}
        {weapon === "machinegun" && (
          <svg width="36" height="36" viewBox="0 0 36 36">
            <line x1="18" y1="3"  x2="18" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="18" y1="26" x2="18" y2="33" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="3"  y1="18" x2="10" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="26" y1="18" x2="33" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="18" cy="18" r="5"   stroke={color} strokeWidth="1" fill="none" opacity="0.55" />
            <circle cx="18" cy="18" r="1.5" fill={color} />
          </svg>
        )}
        {weapon === "bazooka" && (
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="14" stroke={color} strokeWidth="1.5" fill="none" opacity="0.7" />
            <circle cx="22" cy="22" r="7"  stroke={color} strokeWidth="1"   fill="none" opacity="0.45" />
            <line x1="22" y1="2"  x2="22" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="22" y1="32" x2="22" y2="42" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="2"  y1="22" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="32" y1="22" x2="42" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="22" cy="22" r="2.2" fill={color} />
          </svg>
        )}
      </div>

      {/* Interaction prompt */}
      {canInteract && (
        <div style={{
          position: "fixed", bottom: "37%", left: "50%",
          transform: "translateX(-50%)", pointerEvents: "none", zIndex: 200,
          background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,215,0,0.45)",
          borderRadius: 8, padding: "6px 18px", color: "#FFD700",
          fontSize: 13, fontFamily: "system-ui, sans-serif", fontWeight: 600,
          letterSpacing: 0.5, backdropFilter: "blur(4px)", whiteSpace: "nowrap",
        }}>
          <span style={{ opacity: 0.7 }}>[E] </span>{interactLabel}
        </div>
      )}

      {/* Weapon label bottom-right */}
      <div style={{
        position: "fixed", bottom: 90, right: 24,
        pointerEvents: "none", zIndex: 200,
        fontFamily: "system-ui, sans-serif", textAlign: "right",
      }}>
        <div style={{ fontSize: 11, color: "rgba(150,200,220,0.6)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>
          [scroll/tab]
        </div>
        <div style={{
          fontSize: 15, fontWeight: 700,
          color: weapon === "bazooka" ? "#FF8C44" : weapon === "machinegun" ? "#FFB744" : "#CCDDFF",
          letterSpacing: 0.5, textShadow: "0 0 12px currentColor",
        }}>
          {weapon === "pistol" ? "🔫 Pistol" : weapon === "machinegun" ? "💥 M. Gun" : "🚀 Bazooka"}
        </div>
        <div style={{ fontSize: 10, color: "rgba(120,170,180,0.5)", marginTop: 2 }}>
          [5] Spawn · [0] Hide weapon
        </div>
      </div>
    </>
  );
}
