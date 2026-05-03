import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useImport } from "../context/ImportContext";

export default function OBJViewer() {
  const { objContent, objPosition } = useImport();
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [loadedGroup, setLoadedGroup] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (!objContent) {
      setLoadedGroup(null);
      return;
    }

    // Dynamically import OBJLoader from three/addons
    import("three/addons/loaders/OBJLoader.js")
      .then(({ OBJLoader }) => {
        const loader = new OBJLoader();
        const parsed = loader.parse(objContent);

        // Auto-scale and center
        const box    = new THREE.Box3().setFromObject(parsed);
        const size   = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scl    = maxDim > 0 ? 4.0 / maxDim : 1;

        parsed.position.sub(center.multiplyScalar(scl));
        parsed.scale.setScalar(scl);

        // Apply a nice PBR material to all meshes
        parsed.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = new THREE.MeshStandardMaterial({
              color:     "#B0A090",
              roughness: 0.68,
              metalness: 0.22,
              side:      THREE.DoubleSide,
            });
            mesh.castShadow    = true;
            mesh.receiveShadow = true;
          }
        });

        setLoadedGroup(parsed);
      })
      .catch((err) => {
        console.warn("OBJLoader not available:", err.message);
        // Fallback: render a placeholder box
        const geo  = new THREE.BoxGeometry(2, 2, 2);
        const mat  = new THREE.MeshStandardMaterial({ color: "#8899AA", roughness: 0.6, wireframe: false });
        const mesh = new THREE.Mesh(geo, mat);
        const grp  = new THREE.Group();
        grp.add(mesh);
        setLoadedGroup(grp);
      });
  }, [objContent]);

  // Place in front of camera when loaded
  useEffect(() => {
    if (!loadedGroup || !groupRef.current) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const placePos = camera.position.clone().addScaledVector(dir, 6);
    groupRef.current.position.copy(placePos);
  }, [loadedGroup, camera]);

  useFrame(() => {
    if (groupRef.current && loadedGroup) {
      groupRef.current.rotation.y += 0.003;
    }
  });

  if (!loadedGroup) return null;

  return (
    <group ref={groupRef} position={objPosition}>
      <primitive object={loadedGroup} />
      {/* Glow ring below model */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.1, 0]}>
        <ringGeometry args={[1.8, 2.2, 32]} />
        <meshStandardMaterial color="#44AAFF" emissive="#2266CC" emissiveIntensity={0.8} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <pointLight color="#4499FF" intensity={2.5} distance={8} decay={2} position={[0, 1, 0]} />
    </group>
  );
}
