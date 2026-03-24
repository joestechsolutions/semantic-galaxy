// src/lib/colors.ts
import type { GalaxyPoint, ColorMode } from "../types";
import { getTypeColor } from "../constants";

/** 16 distinct cluster colors — maximally separated hues */
const CLUSTER_PALETTE = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8",
  "#f58231", "#42d4f4", "#f032e6", "#fabed4",
  "#469990", "#dcbeff", "#9A6324", "#fffac8",
  "#800000", "#aaffc3", "#808000", "#000075",
];

const SOURCE_COLORS = {
  entity: "#F59E0B", // warm amber
  memory: "#3B82F6", // cool blue
  unknown: "#6B7280",
} as const;

/** Blue → Yellow → Red heatmap gradient via HSL interpolation */
function densityColor(connectionCount: number, maxConnections: number): string {
  const t = maxConnections > 0 ? Math.min(connectionCount / maxConnections, 1) : 0;
  // Hue: 240 (blue) → 60 (yellow) → 0 (red)
  const hue = 240 - t * 240;
  const saturation = 70 + t * 20;
  const lightness = 45 + t * 10;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Compute point colors based on the active color mode.
 * Returns a string[] parallel to the points array.
 */
export function computePointColors(
  points: GalaxyPoint[],
  mode: ColorMode,
  clusterAssignments: number[],
  connectionCounts: Map<number, number>,
): string[] {
  switch (mode) {
    case "type":
      return points.map((p) => getTypeColor(p.metadata.type));

    case "cluster": {
      return points.map((p, i) => {
        const clusterId = clusterAssignments[i] ?? -1;
        if (clusterId < 0) return "#666666"; // noise
        return CLUSTER_PALETTE[clusterId % CLUSTER_PALETTE.length];
      });
    }

    case "source":
      return points.map((p) => {
        const src = p.metadata.source?.toLowerCase() ?? "unknown";
        return SOURCE_COLORS[src as keyof typeof SOURCE_COLORS] ?? SOURCE_COLORS.unknown;
      });

    case "density": {
      const maxConn = Math.max(1, ...Array.from(connectionCounts.values()));
      return points.map((p) => {
        const count = connectionCounts.get(p.index) ?? 0;
        return densityColor(count, maxConn);
      });
    }

    default:
      return points.map((p) => getTypeColor(p.metadata.type));
  }
}

/** Build a map of point index → connection count from edges */
export function buildConnectionCounts(
  edges: { source: number; target: number }[],
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const e of edges) {
    counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
    counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
  }
  return counts;
}

export { CLUSTER_PALETTE };
