import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useRef, useCallback } from "react";
import { WeatherProvider, useWeather, WeatherMode } from "./context/WeatherContext";
import { ImportProvider } from "./context/ImportContext";
import Scene from "./components/Scene";
import FirstPersonController from "./components/FirstPersonController";
import Crosshair from "./components/Crosshair";
import HUD from "./components/HUD";
import WeatherSelector from "./components/WeatherSelector";
import InfoOverlay from "./components/InfoOverlay";
import StartScreen from "./components/StartScreen";
import WebGLErrorBoundary from "./components/WebGLErrorBoundary";
import SimulationDataPanel from "./components/SimulationDataPanel";
import type { WeaponType } from "./components/CombatSystem";

// ─── Inner UI (needs WeatherContext) ─────────────────────────────────────────
function GameUI({
  hasStarted, isLocked, interactLabel, weapon,
  zombieCount, playerHealth, weatherVisible,
  showHUD, showCombatUI, showAllUI,
  onStart, onWeatherToggle,
}: {
  hasStarted:     boolean;
  isLocked:       boolean;
  interactLabel:  string;
  weapon:         WeaponType;
  zombieCount:    number;
  playerHealth:   number;
  weatherVisible: boolean;
  showHUD:        boolean;
  showCombatUI:   boolean;
  showAllUI:      boolean;
  onStart:        () => void;
  onWeatherToggle:() => void;
}) {
  const { selected, setSelected } = useWeather();

  if (!hasStarted) return <StartScreen onStart={onStart} />;

  if (selected) {
    return (
      <>
        <InfoOverlay />
        <div
          onClick={() => { setSelected(null); onStart(); }}
          style={{ position: "fixed", inset: 0, zIndex: 90, cursor: "pointer" }}
        />
      </>
    );
  }

  if (!isLocked) {
    return (
      <div onClick={onStart} style={{
        position: "fixed", inset: 0, zIndex: 90,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.48)", backdropFilter: "blur(4px)", cursor: "pointer",
      }}>
        <div style={{
          background: "rgba(5,14,28,0.92)", border: "1px solid rgba(100,180,255,0.3)",
          borderRadius: 14, padding: "22px 44px", textAlign: "center", fontFamily: "system-ui",
        }}>
          <div style={{ fontSize: 22, color: "#fff", fontWeight: 700, marginBottom: 6 }}>Paused</div>
          <div style={{ fontSize: 13, color: "#7AAABB" }}>Click to resume exploration</div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#3A6A80" }}>
            WASD · Mouse · E Inspect · Space Jump · Shift Sprint
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: "#3A6A80" }}>
            1-3 Weather · 4 Panel · 5 Zombie · 6 Rain · V Weapon · H HUD
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: "#2A5A70" }}>
            0 Combat UI · 9 Cinematic Mode
          </div>
        </div>
      </div>
    );
  }

  // Master cinematic mode hides everything
  if (!showAllUI) {
    return (
      <div style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 160,
        background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "4px 10px",
        color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "system-ui",
        pointerEvents: "none",
      }}>
        [9] restore UI
      </div>
    );
  }

  return (
    <>
      {/* Crosshair + weapon label — toggled by key 0 */}
      <Crosshair
        canInteract={!!interactLabel}
        interactLabel={interactLabel}
        weapon={weapon}
        isAiming={false}
        visible={showCombatUI}
      />

      <HUD zombieCount={zombieCount} playerHealth={playerHealth} visible={showHUD} />
      <WeatherSelector visible={weatherVisible && showHUD} />

      {showHUD && (
        <button
          onClick={onWeatherToggle}
          style={{
            position: "fixed", top: 18, right: 18, zIndex: 160,
            background: "rgba(6,14,28,0.82)", border: "1px solid rgba(100,160,220,0.3)",
            borderRadius: 8, padding: "6px 14px", color: "#7AAABB",
            fontFamily: "system-ui", fontSize: 11, cursor: "pointer",
            backdropFilter: "blur(8px)", pointerEvents: "auto",
            letterSpacing: 0.5,
          }}
        >
          {weatherVisible ? "Hide" : "Show"} Weather [4]
        </button>
      )}

      {/* Hint badges when UI is hidden */}
      {!showHUD && (
        <div style={{
          position: "fixed", bottom: 52, right: 20, zIndex: 160,
          background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "4px 10px",
          color: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "system-ui",
          pointerEvents: "none",
        }}>
          H — show HUD
        </div>
      )}
      {!showCombatUI && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 160,
          background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "4px 10px",
          color: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "system-ui",
          pointerEvents: "none",
        }}>
          0 — show combat UI
        </div>
      )}
    </>
  );
}

// ─── Inner canvas layer ───────────────────────────────────────────────────────
function AppInner() {
  const [hasStarted,     setHasStarted]     = useState(false);
  const [isLocked,       setIsLocked]       = useState(false);
  const [interactLabel,  setInteractLabel]  = useState("");
  const [weapon,         setWeapon]         = useState<WeaponType>("pistol");
  const [zombieCount,    setZombieCount]    = useState(0);
  const [playerHealth,   setPlayerHealth]   = useState(100);
  const [weatherVisible, setWeatherVisible] = useState(true);
  const [showWeapon,     setShowWeapon]     = useState(true);
  const [showHUD,        setShowHUD]        = useState(true);
  const [showCombatUI,   setShowCombatUI]   = useState(true);  // key 0
  const [showAllUI,      setShowAllUI]      = useState(true);  // key 9 cinematic mode
  const { setWeatherMode, toggleRain } = useWeather();

  const requestLockRef = useRef<(() => void) | null>(null);

  const handleStart         = useCallback(() => {
    setHasStarted(true);          // show the world immediately
    requestLockRef.current?.();   // also attempt mouse look lock
  }, []);
  const handleLockChange    = useCallback((locked: boolean) => {
    setIsLocked(locked);
    if (!locked) setInteractLabel("");
  }, []);
  const handleInteractZone  = useCallback((label: string) => { setInteractLabel(label); }, []);
  const handlePlayerHit     = useCallback((dmg: number) => { setPlayerHealth(h => Math.max(0, h - dmg)); }, []);
  const handleWeatherKey    = useCallback((key: "1" | "2" | "3") => {
    const map: Record<string, WeatherMode> = { "1": "clear", "2": "fluctuating", "3": "overcast" };
    setWeatherMode(map[key] as WeatherMode);
  }, [setWeatherMode]);
  const handleWeatherToggle  = useCallback(() => setWeatherVisible(v => !v), []);
  const handleRainToggle     = useCallback(() => toggleRain(), [toggleRain]);
  const handleWeaponToggle   = useCallback(() => setShowWeapon(w => !w), []);
  const handleHUDToggle      = useCallback(() => setShowHUD(h => !h), []);
  // Key 0: toggles crosshair + weapon label (combat UI elements)
  const handleCombatUIToggle = useCallback(() => {
    setShowCombatUI(v => !v);
    setShowWeapon(v => !v); // also hides the 3D weapon model
  }, []);
  // Key 9: master cinematic toggle — hides EVERYTHING
  const handleAllUIToggle    = useCallback(() => setShowAllUI(v => !v), []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#1A2A3A" }}>
      <WebGLErrorBoundary>
        <Canvas
          shadows
          camera={{ fov: 75, near: 0.1, far: 550 }}
          gl={{ antialias: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: false }}
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense fallback={null}>
            <Scene
              isLocked={isLocked}
              onZombieCount={setZombieCount}
              onWeaponChange={setWeapon}
              onPlayerHit={handlePlayerHit}
              showWeapon={showWeapon && showCombatUI}
            />
            <FirstPersonController
              onLockChange={handleLockChange}
              onInteractZone={handleInteractZone}
              requestLockRef={requestLockRef}
              onWeatherKey={handleWeatherKey}
              onWeatherToggle={handleWeatherToggle}
              onRainToggle={handleRainToggle}
              onWeaponToggle={handleWeaponToggle}
              onHUDToggle={handleHUDToggle}
              onCombatUIToggle={handleCombatUIToggle}
              onAllUIToggle={handleAllUIToggle}
            />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>

      <GameUI
        hasStarted={hasStarted}
        isLocked={isLocked}
        interactLabel={interactLabel}
        weapon={weapon}
        zombieCount={zombieCount}
        playerHealth={playerHealth}
        weatherVisible={weatherVisible}
        showHUD={showHUD}
        showCombatUI={showCombatUI}
        showAllUI={showAllUI}
        onStart={handleStart}
        onWeatherToggle={handleWeatherToggle}
      />

      {/* Simulation Data Panel — always rendered when game has started */}
      {hasStarted && <SimulationDataPanel visible={showAllUI} />}
    </div>
  );
}

export default function App() {
  return (
    <WeatherProvider>
      <ImportProvider>
        <AppInner />
      </ImportProvider>
    </WeatherProvider>
  );
}
