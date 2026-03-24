// src/lib/clustering.ts
import type { GalaxyPoint, ClusterInfo } from "../types";
import { CLUSTER_PALETTE } from "./colors";

/**
 * Simple DBSCAN implementation.
 * Works on 3D points, returns cluster assignment per point (-1 = noise).
 */
function dbscan(
  positions: [number, number, number][],
  epsilon: number,
  minPoints: number,
): number[] {
  const n = positions.length;
  const assignments = new Array<number>(n).fill(-1); // -1 = unvisited/noise
  let clusterId = 0;

  function distance(a: [number, number, number], b: [number, number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function regionQuery(pointIdx: number): number[] {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (distance(positions[pointIdx], positions[i]) <= epsilon) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  const visited = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = 1;

    const neighbors = regionQuery(i);
    if (neighbors.length < minPoints) {
      // noise (stays -1)
      continue;
    }

    // Start a new cluster
    assignments[i] = clusterId;
    const seed = [...neighbors];
    let j = 0;

    while (j < seed.length) {
      const q = seed[j];
      if (!visited[q]) {
        visited[q] = 1;
        const qNeighbors = regionQuery(q);
        if (qNeighbors.length >= minPoints) {
          for (const nn of qNeighbors) {
            if (!seed.includes(nn)) seed.push(nn);
          }
        }
      }
      if (assignments[q] === -1) {
        assignments[q] = clusterId;
      }
      j++;
    }

    clusterId++;
  }

  return assignments;
}

/**
 * Run DBSCAN on galaxy points and return cluster info + assignments.
 * epsilon and minPoints are auto-tuned based on data density.
 */
export function computeClusters(
  points: GalaxyPoint[],
): { clusters: ClusterInfo[]; assignments: number[] } {
  if (points.length === 0) return { clusters: [], assignments: [] };

  const positions = points.map((p) => p.position);

  // Auto-tune epsilon: use ~5% of the position range
  let maxDist = 0;
  for (let i = 0; i < Math.min(positions.length, 50); i++) {
    for (let j = i + 1; j < Math.min(positions.length, 50); j++) {
      const dx = positions[i][0] - positions[j][0];
      const dy = positions[i][1] - positions[j][1];
      const dz = positions[i][2] - positions[j][2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > maxDist) maxDist = d;
    }
  }
  const epsilon = maxDist * 0.08;
  const minPoints = Math.max(3, Math.floor(points.length * 0.01));

  const assignments = dbscan(positions, epsilon, minPoints);

  // Build cluster info
  const clusterMap = new Map<number, number[]>();
  assignments.forEach((cId, idx) => {
    if (cId >= 0) {
      if (!clusterMap.has(cId)) clusterMap.set(cId, []);
      clusterMap.get(cId)!.push(idx);
    }
  });

  const clusters: ClusterInfo[] = [];
  for (const [id, indices] of clusterMap) {
    // Find dominant type
    const typeCounts = new Map<string, number>();
    for (const idx of indices) {
      const t = points[idx].metadata.type;
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
    let dominantType = "unknown";
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    clusters.push({
      id,
      label: `Cluster ${id + 1}: mostly ${dominantType}`,
      dominantType,
      pointCount: indices.length,
      color: CLUSTER_PALETTE[id % CLUSTER_PALETTE.length],
    });
  }

  return { clusters, assignments };
}
