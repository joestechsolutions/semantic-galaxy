// src/components/ClusterBoundaries.tsx
import { useMemo } from "react";
import * as THREE from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { useGalaxyStore } from "../store";
import { CLUSTER_PALETTE } from "../lib/colors";

export function ClusterBoundaries() {
  const points = useGalaxyStore((s) => s.points);
  const clusterAssignments = useGalaxyStore((s) => s.clusterAssignments);
  const showClusters = useGalaxyStore((s) => s.showClusters);
  const dimensionMode = useGalaxyStore((s) => s.dimensionMode);

  const hulls = useMemo(() => {
    if (!showClusters || clusterAssignments.length === 0) return [];

    // Group points by cluster
    const clusterPoints = new Map<number, THREE.Vector3[]>();
    clusterAssignments.forEach((cId, idx) => {
      if (cId < 0) return; // skip noise
      if (!clusterPoints.has(cId)) clusterPoints.set(cId, []);
      const p = points[idx];
      const pos = dimensionMode === "3d" ? p.position : p.position2D;
      clusterPoints.get(cId)!.push(new THREE.Vector3(...pos));
    });

    const result: { geometry: THREE.BufferGeometry; color: string }[] = [];
    for (const [cId, pts] of clusterPoints) {
      if (pts.length < 4) continue; // ConvexGeometry needs at least 4 points
      try {
        const geom = new ConvexGeometry(pts);
        result.push({
          geometry: geom,
          color: CLUSTER_PALETTE[cId % CLUSTER_PALETTE.length],
        });
      } catch {
        // Degenerate hull (e.g., coplanar points) — skip
      }
    }
    return result;
  }, [points, clusterAssignments, showClusters, dimensionMode]);

  if (hulls.length === 0) return null;

  return (
    <group>
      {hulls.map((hull, i) => (
        <group key={i}>
          {/* Transparent fill */}
          <mesh geometry={hull.geometry}>
            <meshBasicMaterial
              color={hull.color}
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Wireframe outline */}
          <lineSegments
            geometry={new THREE.EdgesGeometry(hull.geometry)}
          >
            <lineBasicMaterial color={hull.color} transparent opacity={0.25} />
          </lineSegments>
        </group>
      ))}
    </group>
  );
}
