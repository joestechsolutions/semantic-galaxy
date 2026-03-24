// src/components/PointTooltip.tsx
import { Html } from "@react-three/drei";
import { useGalaxyStore } from "../store";

export function PointTooltip() {
  const hoveredPoint = useGalaxyStore((s) => s.hoveredPoint);
  if (!hoveredPoint) return null;

  return (
    <Html position={hoveredPoint.position} center style={{ pointerEvents: "none" }}>
      <div className="rounded-lg bg-black/80 backdrop-blur-sm border border-white/20 px-3 py-2 whitespace-nowrap transform -translate-y-10">
        <p className="text-sm font-semibold text-white">{hoveredPoint.metadata.label}</p>
        <p className="text-xs text-white/60">{hoveredPoint.metadata.type}</p>
      </div>
    </Html>
  );
}
