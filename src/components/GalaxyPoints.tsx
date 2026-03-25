// src/components/GalaxyPoints.tsx
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGalaxyStore } from "../store";
import { usePointColors } from "../hooks/useColorMode";
import { POINT_SIZE, HIGHLIGHT_SIZE } from "../constants";

function InteractiveSphere({
  position,
  color,
  isHighlighted,
  isSelected,
  onPointerOver,
  onPointerOut,
  onClick,
}: {
  position: [number, number, number];
  color: string;
  isHighlighted: boolean;
  isSelected: boolean;
  onPointerOver: (e: any) => void;
  onPointerOut: () => void;
  onClick: (e: any) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseSize = isHighlighted ? HIGHLIGHT_SIZE : POINT_SIZE;
  const targetScale = isSelected ? 2.5 : isHighlighted ? 1.8 : 1.0;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const s = meshRef.current.scale.x;
    const next = THREE.MathUtils.lerp(s, targetScale, delta * 5);
    meshRef.current.scale.setScalar(next);
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <sphereGeometry args={[baseSize, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isHighlighted ? 1.5 : isSelected ? 2.0 : 0.6}
        toneMapped={false}
      />
    </mesh>
  );
}

export function GalaxyPoints() {
  const points = useGalaxyStore((s) => s.points);
  const searchResults = useGalaxyStore((s) => s.searchResults);
  const selectedPoint = useGalaxyStore((s) => s.selectedPoint);
  const dimensionMode = useGalaxyStore((s) => s.dimensionMode);
  const selectPoint = useGalaxyStore((s) => s.selectPoint);
  const setHoveredPoint = useGalaxyStore((s) => s.setHoveredPoint);
  const hoveredPoint = useGalaxyStore((s) => s.hoveredPoint);
  const pointColors = usePointColors();

  const highlightedIndices = useMemo(
    () => new Set(searchResults.map((r) => r.point.index)),
    [searchResults],
  );

  const selectedIndex = selectedPoint?.index ?? null;

  // Determine current target positions based on dimension mode
  const targetPositions = useMemo(() => {
    return points.map((p) =>
      dimensionMode === "3d" ? p.position : p.position2D,
    );
  }, [points, dimensionMode]);

  // Split into highlighted and background
  const { highlighted, backgroundIndices } = useMemo(() => {
    const h: number[] = [];
    const b: number[] = [];
    for (let i = 0; i < points.length; i++) {
      if (highlightedIndices.has(i) || i === selectedIndex) {
        h.push(i);
      } else {
        b.push(i);
      }
    }
    return { highlighted: h, backgroundIndices: b };
  }, [points, highlightedIndices, selectedIndex]);

  // Track which instance is hovered for scale-up effect
  const hoveredInstanceRef = useRef<number | null>(null);

  // Instanced mesh for background
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Animate instanced positions for 2D/3D transitions
  const positionsRef = useRef<[number, number, number][]>([]);

  useEffect(() => {
    if (positionsRef.current.length !== points.length) {
      positionsRef.current = points.map((p) => [...p.position] as [number, number, number]);
    }
  }, [points]);

  useFrame((_, delta) => {
    if (!instancedRef.current) return;
    const mesh = instancedRef.current;
    const lerpSpeed = Math.min(delta * 3, 1);
    const hovIdx = hoveredInstanceRef.current;

    backgroundIndices.forEach((pointIdx, instanceIdx) => {
      const target = targetPositions[pointIdx];
      const current = positionsRef.current[pointIdx] ?? target;

      // Lerp toward target
      current[0] += (target[0] - current[0]) * lerpSpeed;
      current[1] += (target[1] - current[1]) * lerpSpeed;
      current[2] += (target[2] - current[2]) * lerpSpeed;
      positionsRef.current[pointIdx] = current;

      dummy.position.set(current[0], current[1], current[2]);

      // Scale up the hovered instance for visual feedback
      const isHovered = instanceIdx === hovIdx;
      dummy.scale.setScalar(isHovered ? 2.5 : 1.0);

      dummy.updateMatrix();
      mesh.setMatrixAt(instanceIdx, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  // Update instance colors when color mode changes
  useEffect(() => {
    if (!instancedRef.current) return;
    const colors: number[] = [];
    for (const idx of backgroundIndices) {
      const c = new THREE.Color(pointColors[idx]);
      colors.push(c.r, c.g, c.b);
    }
    instancedRef.current.geometry.setAttribute(
      "color",
      new THREE.InstancedBufferAttribute(new Float32Array(colors), 3),
    );
  }, [backgroundIndices, pointColors]);

  return (
    <group>
      {backgroundIndices.length > 0 && (
        <instancedMesh
          ref={instancedRef}
          args={[undefined, undefined, backgroundIndices.length]}
          onPointerOver={(e) => {
            e.stopPropagation();
            const idx = e.instanceId;
            if (idx !== undefined && backgroundIndices[idx] !== undefined) {
              hoveredInstanceRef.current = idx;
              setHoveredPoint(points[backgroundIndices[idx]]);
              document.body.style.cursor = "pointer";
            }
          }}
          onPointerOut={() => {
            hoveredInstanceRef.current = null;
            setHoveredPoint(null);
            document.body.style.cursor = "auto";
          }}
          onClick={(e) => {
            e.stopPropagation();
            const idx = e.instanceId;
            if (idx !== undefined && backgroundIndices[idx] !== undefined) {
              selectPoint(points[backgroundIndices[idx]]);
            }
          }}
        >
          <sphereGeometry args={[POINT_SIZE, 12, 12]} />
          <meshStandardMaterial
            vertexColors
            emissive="#000000"
            emissiveIntensity={0}
            toneMapped={false}
          />
        </instancedMesh>
      )}

      {highlighted.map((pointIdx) => {
        const p = points[pointIdx];
        const pos = dimensionMode === "3d" ? p.position : p.position2D;
        return (
          <InteractiveSphere
            key={pointIdx}
            position={pos}
            color={pointColors[pointIdx]}
            isHighlighted={highlightedIndices.has(pointIdx)}
            isSelected={pointIdx === selectedIndex}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredPoint(p);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHoveredPoint(null);
              document.body.style.cursor = "auto";
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectPoint(p);
            }}
          />
        );
      })}
    </group>
  );
}
