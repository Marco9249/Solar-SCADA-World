import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type WeatherMode = "clear" | "fluctuating" | "overcast";

export interface WeatherData {
  mode: WeatherMode;
  label: string;
  irradiance: number;
  power: number;
  flowRate: number;
  ambientIntensity: number;
  sunIntensity: number;
  sunColor: string;
  skyTop: string;
  skyMiddle: string;
  avgSoc: number;
  waterLevelTarget: number;
  pumpRpm?: number;
  windSpeed?: number;
  temperature?: number;
  simActive?: boolean;
}

export const WEATHER_PROFILES: Record<WeatherMode, WeatherData> = {
  clear: {
    mode: "clear", label: "Clear Sky",
    irradiance: 950, power: 11973, flowRate: 14.06,
    ambientIntensity: 0.55, sunIntensity: 2.2, sunColor: "#FFF5E0",
    skyTop: "#4A90D9", skyMiddle: "#87CEEB",
    avgSoc: 87, waterLevelTarget: 5.03,
  },
  fluctuating: {
    mode: "fluctuating", label: "Fluctuating Weather",
    irradiance: 550, power: 4746, flowRate: 13.2,
    ambientIntensity: 0.35, sunIntensity: 1.1, sunColor: "#FFE4B0",
    skyTop: "#7BADD4", skyMiddle: "#B0C8DF",
    avgSoc: 62, waterLevelTarget: 4.6,
  },
  overcast: {
    mode: "overcast", label: "Overcast / Cloudy",
    irradiance: 280, power: 3296, flowRate: 12.39,
    ambientIntensity: 0.55, sunIntensity: 0.4, sunColor: "#C8D8E8",
    skyTop: "#9AAEC0", skyMiddle: "#C8D8E0",
    avgSoc: 40, waterLevelTarget: 4.1,
  },
};

// Live simulation step (from 72h MATLAB/Simulink data)
export interface SimStep {
  t: number;
  irr: number;
  pv: number;
  soc: number;
  tank_level: number;
  pump_rpm: number;
  flow: number;
  temp: number;
  mpc_sp: number;
  fopid_err: number;
  lstm: number;
  wind: number;
}

export interface SelectedObject {
  type: string;
  title: string;
  lines: { label: string; value: string }[];
}

interface WeatherCtx {
  weather:        WeatherData;
  setWeatherMode: (m: WeatherMode) => void;
  isRaining:      boolean;
  toggleRain:     () => void;
  selected:       SelectedObject | null;
  setSelected:    (obj: SelectedObject | null) => void;
  // Simulation data override
  simStep:        SimStep | null;
  setSimStep:     (step: SimStep | null) => void;
  simActive:      boolean;
  setSimActive:   (v: boolean) => void;
}

const WeatherContext = createContext<WeatherCtx | null>(null);

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [mode,      setMode]      = useState<WeatherMode>("clear");
  const [isRaining, setIsRaining] = useState(false);
  const [selected,  setSelected]  = useState<SelectedObject | null>(null);
  const [simStep,   setSimStep]   = useState<SimStep | null>(null);
  const [simActive, setSimActive] = useState(false);

  // Build weather: if simActive, blend sim data into current profile
  const baseWeather = WEATHER_PROFILES[mode];
  const weather: WeatherData = simActive && simStep
    ? {
        ...baseWeather,
        irradiance:       simStep.irr,
        power:            simStep.pv,
        flowRate:         Math.round(simStep.flow * 100) / 100,
        avgSoc:           simStep.soc,
        waterLevelTarget: simStep.tank_level,
        pumpRpm:          simStep.pump_rpm,
        windSpeed:        simStep.wind,
        temperature:      simStep.temp,
        // Adjust lighting based on irradiance
        ambientIntensity: 0.15 + (simStep.irr / 950) * 0.45,
        sunIntensity:     0.2  + (simStep.irr / 950) * 2.1,
        sunColor:         simStep.irr > 600 ? "#FFF5E0" : simStep.irr > 300 ? "#FFE4B0" : "#C8D8E8",
        skyTop:           simStep.irr > 600 ? "#4A90D9" : simStep.irr > 300 ? "#7BADD4" : "#9AAEC0",
        skyMiddle:        simStep.irr > 600 ? "#87CEEB" : simStep.irr > 300 ? "#B0C8DF" : "#C8D8E0",
        simActive:        true,
      }
    : baseWeather;

  const handleSetSimStep = useCallback((step: SimStep | null) => setSimStep(step), []);
  const handleSetSimActive = useCallback((v: boolean) => setSimActive(v), []);

  return (
    <WeatherContext.Provider
      value={{
        weather,
        setWeatherMode: setMode,
        isRaining,
        toggleRain: () => setIsRaining(r => !r),
        selected,
        setSelected,
        simStep,
        setSimStep: handleSetSimStep,
        simActive,
        setSimActive: handleSetSimActive,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) throw new Error("useWeather must be used inside WeatherProvider");
  return ctx;
}
