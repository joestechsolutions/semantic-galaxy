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
  const dimensionMode = useGalaxyStore((s) => s.dimensionMode);
  const { camera } = useThree();
  const currentTarget = useRef<THREE.Vector3 | null>(null);
  const controlsRef = useRef<any>(null);
  const dimensionTarget = useRef<THREE.Vector3 | null>(null);

  // Fly to selected node
  useEffect(() => {
    if (cameraTarget) {
      const dir = cameraTarget.clone().normalize();
      const dest = cameraTarget.clone().add(dir.multiplyScalar(FOCUS_DISTANCE));
      currentTarget.current = dest;
    }
  }, [cameraTarget]);

  // Switch camera for 2D/3D mode
  useEffect(() => {
    if (dimensionMode === "2d") {
      // Top-down view for 2D
      dimensionTarget.current = new THREE.Vector3(0, 0, 40);
    } else {
      // Angled view for 3D
      dimensionTarget.current = new THREE.Vector3(0, 0, 35);
    }
    // Reset orbit controls target to origin
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
    }
  }, [dimensionMode]);

  useFrame(() => {
    // Fly-to-node animation
    if (cameraEnabled && currentTarget.current) {
      camera.position.lerp(currentTarget.current, 0.03);
      const lookTarget = currentTarget.current
        .clone()
        .sub(
          currentTarget.current.clone().normalize().multiplyScalar(FOCUS_DISTANCE),
        );
      camera.lookAt(lookTarget);
      return; // Don't also do dimension lerp while flying to node
    }

    // 2D/3D camera transition
    if (dimensionTarget.current) {
      const dist = camera.position.distanceTo(dimensionTarget.current);
      if (dist > 0.1) {
        camera.position.lerp(dimensionTarget.current, 0.05);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      } else {
        dimensionTarget.current = null;
      }
    }
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
      enableRotate={dimensionMode === "3d"}
      onChange={() => {
        // Stop auto-rotation on any user interaction
        if (autoRotate) setAutoRotate(false);
      }}
    />
  );
}
