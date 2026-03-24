// src/hooks/useColorMode.ts
import { useMemo } from "react";
import { useGalaxyStore } from "../store";
import { computePointColors, buildConnectionCounts } from "../lib/colors";

/**
 * Returns an array of color strings parallel to store.points,
 * recomputed whenever colorMode, points, clusters, or edges change.
 */
export function usePointColors(): string[] {
  const points = useGalaxyStore((s) => s.points);
  const edges = useGalaxyStore((s) => s.edges);
  const colorMode = useGalaxyStore((s) => s.colorMode);
  const clusterAssignments = useGalaxyStore((s) => s.clusterAssignments);

  const connectionCounts = useMemo(
    () => buildConnectionCounts(edges),
    [edges],
  );

  return useMemo(
    () => computePointColors(points, colorMode, clusterAssignments, connectionCounts),
    [points, colorMode, clusterAssignments, connectionCounts],
  );
}
