// src/components/CameraController.tsx
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useGalaxyStore } from "../store";
import { FOCUS_DISTANCE } from "../constants";

export function CameraController() {
  const cameraTarget = useGalaxyStore((s) => s.cameraTarget);
  const cameraEnabled = useGalaxyStore((s) => s.cameraEnabled);
  const autoRotate = useGalaxyStore((s) => s.autoRotate);
  const setAutoRotate = useGalaxyStore((s) => s.setAutoRotate);
  const { camera } = useThree();
  const currentTarget = useRef<THREE.Vector3 | null>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (cameraTarget) {
      const dir = cameraTarget.clone().normalize();
      const dest = cameraTarget.clone().add(dir.multiplyScalar(FOCUS_DISTANCE));
      currentTarget.current = dest;
    }
  }, [cameraTarget]);

  useFrame(() => {
    if (!cameraEnabled || !currentTarget.current) return;
    camera.position.lerp(currentTarget.current, 0.03);
    const lookTarget = currentTarget.current
      .clone()
      .sub(
        currentTarget.current.clone().normalize().multiplyScalar(FOCUS_DISTANCE),
      );
    camera.lookAt(lookTarget);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={80}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      onChange={() => {
        // Stop auto-rotation on any user interaction
        if (autoRotate) setAutoRotate(false);
      }}
    />
  );
}
