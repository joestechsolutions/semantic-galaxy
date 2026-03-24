import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { UMAP } from "umap-js";
import * as THREE from "three";
import Logo from "./components/Logo";
import {
  GALAXY_RADIUS,
  POINT_SIZE,
  HIGHLIGHT_SIZE,
  FOCUS_DISTANCE,
  SEARCH_DEBOUNCE_MS,
  MAX_SEARCH_RESULTS,
  getTypeColor,
  getTypeCategory,
  getEdgeColor,
  EDGE_TYPE_COLORS,
} from "./constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetadataRow {
  label: string;
  type: string;
  source: string;
  detail: string;
}

interface GalaxyPoint {
  index: number;
  position: [number, number, number];
  embedding: number[];
  metadata: MetadataRow;
  color: string;
}

interface SearchResult {
  point: GalaxyPoint;
  similarity: number;
}

interface Edge {
  source: number;
  target: number;
  type: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Data loading & parsing
// ---------------------------------------------------------------------------

function parseVectorsTSV(text: string): number[][] {
  return text
    .trim()
    .split("\n")
    .map((line) => line.split("\t").map(Number));
}

function parseMetadataTSV(
  text: string,
): MetadataRow[] {
  const lines = text.trim().split("\n");
  // First line is the header row
  return lines.slice(1).map((line) => {
    const cols = line.split("\t");
    return {
      label: cols[0] ?? "",
      type: cols[1] ?? "unknown",
      source: cols[2] ?? "",
      detail: cols[3] ?? "",
    };
  });
}

function parseEdgesTSV(text: string): Edge[] {
  const lines = text.trim().split("\n");
  return lines.slice(1).map((line) => {
    const [source, target, type, confidence] = line.split("\t");
    return {
      source: Number(source),
      target: Number(target),
      type: type ?? "related_to",
      confidence: Number(confidence),
    };
  });
}

// ---------------------------------------------------------------------------
// Embedding & similarity via local Ollama
// ---------------------------------------------------------------------------

async function embedQuery(query: string): Promise<number[] | null> {
  try {
    const response = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", input: query }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.embeddings[0];
  } catch {
    // Ollama not available (e.g., GitHub Pages) — fall back to text search
    return null;
  }
}

/** Fuzzy text search fallback when Ollama is unavailable */
function textSearch(query: string, points: GalaxyPoint[]): SearchResult[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return points
    .map((point) => {
      const text = `${point.metadata.label} ${point.metadata.type} ${point.metadata.detail}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (text.includes(w)) score += 1;
      }
      // Boost exact label matches
      if (point.metadata.label.toLowerCase().includes(q)) score += 2;
      return { point, similarity: score / (words.length + 2) };
    })
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------------------------------------------------------------------------
// UMAP projection
// ---------------------------------------------------------------------------

function projectToGalaxy(
  vectors: number[][],
  metadata: MetadataRow[],
): GalaxyPoint[] {
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 15,
    minDist: 0.1,
    spread: 1.0,
  });

  const projected = umap.fit(vectors);

  // Find extents so we can normalize to the galaxy radius
  let maxExtent = 0;
  for (const p of projected) {
    for (const v of p) {
      const abs = Math.abs(v);
      if (abs > maxExtent) maxExtent = abs;
    }
  }
  const scale = maxExtent > 0 ? GALAXY_RADIUS / maxExtent : 1;

  return projected.map((pos, i) => ({
    index: i,
    position: [pos[0] * scale, pos[1] * scale, pos[2] * scale] as [
      number,
      number,
      number,
    ],
    embedding: vectors[i],
    metadata: metadata[i] ?? {
      label: `Point ${i}`,
      type: "unknown",
      source: "",
      detail: "",
    },
    color: getTypeColor(metadata[i]?.type ?? "unknown"),
  }));
}

// ---------------------------------------------------------------------------
// 3D Components
// ---------------------------------------------------------------------------

/** Animated camera that smoothly flies to a target position */
function CameraController({
  target,
  enabled,
}: {
  target: THREE.Vector3 | null;
  enabled: boolean;
}) {
  const { camera } = useThree();
  const currentTarget = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (target) {
      // Calculate a position offset from the target so we look at it
      const dir = target.clone().normalize();
      const dest = target
        .clone()
        .add(dir.multiplyScalar(FOCUS_DISTANCE));
      currentTarget.current = dest;
    }
  }, [target]);

  useFrame(() => {
    if (!enabled || !currentTarget.current) return;
    camera.position.lerp(currentTarget.current, 0.03);
    const lookTarget = currentTarget.current
      .clone()
      .sub(
        currentTarget.current
          .clone()
          .normalize()
          .multiplyScalar(FOCUS_DISTANCE),
      );
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    camera.lookAt(lookTarget);
  });

  return null;
}

/** Single interactive sphere representing a knowledge point */
function InteractiveSphere({
  point,
  isHighlighted,
  isSelected,
  onHover,
  onClick,
}: {
  point: GalaxyPoint;
  isHighlighted: boolean;
  isSelected: boolean;
  onHover: (point: GalaxyPoint | null) => void;
  onClick: (point: GalaxyPoint) => void;
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
      position={point.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(point);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(point);
      }}
    >
      <sphereGeometry args={[baseSize, 16, 16]} />
      <meshStandardMaterial
        color={point.color}
        emissive={point.color}
        emissiveIntensity={isHighlighted ? 2.5 : isSelected ? 3.0 : 0.8}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Instanced points for rendering large numbers of non-highlighted points efficiently */
function GalaxyPoints({
  points,
  highlightedIndices,
  selectedIndex,
  onHover,
  onClick,
}: {
  points: GalaxyPoint[];
  highlightedIndices: Set<number>;
  selectedIndex: number | null;
  onHover: (point: GalaxyPoint | null) => void;
  onClick: (point: GalaxyPoint) => void;
}) {
  // Split into highlighted (interactive spheres) and background (instanced)
  const { highlighted, background } = useMemo(() => {
    const h: GalaxyPoint[] = [];
    const b: GalaxyPoint[] = [];
    for (const p of points) {
      if (highlightedIndices.has(p.index) || p.index === selectedIndex) {
        h.push(p);
      } else {
        b.push(p);
      }
    }
    return { highlighted: h, background: b };
  }, [points, highlightedIndices, selectedIndex]);

  // Instanced mesh for background points
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!instancedRef.current) return;
    const mesh = instancedRef.current;
    const colors: number[] = [];
    background.forEach((p, i) => {
      dummy.position.set(...p.position);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const c = new THREE.Color(p.color);
      colors.push(c.r, c.g, c.b);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.geometry.setAttribute(
      "color",
      new THREE.InstancedBufferAttribute(new Float32Array(colors), 3),
    );
  }, [background, dummy]);

  return (
    <group>
      {/* Background points as instanced mesh */}
      {background.length > 0 && (
        <instancedMesh
          ref={instancedRef}
          args={[undefined, undefined, background.length]}
          onPointerOver={(e) => {
            e.stopPropagation();
            const idx = e.instanceId;
            if (idx !== undefined && background[idx]) {
              onHover(background[idx]);
              document.body.style.cursor = "pointer";
            }
          }}
          onPointerOut={() => {
            onHover(null);
            document.body.style.cursor = "auto";
          }}
          onClick={(e) => {
            e.stopPropagation();
            const idx = e.instanceId;
            if (idx !== undefined && background[idx]) {
              onClick(background[idx]);
            }
          }}
        >
          <sphereGeometry args={[POINT_SIZE, 8, 8]} />
          <meshStandardMaterial
            emissive="#ffffff"
            emissiveIntensity={0.5}
            toneMapped={false}
            vertexColors
          />
        </instancedMesh>
      )}

      {/* Highlighted points as individual meshes for animation */}
      {highlighted.map((p) => (
        <InteractiveSphere
          key={p.index}
          point={p}
          isHighlighted={highlightedIndices.has(p.index)}
          isSelected={p.index === selectedIndex}
          onHover={onHover}
          onClick={onClick}
        />
      ))}
    </group>
  );
}

/** Efficient connection lines using LineSegments with vertex colors */
function ConnectionLines({
  points,
  edges,
  selectedIndex,
  showEdges,
}: {
  points: GalaxyPoint[];
  edges: Edge[];
  selectedIndex: number | null;
  showEdges: boolean;
}) {
  const linesRef = useRef<THREE.LineSegments>(null);

  const { positions, colors } = useMemo(() => {
    if (!showEdges || edges.length === 0)
      return { positions: new Float32Array(0), colors: new Float32Array(0) };

    // Filter edges: if a point is selected, only show its connections
    const activeEdges =
      selectedIndex !== null
        ? edges.filter(
            (e) => e.source === selectedIndex || e.target === selectedIndex,
          )
        : edges;

    const pos = new Float32Array(activeEdges.length * 6);
    const col = new Float32Array(activeEdges.length * 6);

    activeEdges.forEach((edge, i) => {
      const src = points[edge.source];
      const tgt = points[edge.target];
      if (!src || !tgt) return;

      const color = new THREE.Color(getEdgeColor(edge.type));
      const opacity = selectedIndex !== null ? 1.0 : 0.15;

      // Source point
      pos[i * 6 + 0] = src.position[0];
      pos[i * 6 + 1] = src.position[1];
      pos[i * 6 + 2] = src.position[2];
      // Target point
      pos[i * 6 + 3] = tgt.position[0];
      pos[i * 6 + 4] = tgt.position[1];
      pos[i * 6 + 5] = tgt.position[2];

      // Colors (multiplied by opacity for brightness control)
      col[i * 6 + 0] = color.r * opacity;
      col[i * 6 + 1] = color.g * opacity;
      col[i * 6 + 2] = color.b * opacity;
      col[i * 6 + 3] = color.r * opacity;
      col[i * 6 + 4] = color.g * opacity;
      col[i * 6 + 5] = color.b * opacity;
    });

    return { positions: pos, colors: col };
  }, [points, edges, selectedIndex, showEdges]);

  if (positions.length === 0) return null;

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.6} linewidth={1} />
    </lineSegments>
  );
}

/** Tooltip that follows hovered point */
function PointTooltip({ point }: { point: GalaxyPoint }) {
  return (
    <Html position={point.position} center style={{ pointerEvents: "none" }}>
      <div className="rounded-lg bg-black/80 backdrop-blur-sm border border-white/20 px-3 py-2 whitespace-nowrap transform -translate-y-10">
        <p className="text-sm font-semibold text-white">{point.metadata.label}</p>
        <p className="text-xs text-white/60">{point.metadata.type}</p>
      </div>
    </Html>
  );
}

/** The 3D galaxy scene */
function GalaxyScene({
  points,
  edges,
  searchResults,
  selectedPoint,
  showEdges,
  onHover,
  onClick,
  hoveredPoint,
  cameraTarget,
  cameraEnabled,
}: {
  points: GalaxyPoint[];
  edges: Edge[];
  searchResults: SearchResult[];
  selectedPoint: GalaxyPoint | null;
  showEdges: boolean;
  onHover: (p: GalaxyPoint | null) => void;
  onClick: (p: GalaxyPoint) => void;
  hoveredPoint: GalaxyPoint | null;
  cameraTarget: THREE.Vector3 | null;
  cameraEnabled: boolean;
}) {
  const highlightedIndices = useMemo(
    () => new Set(searchResults.map((r) => r.point.index)),
    [searchResults],
  );

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[20, 20, 20]} intensity={0.5} />

      <Stars
        radius={100}
        depth={80}
        count={3000}
        factor={4}
        saturation={0.2}
        fade
        speed={0.5}
      />

      <ConnectionLines
        points={points}
        edges={edges}
        selectedIndex={selectedPoint?.index ?? null}
        showEdges={showEdges}
      />

      <GalaxyPoints
        points={points}
        highlightedIndices={highlightedIndices}
        selectedIndex={selectedPoint?.index ?? null}
        onHover={onHover}
        onClick={onClick}
      />

      {hoveredPoint && <PointTooltip point={hoveredPoint} />}

      <CameraController target={cameraTarget} enabled={cameraEnabled} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={80}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// ---------------------------------------------------------------------------
// UI Components
// ---------------------------------------------------------------------------

function StatsHUD({
  total,
  entities,
  memories,
  edgeCount,
  types,
}: {
  total: number;
  entities: number;
  memories: number;
  edgeCount: number;
  types: Map<string, number>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-left hover:border-white/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-white tabular-nums">{total}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">points</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-sm font-semibold text-amber-400 tabular-nums">{entities}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">entities</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-sm font-semibold text-blue-400 tabular-nums">{memories}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">memories</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-sm font-semibold text-emerald-400 tabular-nums">{edgeCount}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">edges</p>
          </div>
          <svg
            className={`w-3 h-3 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="mt-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 max-h-60 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Types</p>
          {[...types.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 py-0.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getTypeColor(type) }}
                />
                <span className="text-xs text-white/70 flex-1">{type}</span>
                <span className="text-xs text-white/40 tabular-nums">{count}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function SearchBar({
  onSearch,
  isSearching,
}: {
  onSearch: (query: string) => void;
  isSearching: boolean;
}) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(v);
    }, SEARCH_DEBOUNCE_MS);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Search knowledge galaxy..."
          className="w-full bg-black/60 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <svg className="w-5 h-5 text-blue-400 animate-spin-slow" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  results,
  selectedPoint,
  edges,
  points,
  onSelect,
  onClose,
}: {
  results: SearchResult[];
  selectedPoint: GalaxyPoint | null;
  edges: Edge[];
  points: GalaxyPoint[];
  onSelect: (point: GalaxyPoint) => void;
  onClose: () => void;
}) {
  // Compute connections for the selected point
  const connections = useMemo(() => {
    if (!selectedPoint) return [];
    return edges
      .filter(
        (e) =>
          e.source === selectedPoint.index ||
          e.target === selectedPoint.index,
      )
      .map((e) => {
        const otherIndex =
          e.source === selectedPoint.index ? e.target : e.source;
        const otherPoint = points[otherIndex];
        return { edge: e, otherPoint };
      })
      .filter((c) => c.otherPoint != null)
      .sort((a, b) => b.edge.confidence - a.edge.confidence);
  }, [selectedPoint, edges, points]);

  if (results.length === 0 && !selectedPoint) return null;

  return (
    <div className="absolute top-4 left-4 bottom-20 z-10 w-80 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white/80">
          {selectedPoint ? "Point Details" : `Search Results (${results.length})`}
        </h2>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Selected point detail */}
      {selectedPoint && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedPoint.color }}
            />
            <h3 className="text-sm font-bold text-white truncate">
              {selectedPoint.metadata.label}
            </h3>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-white/50">
              <span className="text-white/30">Type:</span>{" "}
              <span className="text-white/70">{selectedPoint.metadata.type}</span>
            </p>
            <p className="text-xs text-white/50">
              <span className="text-white/30">Source:</span>{" "}
              <span className="text-white/70">{selectedPoint.metadata.source}</span>
            </p>
            {selectedPoint.metadata.detail && (
              <p className="text-xs text-white/50 mt-1">
                <span className="text-white/30">Detail:</span>{" "}
                <span className="text-white/70">{selectedPoint.metadata.detail}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Connections section for selected point */}
      {selectedPoint && connections.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
            Connections ({connections.length})
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {connections.map((c) => (
              <button
                key={`${c.edge.source}-${c.edge.target}-${c.edge.type}`}
                onClick={() => onSelect(c.otherPoint!)}
                className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: c.otherPoint!.color }}
                />
                <span className="text-xs text-white/70 truncate flex-1 group-hover:text-white/90">
                  {c.otherPoint!.metadata.label}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: getEdgeColor(c.edge.type) + "22",
                    color: getEdgeColor(c.edge.type),
                  }}
                >
                  {c.edge.type.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] text-white/30 tabular-nums flex-shrink-0">
                  {(c.edge.confidence * 100).toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edge type legend for selected point */}
      {selectedPoint && connections.length > 0 && (
        <div className="px-4 py-2 border-b border-white/10">
          <div className="flex flex-wrap gap-2">
            {Object.entries(EDGE_TYPE_COLORS)
              .filter(([type]) =>
                connections.some((c) => c.edge.type === type),
              )
              .map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[9px] text-white/40">
                    {type.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {results.map((r) => (
          <button
            key={r.point.index}
            onClick={() => onSelect(r.point)}
            className={`w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 cursor-pointer ${
              r.point.index === selectedPoint?.index ? "bg-white/10" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: r.point.color }}
              />
              <span className="text-xs font-medium text-white/80 truncate flex-1">
                {r.point.metadata.label}
              </span>
              <span className="text-[10px] text-white/30 tabular-nums flex-shrink-0">
                {(r.similarity * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-[10px] text-white/30 mt-0.5 ml-4 truncate">
              {r.point.metadata.type} -- {r.point.metadata.source}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Header({
  onRefresh,
  isRefreshing,
  showEdges,
  onToggleEdges,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
  showEdges: boolean;
  onToggleEdges: () => void;
}) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
      <Logo className="w-10 h-10 animate-spin-slow" />
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Lurkr Knowledge Galaxy
        </h1>
        <p className="text-[10px] text-white/30 uppercase tracking-widest">
          pgvector embedding visualizer
        </p>
      </div>
      <button
        onClick={onToggleEdges}
        className={`ml-2 p-2 rounded-lg border transition-all cursor-pointer ${
          showEdges
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70"
        }`}
        title={showEdges ? "Hide connections" : "Show connections"}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      </button>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white/70 transition-all disabled:opacity-30 cursor-pointer"
        title="Refresh data"
      >
        <svg
          className={`w-4 h-4 ${isRefreshing ? "animate-spin-slow" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}

function LoadingScreen({ status }: { status: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
      <Logo className="w-24 h-24 animate-spin-slow mb-6" />
      <h1 className="text-2xl font-bold text-white mb-2">Lurkr Knowledge Galaxy</h1>
      <p className="text-sm text-blue-400 animate-pulse-glow">{status}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [points, setPoints] = useState<GalaxyPoint[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadStatus, setLoadStatus] = useState("Initializing...");
  const [refreshing, setRefreshing] = useState(false);
  const [showEdges, setShowEdges] = useState(true);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<GalaxyPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<GalaxyPoint | null>(null);
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const types = new Map<string, number>();
    let entities = 0;
    let memories = 0;
    for (const p of points) {
      const t = p.metadata.type.toLowerCase();
      types.set(t, (types.get(t) ?? 0) + 1);
      const cat = getTypeCategory(t);
      if (cat === "entity") entities++;
      else if (cat === "memory") memories++;
    }
    return { total: points.length, entities, memories, types };
  }, [points]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoadStatus("Fetching embeddings...");
      const cacheBuster = `?t=${Date.now()}`;
      const base = import.meta.env.BASE_URL;
      const [vectorsResp, metadataResp, edgesResp] = await Promise.all([
        fetch(`${base}data/vectors.tsv${cacheBuster}`),
        fetch(`${base}data/metadata.tsv${cacheBuster}`),
        fetch(`${base}data/edges.tsv${cacheBuster}`).catch(() => null),
      ]);

      if (!vectorsResp.ok || !metadataResp.ok) {
        throw new Error("Failed to fetch TSV files. Make sure public/data/ is symlinked.");
      }

      const [vectorsText, metadataText] = await Promise.all([
        vectorsResp.text(),
        metadataResp.text(),
      ]);

      // Parse edges if available (graceful fallback to empty array)
      let parsedEdges: Edge[] = [];
      if (edgesResp && edgesResp.ok) {
        const edgesText = await edgesResp.text();
        parsedEdges = parseEdgesTSV(edgesText);
        console.log(`Loaded ${parsedEdges.length} edges`);
      }

      setLoadStatus("Parsing vectors...");
      const vectors = parseVectorsTSV(vectorsText);
      const metadata = parseMetadataTSV(metadataText);

      console.log(`Loaded ${vectors.length} vectors, ${metadata.length} metadata rows`);

      setLoadStatus(`Running UMAP on ${vectors.length} points...`);

      // Run UMAP in a microtask to avoid blocking UI
      await new Promise((resolve) => setTimeout(resolve, 50));
      const galaxyPoints = projectToGalaxy(vectors, metadata);

      setPoints(galaxyPoints);
      setEdges(parsedEdges);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error("Failed to load data:", err);
      setLoadStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchResults([]);
    setSelectedPoint(null);
    setCameraTarget(null);
    setCameraEnabled(false);
    loadData();
  }, [loadData]);

  // Search handler
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setCameraTarget(null);
        setCameraEnabled(false);
        return;
      }

      setIsSearching(true);
      try {
        const queryEmbedding = await embedQuery(query.trim());
        let results: SearchResult[];

        if (queryEmbedding) {
          // Semantic search via Ollama embeddings
          results = points
            .map((point) => ({
              point,
              similarity: cosineSimilarity(queryEmbedding, point.embedding),
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, MAX_SEARCH_RESULTS);
        } else {
          // Fallback: fuzzy text search (when Ollama unavailable, e.g. GitHub Pages)
          results = textSearch(query.trim(), points);
        }

        setSearchResults(results);

        // Fly to top result
        if (results.length > 0) {
          const top = results[0].point;
          setCameraTarget(new THREE.Vector3(...top.position));
          setCameraEnabled(true);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [points],
  );

  const handlePointClick = useCallback((point: GalaxyPoint) => {
    setSelectedPoint(point);
    setCameraTarget(new THREE.Vector3(...point.position));
    setCameraEnabled(true);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSearchResults([]);
    setSelectedPoint(null);
    setCameraTarget(null);
    setCameraEnabled(false);
  }, []);

  const handleToggleEdges = useCallback(() => {
    setShowEdges((prev) => !prev);
  }, []);

  if (loading) {
    return <LoadingScreen status={loadStatus} />;
  }

  return (
    <div className="w-full h-full relative">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 35], fov: 60, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#000" }}
      >
        <GalaxyScene
          points={points}
          edges={edges}
          searchResults={searchResults}
          selectedPoint={selectedPoint}
          showEdges={showEdges}
          onHover={setHoveredPoint}
          onClick={handlePointClick}
          hoveredPoint={hoveredPoint}
          cameraTarget={cameraTarget}
          cameraEnabled={cameraEnabled}
        />
      </Canvas>

      {/* UI Overlays */}
      <Header
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
        showEdges={showEdges}
        onToggleEdges={handleToggleEdges}
      />
      <StatsHUD
        total={stats.total}
        entities={stats.entities}
        memories={stats.memories}
        edgeCount={edges.length}
        types={stats.types}
      />
      <SearchBar onSearch={handleSearch} isSearching={isSearching} />
      <Sidebar
        results={searchResults}
        selectedPoint={selectedPoint}
        edges={edges}
        points={points}
        onSelect={handlePointClick}
        onClose={handleSidebarClose}
      />
    </div>
  );
}
