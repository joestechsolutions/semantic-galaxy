// src/lib/umap.ts
import { UMAP } from "umap-js";
import { GALAXY_RADIUS } from "../constants";

interface ProjectionResult {
  positions3D: [number, number, number][];
  positions2D: [number, number, number][];
}

function normalize(
  projected: number[][],
  nComponents: number,
): [number, number, number][] {
  let maxExtent = 0;
  for (const p of projected) {
    for (const v of p) {
      const abs = Math.abs(v);
      if (abs > maxExtent) maxExtent = abs;
    }
  }
  const scale = maxExtent > 0 ? GALAXY_RADIUS / maxExtent : 1;

  return projected.map((pos) => [
    pos[0] * scale,
    pos[1] * scale,
    nComponents === 3 ? pos[2] * scale : 0,
  ]);
}

/**
 * Run UMAP twice: once for 3D and once for 2D.
 * Returns both position sets normalized to GALAXY_RADIUS.
 */
export function projectBoth(vectors: number[][]): ProjectionResult {
  const umap3D = new UMAP({
    nComponents: 3,
    nNeighbors: 15,
    minDist: 0.1,
    spread: 1.0,
  });
  const raw3D = umap3D.fit(vectors);
  const positions3D = normalize(raw3D, 3);

  const umap2D = new UMAP({
    nComponents: 2,
    nNeighbors: 15,
    minDist: 0.1,
    spread: 1.0,
  });
  const raw2D = umap2D.fit(vectors);
  const positions2D = normalize(raw2D, 2);

  return { positions3D, positions2D };
}
