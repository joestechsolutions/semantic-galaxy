// src/components/PointTooltip.tsx
import { Html } from "@react-three/drei";
import { useGalaxyStore } from "../store";

export function PointTooltip() {
  const hoveredPoint = useGalaxyStore((s) => s.hoveredPoint);
  const dimensionMode = useGalaxyStore((s) => s.dimensionMode);
  if (!hoveredPoint) return null;

  const pos = dimensionMode === "3d" ? hoveredPoint.position : hoveredPoint.position2D;

  return (
    <Html position={pos} center style={{ pointerEvents: "none" }}>
      <div className="rounded-lg bg-black/90 backdrop-blur-sm border border-white/20 px-3 py-2 whitespace-nowrap transform -translate-y-10 shadow-lg">
        <p className="text-sm font-semibold text-white">{hoveredPoint.metadata.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: hoveredPoint.color }}
          />
          <p className="text-xs text-white/60">{hoveredPoint.metadata.type}</p>
        </div>
      </div>
    </Html>
  );
}
