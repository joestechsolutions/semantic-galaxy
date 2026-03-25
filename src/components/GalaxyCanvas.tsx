// src/components/GalaxyCanvas.tsx
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { CameraController } from "./CameraController";
import { GalaxyPoints } from "./GalaxyPoints";
import { ConnectionLines } from "./ConnectionLines";
import { ClusterBoundaries } from "./ClusterBoundaries";
import { PointTooltip } from "./PointTooltip";

export function GalaxyCanvas({ className }: { className?: string }) {
  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 35], fov: 60, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      onCreated={({ raycaster }) => {
        raycaster.params.Mesh!.threshold = 0.3;
        raycaster.params.Points!.threshold = 0.5;
      }}
      style={{ background: "#000" }}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[20, 20, 20]} intensity={0.4} />

      <Stars
        radius={100}
        depth={80}
        count={3000}
        factor={4}
        saturation={0.2}
        fade
        speed={0.5}
      />

      <ConnectionLines />
      <ClusterBoundaries />
      <GalaxyPoints />
      <PointTooltip />
      <CameraController />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.7}
          luminanceSmoothing={0.6}
          intensity={0.8}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
