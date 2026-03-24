// src/components/ConnectionLines.tsx
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useGalaxyStore } from "../store";
import { getEdgeColor } from "../constants";

export function ConnectionLines() {
  const points = useGalaxyStore((s) => s.points);
  const edges = useGalaxyStore((s) => s.edges);
  const selectedPoint = useGalaxyStore((s) => s.selectedPoint);
  const showEdges = useGalaxyStore((s) => s.showEdges);
  const dimensionMode = useGalaxyStore((s) => s.dimensionMode);
  const linesRef = useRef<THREE.LineSegments>(null);

  const { positions, colors } = useMemo(() => {
    if (!showEdges || edges.length === 0)
      return { positions: new Float32Array(0), colors: new Float32Array(0) };

    const selectedIdx = selectedPoint?.index ?? null;
    const pos = new Float32Array(edges.length * 6);
    const col = new Float32Array(edges.length * 6);

    edges.forEach((edge, i) => {
      const src = points[edge.source];
      const tgt = points[edge.target];
      if (!src || !tgt) return;

      const srcPos = dimensionMode === "3d" ? src.position : src.position2D;
      const tgtPos = dimensionMode === "3d" ? tgt.position : tgt.position2D;

      const isConnected =
        selectedIdx !== null &&
        (edge.source === selectedIdx || edge.target === selectedIdx);
      const baseOpacity = edge.confidence;
      const opacity =
        selectedIdx === null
          ? baseOpacity * 0.3
          : isConnected
            ? 1.0
            : 0.03;

      const color = new THREE.Color(getEdgeColor(edge.type));

      pos[i * 6 + 0] = srcPos[0];
      pos[i * 6 + 1] = srcPos[1];
      pos[i * 6 + 2] = srcPos[2];
      pos[i * 6 + 3] = tgtPos[0];
      pos[i * 6 + 4] = tgtPos[1];
      pos[i * 6 + 5] = tgtPos[2];

      col[i * 6 + 0] = color.r * opacity;
      col[i * 6 + 1] = color.g * opacity;
      col[i * 6 + 2] = color.b * opacity;
      col[i * 6 + 3] = color.r * opacity;
      col[i * 6 + 4] = color.g * opacity;
      col[i * 6 + 5] = color.b * opacity;
    });

    return { positions: pos, colors: col };
  }, [points, edges, selectedPoint, showEdges, dimensionMode]);

  if (positions.length === 0) return null;

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.8} linewidth={1} />
    </lineSegments>
  );
}
