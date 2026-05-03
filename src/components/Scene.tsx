import SolarArray from "./SolarArray";
import WaterTank from "./WaterTank";
import PumpSystem from "./PumpSystem";
import ControlCabinet from "./ControlCabinet";
import WeatherStation from "./WeatherStation";
import BatteryBank from "./BatteryBank";
import Terrain from "./Terrain";
import WheatField from "./WheatField";
import IrrigationWater from "./IrrigationWater";
import ElectricalWiring from "./ElectricalWiring";
import HydraulicPiping from "./HydraulicPiping";
import RockFormations from "./RockFormations";
import RainSystem from "./RainSystem";
import Forest from "./Forest";
import Mountains from "./Mountains";
import Lighting from "./Lighting";
import RealisticSky from "./RealisticSky";
import SunLensFlare from "./SunLensFlare";
import CombatSystem, { WeaponType } from "./CombatSystem";
import OBJViewer from "./OBJViewer";

interface Props {
  isLocked:       boolean;
  showWeapon:     boolean;
  onZombieCount:  (n: number) => void;
  onWeaponChange: (w: WeaponType) => void;
  onPlayerHit:    (dmg: number) => void;
}

export default function Scene({ isLocked, showWeapon, onZombieCount, onWeaponChange, onPlayerHit }: Props) {
  return (
    <>
      <Lighting />
      <RealisticSky />
      <SunLensFlare />
      <Terrain />
      <Forest />
      <Mountains />
      <RockFormations />
      <RainSystem />

      {/* Farm structures */}
      <SolarArray     position={[-22, 0, -8]}  />
      <ControlCabinet position={[2,   0, -8]}  />
      <WeatherStation position={[-14, 0, -20]} />
      <WaterTank      position={[18,  0, 2]}   />
      <PumpSystem     position={[10,  0, 2]}   />
      <BatteryBank    position={[14,  0, 14]}  />

      {/* Crop */}
      <WheatField position={[0, 0, 20]} />

      {/* Active systems */}
      <IrrigationWater position={[0, 0, 20]} />
      <ElectricalWiring />
      <HydraulicPiping />

      {/* Combat */}
      <CombatSystem
        isLocked={isLocked}
        showWeapon={showWeapon}
        onZombieCount={onZombieCount}
        onWeaponChange={onWeaponChange}
        onPlayerHit={onPlayerHit}
      />

      {/* CAD / OBJ Import viewer */}
      <OBJViewer />

      {/* Farm fence */}
      <FarmFence />
    </>
  );
}

function FarmFence() {
  const mat = { color: "#8A7A60", roughness: 0.82, metalness: 0.22 };
  const corners: [number, number][] = [[-35, -32], [30, -32], [30, 35], [-35, 35]];

  const posts: [number, number, number][] = [];
  for (let i = 0; i < corners.length; i++) {
    const [x1, z1] = corners[i];
    const [x2, z2] = corners[(i + 1) % corners.length];
    const dx = x2 - x1, dz = z2 - z1;
    const n  = Math.floor(Math.sqrt(dx * dx + dz * dz) / 3.5);
    for (let j = 0; j <= n; j++) {
      const t = j / n;
      posts.push([x1 + dx * t, 0, z1 + dz * t]);
    }
  }

  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} position={[p[0], 0.9, p[2]]} castShadow>
          <cylinderGeometry args={[0.055, 0.068, 1.8, 5]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      ))}
      {corners.map(([x1, z1], i) => {
        const [x2, z2] = corners[(i + 1) % corners.length];
        const mid: [number, number, number] = [(x1 + x2) / 2, 1.22, (z1 + z2) / 2];
        const len   = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
        const angle = Math.atan2(z2 - z1, x2 - x1);
        return (
          <group key={i} position={mid} rotation={[0, -angle, 0]}>
            <mesh position={[0,  0.18, 0]}>
              <boxGeometry args={[len, 0.052, 0.04]} />
              <meshStandardMaterial {...mat} />
            </mesh>
            <mesh position={[0, -0.18, 0]}>
              <boxGeometry args={[len, 0.052, 0.04]} />
              <meshStandardMaterial {...mat} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
