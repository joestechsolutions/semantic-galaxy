# Semantic Galaxy Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Semantic Galaxy into a professional embedding explorer with progressive disclosure, mobile 60/40 split, clustering, color modes, 2D/3D toggle, and power-user tools.

**Architecture:** Refactor 1147-line monolith App.tsx into focused modules with Zustand state management. Add DBSCAN clustering, multiple color modes, 2D/3D projection toggle, and responsive mobile layout. All computation client-side on existing TSV data.

**Tech Stack:** React 19, Three.js/R3F, Zustand, Tailwind CSS v4, umap-js, density-clustering (DBSCAN), Vite, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-03-24-galaxy-enhancements-design.md`

---

## Chunk 1: Foundation (Tasks 1-4)

### Task 1: Install dependencies and set up project scaffolding

**Files:**
- Modify: `package.json`
- Create: `src/types.ts`
- Create: `src/store.ts`

- [ ] **Step 1: Install new dependencies**

```bash
cd /home/lurkr-bot/Projects/semantic-galaxy
npm install zustand density-clustering
```

If `density-clustering` fails to install (it's old/CommonJS), skip it — we'll inline DBSCAN in Task 10.

- [ ] **Step 2: Create shared TypeScript interfaces at `src/types.ts`**

Extract all interfaces from App.tsx into a shared file. These types are used across every module.

```typescript
// src/types.ts
import * as THREE from "three";

export interface MetadataRow {
  label: string;
  type: string;
  source: string;
  detail: string;
}

export interface GalaxyPoint {
  index: number;
  position: [number, number, number];
  /** Pre-computed 2D position for 2D/3D toggle (z=0) */
  position2D: [number, number, number];
  embedding: number[];
  metadata: MetadataRow;
  color: string;
}

export interface SearchResult {
  point: GalaxyPoint;
  similarity: number;
}

export interface Edge {
  source: number;
  target: number;
  type: string;
  confidence: number;
}

export interface ClusterInfo {
  id: number;
  label: string;
  dominantType: string;
  pointCount: number;
  color: string;
}

export type ColorMode = "type" | "cluster" | "source" | "density";

export type DimensionMode = "3d" | "2d";
```

- [ ] **Step 3: Create Zustand store at `src/store.ts`**

Central state management replacing the 11 `useState` calls in App.tsx.

```typescript
// src/store.ts
import { create } from "zustand";
import * as THREE from "three";
import type {
  GalaxyPoint,
  Edge,
  SearchResult,
  ClusterInfo,
  ColorMode,
  DimensionMode,
} from "./types";

interface GalaxyState {
  // Data
  points: GalaxyPoint[];
  edges: Edge[];
  clusters: ClusterInfo[];
  clusterAssignments: number[]; // cluster ID per point index, -1 = noise

  // Loading
  loading: boolean;
  loadStatus: string;
  refreshing: boolean;

  // UI modes
  powerMode: boolean;
  colorMode: ColorMode;
  dimensionMode: DimensionMode;
  showEdges: boolean;
  showClusters: boolean;
  autoRotate: boolean;

  // Selection & search
  searchResults: SearchResult[];
  isSearching: boolean;
  hoveredPoint: GalaxyPoint | null;
  selectedPoint: GalaxyPoint | null;
  cameraTarget: THREE.Vector3 | null;
  cameraEnabled: boolean;
  selectedSearchIndex: number; // for arrow key cycling, -1 = none

  // Actions
  setPoints: (points: GalaxyPoint[]) => void;
  setEdges: (edges: Edge[]) => void;
  setClusters: (clusters: ClusterInfo[], assignments: number[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadStatus: (status: string) => void;
  setRefreshing: (refreshing: boolean) => void;
  setPowerMode: (on: boolean) => void;
  setColorMode: (mode: ColorMode) => void;
  setDimensionMode: (mode: DimensionMode) => void;
  setShowEdges: (show: boolean) => void;
  setShowClusters: (show: boolean) => void;
  setAutoRotate: (on: boolean) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setIsSearching: (searching: boolean) => void;
  setHoveredPoint: (point: GalaxyPoint | null) => void;
  setSelectedPoint: (point: GalaxyPoint | null) => void;
  setCameraTarget: (target: THREE.Vector3 | null) => void;
  setCameraEnabled: (enabled: boolean) => void;
  setSelectedSearchIndex: (index: number) => void;

  // Compound actions
  selectPoint: (point: GalaxyPoint) => void;
  clearSelection: () => void;
  resetView: () => void;
  flyToPoint: (point: GalaxyPoint) => void;
}

export const useGalaxyStore = create<GalaxyState>((set) => ({
  // Data
  points: [],
  edges: [],
  clusters: [],
  clusterAssignments: [],

  // Loading
  loading: true,
  loadStatus: "Initializing...",
  refreshing: false,

  // UI modes
  powerMode: false,
  colorMode: "type",
  dimensionMode: "3d",
  showEdges: true,
  showClusters: false,
  autoRotate: true,

  // Selection & search
  searchResults: [],
  isSearching: false,
  hoveredPoint: null,
  selectedPoint: null,
  cameraTarget: null,
  cameraEnabled: false,
  selectedSearchIndex: -1,

  // Simple setters
  setPoints: (points) => set({ points }),
  setEdges: (edges) => set({ edges }),
  setClusters: (clusters, assignments) =>
    set({ clusters, clusterAssignments: assignments }),
  setLoading: (loading) => set({ loading }),
  setLoadStatus: (loadStatus) => set({ loadStatus }),
  setRefreshing: (refreshing) => set({ refreshing }),
  setPowerMode: (powerMode) => set({ powerMode }),
  setColorMode: (colorMode) => set({ colorMode }),
  setDimensionMode: (dimensionMode) => set({ dimensionMode }),
  setShowEdges: (showEdges) => set({ showEdges }),
  setShowClusters: (showClusters) => set({ showClusters }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setSearchResults: (searchResults) => set({ searchResults, selectedSearchIndex: -1 }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setHoveredPoint: (hoveredPoint) => set({ hoveredPoint }),
  setSelectedPoint: (selectedPoint) => set({ selectedPoint }),
  setCameraTarget: (cameraTarget) => set({ cameraTarget }),
  setCameraEnabled: (cameraEnabled) => set({ cameraEnabled }),
  setSelectedSearchIndex: (selectedSearchIndex) => set({ selectedSearchIndex }),

  // Compound actions
  selectPoint: (point) =>
    set({
      selectedPoint: point,
      cameraTarget: new THREE.Vector3(...point.position),
      cameraEnabled: true,
      autoRotate: false,
    }),

  clearSelection: () =>
    set({
      selectedPoint: null,
      searchResults: [],
      cameraTarget: null,
      cameraEnabled: false,
      selectedSearchIndex: -1,
    }),

  resetView: () =>
    set({
      selectedPoint: null,
      searchResults: [],
      cameraTarget: null,
      cameraEnabled: false,
      autoRotate: true,
      selectedSearchIndex: -1,
    }),

  flyToPoint: (point) =>
    set({
      cameraTarget: new THREE.Vector3(...point.position),
      cameraEnabled: true,
      autoRotate: false,
    }),
}));
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors. The new files are unused but importable.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/store.ts package.json package-lock.json
git commit -m "feat: add types, Zustand store, and new dependencies

Foundation for galaxy enhancements — shared interfaces,
centralized state management, density-clustering for DBSCAN."
```

---

### Task 2: Extract lib modules (parsers, colors, UMAP, clustering, screenshot)

**Files:**
- Create: `src/lib/parsers.ts`
- Create: `src/lib/colors.ts`
- Create: `src/lib/umap.ts`
- Create: `src/lib/clustering.ts`
- Create: `src/lib/screenshot.ts`
- Create: `src/lib/search.ts`

- [ ] **Step 1: Create `src/lib/parsers.ts`**

Extract the three TSV parsers from App.tsx (lines 56-90). No changes to logic.

```typescript
// src/lib/parsers.ts
import type { MetadataRow, Edge } from "../types";

export function parseVectorsTSV(text: string): number[][] {
  return text
    .trim()
    .split("\n")
    .map((line) => line.split("\t").map(Number));
}

export function parseMetadataTSV(text: string): MetadataRow[] {
  const lines = text.trim().split("\n");
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

export function parseEdgesTSV(text: string): Edge[] {
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
```

- [ ] **Step 2: Create `src/lib/colors.ts`**

Color computation for all four color modes. Hand-rolled palettes (no d3).

```typescript
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
```

- [ ] **Step 3: Create `src/lib/umap.ts`**

UMAP projection helper — runs both 3D and 2D projections, normalizes to galaxy radius.

```typescript
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
```

- [ ] **Step 4: Create `src/lib/clustering.ts`**

DBSCAN clustering on 3D UMAP positions. Try importing `density-clustering`; if it fails at runtime, use inline implementation.

```typescript
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
```

- [ ] **Step 5: Create `src/lib/search.ts`**

Extract search logic from App.tsx (lines 96-142).

```typescript
// src/lib/search.ts
import type { GalaxyPoint, SearchResult } from "../types";
import { MAX_SEARCH_RESULTS } from "../constants";

export async function embedQuery(query: string): Promise<number[] | null> {
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
    return null;
  }
}

export function textSearch(query: string, points: GalaxyPoint[]): SearchResult[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return points
    .map((point) => {
      const text = `${point.metadata.label} ${point.metadata.type} ${point.metadata.detail}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (text.includes(w)) score += 1;
      }
      if (point.metadata.label.toLowerCase().includes(q)) score += 2;
      return { point, similarity: score / (words.length + 2) };
    })
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_SEARCH_RESULTS);
}

export function cosineSimilarity(a: number[], b: number[]): number {
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

export async function performSearch(
  query: string,
  points: GalaxyPoint[],
): Promise<SearchResult[]> {
  const queryEmbedding = await embedQuery(query);
  if (queryEmbedding) {
    return points
      .map((point) => ({
        point,
        similarity: cosineSimilarity(queryEmbedding, point.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, MAX_SEARCH_RESULTS);
  }
  return textSearch(query, points);
}
```

- [ ] **Step 6: Create `src/lib/screenshot.ts`**

Canvas screenshot export with mobile share API support.

```typescript
// src/lib/screenshot.ts

/**
 * Capture the R3F canvas and trigger a download (or native share on mobile).
 * REQUIRES: <Canvas gl={{ preserveDrawingBuffer: true }}> to work.
 */
export function captureScreenshot(canvas: HTMLCanvasElement): void {
  const dataURL = canvas.toDataURL("image/png");
  const filename = `semantic-galaxy-${Date.now()}.png`;

  // Try native share on mobile
  if (navigator.share && navigator.canShare) {
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], filename, { type: "image/png" });
      try {
        await navigator.share({ files: [file], title: "Semantic Galaxy" });
        return;
      } catch {
        // Share cancelled or unsupported — fall through to download
      }
    });
    return;
  }

  // Fallback: download link
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = filename;
  link.click();
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: Build succeeds. All lib files compile without errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/
git commit -m "feat: extract lib modules — parsers, colors, UMAP, clustering, search, screenshot

Pure logic modules with no React dependencies (except search
which uses fetch). Inline DBSCAN implementation (~50 lines)
instead of relying on the abandoned density-clustering package."
```

---

### Task 3: Extract hooks (useGalaxyData, useSearch, useColorMode, useMobileDetect)

**Files:**
- Create: `src/hooks/useGalaxyData.ts`
- Create: `src/hooks/useSearch.ts`
- Create: `src/hooks/useColorMode.ts`
- Create: `src/hooks/useMobileDetect.ts`

- [ ] **Step 1: Create `src/hooks/useMobileDetect.ts`**

```typescript
// src/hooks/useMobileDetect.ts
import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useMobileDetect(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.innerWidth <= MOBILE_BREAKPOINT ||
      "ontouchstart" in window
    );
  });

  useEffect(() => {
    const check = () => {
      setIsMobile(
        window.innerWidth <= MOBILE_BREAKPOINT ||
        "ontouchstart" in window
      );
    };
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
```

- [ ] **Step 2: Create `src/hooks/useColorMode.ts`**

```typescript
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
```

- [ ] **Step 3: Create `src/hooks/useSearch.ts`**

```typescript
// src/hooks/useSearch.ts
import { useCallback } from "react";
import * as THREE from "three";
import { useGalaxyStore } from "../store";
import { performSearch } from "../lib/search";

export function useSearch() {
  const points = useGalaxyStore((s) => s.points);
  const setSearchResults = useGalaxyStore((s) => s.setSearchResults);
  const setIsSearching = useGalaxyStore((s) => s.setIsSearching);
  const flyToPoint = useGalaxyStore((s) => s.flyToPoint);
  const clearSelection = useGalaxyStore((s) => s.clearSelection);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        clearSelection();
        return;
      }

      setIsSearching(true);
      try {
        const results = await performSearch(query.trim(), points);
        setSearchResults(results);

        if (results.length > 0) {
          flyToPoint(results[0].point);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [points, setSearchResults, setIsSearching, flyToPoint, clearSelection],
  );

  return handleSearch;
}
```

- [ ] **Step 4: Create `src/hooks/useGalaxyData.ts`**

Data loading hook — fetches TSVs, runs dual UMAP, computes clusters.

```typescript
// src/hooks/useGalaxyData.ts
import { useCallback, useEffect } from "react";
import { useGalaxyStore } from "../store";
import { parseVectorsTSV, parseMetadataTSV, parseEdgesTSV } from "../lib/parsers";
import { projectBoth } from "../lib/umap";
import { computeClusters } from "../lib/clustering";
import { getTypeColor } from "../constants";
import type { GalaxyPoint } from "../types";

export function useGalaxyData() {
  const setPoints = useGalaxyStore((s) => s.setPoints);
  const setEdges = useGalaxyStore((s) => s.setEdges);
  const setClusters = useGalaxyStore((s) => s.setClusters);
  const setLoading = useGalaxyStore((s) => s.setLoading);
  const setLoadStatus = useGalaxyStore((s) => s.setLoadStatus);
  const setRefreshing = useGalaxyStore((s) => s.setRefreshing);

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
        throw new Error("Failed to fetch TSV data files.");
      }

      const [vectorsText, metadataText] = await Promise.all([
        vectorsResp.text(),
        metadataResp.text(),
      ]);

      let parsedEdges: { source: number; target: number; type: string; confidence: number }[] = [];
      if (edgesResp && edgesResp.ok) {
        const edgesText = await edgesResp.text();
        parsedEdges = parseEdgesTSV(edgesText);
      }

      setLoadStatus("Parsing vectors...");
      const vectors = parseVectorsTSV(vectorsText);
      const metadata = parseMetadataTSV(metadataText);

      setLoadStatus(`Running UMAP on ${vectors.length} points (3D + 2D)...`);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const { positions3D, positions2D } = projectBoth(vectors);

      const galaxyPoints: GalaxyPoint[] = positions3D.map((pos, i) => ({
        index: i,
        position: pos,
        position2D: positions2D[i],
        embedding: vectors[i],
        metadata: metadata[i] ?? {
          label: `Point ${i}`,
          type: "unknown",
          source: "",
          detail: "",
        },
        color: getTypeColor(metadata[i]?.type ?? "unknown"),
      }));

      setLoadStatus("Computing clusters...");
      const { clusters, assignments } = computeClusters(galaxyPoints);

      setPoints(galaxyPoints);
      setEdges(parsedEdges);
      setClusters(clusters, assignments);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error("Failed to load data:", err);
      setLoadStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [setPoints, setEdges, setClusters, setLoading, setLoadStatus, setRefreshing]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { reload: loadData };
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/
git commit -m "feat: extract hooks — useGalaxyData, useSearch, useColorMode, useMobileDetect

Hooks consume Zustand store and lib modules. useGalaxyData runs
dual UMAP (3D+2D) and DBSCAN clustering on load."
```

---

### Task 4: Extract 3D scene components

**Files:**
- Create: `src/components/CameraController.tsx`
- Create: `src/components/GalaxyPoints.tsx`
- Create: `src/components/ConnectionLines.tsx`
- Create: `src/components/PointTooltip.tsx`
- Create: `src/components/GalaxyCanvas.tsx`
- Create: `src/components/ClusterBoundaries.tsx`

- [ ] **Step 1: Create `src/components/CameraController.tsx`**

Same logic as current, but reads from Zustand store and adds auto-rotation support.

```typescript
// src/components/CameraController.tsx
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useGalaxyStore } from "../store";
import { FOCUS_DISTANCE } from "../constants";

export function CameraController() {
  const cameraTarget = useGalaxyStore((s) => s.cameraTarget);
  const cameraEnabled = useGalaxyStore((s) => s.cameraEnabled);
  const autoRotate = useGalaxyStore((s) => s.autoRotate);
  const setAutoRotate = useGalaxyStore((s) => s.setAutoRotate);
  const { camera } = useThree();
  const currentTarget = useRef<THREE.Vector3 | null>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (cameraTarget) {
      const dir = cameraTarget.clone().normalize();
      const dest = cameraTarget.clone().add(dir.multiplyScalar(FOCUS_DISTANCE));
      currentTarget.current = dest;
    }
  }, [cameraTarget]);

  useFrame(() => {
    if (!cameraEnabled || !currentTarget.current) return;
    camera.position.lerp(currentTarget.current, 0.03);
    const lookTarget = currentTarget.current
      .clone()
      .sub(
        currentTarget.current.clone().normalize().multiplyScalar(FOCUS_DISTANCE),
      );
    camera.lookAt(lookTarget);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={80}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      onChange={() => {
        // Stop auto-rotation on any user interaction
        if (autoRotate) setAutoRotate(false);
      }}
    />
  );
}
```

- [ ] **Step 2: Create `src/components/GalaxyPoints.tsx`**

Same as current but reads colors from `usePointColors()` hook and supports dimension mode lerping.

```typescript
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
        emissiveIntensity={isHighlighted ? 2.5 : isSelected ? 3.0 : 0.8}
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
  const setAutoRotate = useGalaxyStore((s) => s.setAutoRotate);
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

    backgroundIndices.forEach((pointIdx, instanceIdx) => {
      const target = targetPositions[pointIdx];
      const current = positionsRef.current[pointIdx] ?? target;

      // Lerp toward target
      current[0] += (target[0] - current[0]) * lerpSpeed;
      current[1] += (target[1] - current[1]) * lerpSpeed;
      current[2] += (target[2] - current[2]) * lerpSpeed;
      positionsRef.current[pointIdx] = current;

      dummy.position.set(current[0], current[1], current[2]);
      dummy.scale.setScalar(1);
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
              setHoveredPoint(points[backgroundIndices[idx]]);
              document.body.style.cursor = "pointer";
            }
          }}
          onPointerOut={() => {
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
          <sphereGeometry args={[POINT_SIZE, 8, 8]} />
          <meshStandardMaterial
            emissive="#ffffff"
            emissiveIntensity={0.5}
            toneMapped={false}
            vertexColors
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
```

- [ ] **Step 3: Create `src/components/ConnectionLines.tsx`**

Enhanced edges: all 634 always rendered, opacity varies by selection and confidence.

```typescript
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
```

- [ ] **Step 4: Create `src/components/ClusterBoundaries.tsx`**

Convex hull boundaries for clusters, toggled independently.

```typescript
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
```

- [ ] **Step 5: Create `src/components/PointTooltip.tsx`**

```typescript
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
```

- [ ] **Step 6: Create `src/components/GalaxyCanvas.tsx`**

Assembles the full 3D scene — replaces the inline `GalaxyScene` component.

```typescript
// src/components/GalaxyCanvas.tsx
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { CameraController } from "./CameraController";
import { GalaxyPoints } from "./GalaxyPoints";
import { ConnectionLines } from "./ConnectionLines";
import { ClusterBoundaries } from "./ClusterBoundaries";
import { PointTooltip } from "./PointTooltip";

export function GalaxyCanvas({ className }: { className?: string }) {
  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 35], fov: 60, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      style={{ background: "#000" }}
    >
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

      <ConnectionLines />
      <ClusterBoundaries />
      <GalaxyPoints />
      <PointTooltip />
      <CameraController />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/components/CameraController.tsx src/components/GalaxyPoints.tsx \
       src/components/ConnectionLines.tsx src/components/ClusterBoundaries.tsx \
       src/components/PointTooltip.tsx src/components/GalaxyCanvas.tsx
git commit -m "feat: extract 3D scene components from App.tsx

CameraController, GalaxyPoints, ConnectionLines, ClusterBoundaries,
PointTooltip, GalaxyCanvas — all read from Zustand store. Added
auto-rotation, 2D/3D position lerping, confidence-based edge opacity,
and convex hull cluster boundaries."
```

---

## Chunk 2: UI Components (Tasks 5-7)

### Task 5: Extract and enhance UI components (Toolbar, StatsHUD, SearchBar)

**Files:**
- Create: `src/components/Toolbar.tsx`
- Create: `src/components/StatsHUD.tsx`
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/LoadingScreen.tsx`

- [ ] **Step 1: Create `src/components/Toolbar.tsx`**

Collapsible toolbar with all controls. Hidden by default, expands into power mode.

```typescript
// src/components/Toolbar.tsx
import { useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useGalaxyStore } from "../store";
import { useMobileDetect } from "../hooks/useMobileDetect";
import { captureScreenshot } from "../lib/screenshot";
import type { ColorMode } from "../types";

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all cursor-pointer min-w-[3.5rem] ${
        active
          ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
          : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70"
      }`}
      title={label}
    >
      {children}
      <span className="text-[9px] uppercase tracking-wider">{label}</span>
    </button>
  );
}

// Screenshot button needs canvas access — rendered inside Canvas via a portal
// For now, use a simple approach: find the canvas element in the DOM
function useScreenshot() {
  return useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) captureScreenshot(canvas);
  }, []);
}

export function Toolbar() {
  const powerMode = useGalaxyStore((s) => s.powerMode);
  const setPowerMode = useGalaxyStore((s) => s.setPowerMode);
  const colorMode = useGalaxyStore((s) => s.colorMode);
  const setColorMode = useGalaxyStore((s) => s.setColorMode);
  const dimensionMode = useGalaxyStore((s) => s.dimensionMode);
  const setDimensionMode = useGalaxyStore((s) => s.setDimensionMode);
  const showEdges = useGalaxyStore((s) => s.showEdges);
  const setShowEdges = useGalaxyStore((s) => s.setShowEdges);
  const showClusters = useGalaxyStore((s) => s.showClusters);
  const setShowClusters = useGalaxyStore((s) => s.setShowClusters);
  const resetView = useGalaxyStore((s) => s.resetView);
  const isMobile = useMobileDetect();
  const takeScreenshot = useScreenshot();

  // Keyboard shortcuts (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      switch (e.key.toLowerCase()) {
        case "e":
          setShowEdges(!showEdges);
          break;
        case "c":
          setShowClusters(!showClusters);
          break;
        case "2":
          setDimensionMode("2d");
          break;
        case "3":
          setDimensionMode("3d");
          break;
        case "/":
          e.preventDefault();
          document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
          break;
        case "escape":
          useGalaxyStore.getState().clearSelection();
          setPowerMode(false);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, showEdges, showClusters, setShowEdges, setShowClusters, setDimensionMode, setPowerMode]);

  const colorModes: { value: ColorMode; label: string }[] = [
    { value: "type", label: "Type" },
    { value: "cluster", label: "Cluster" },
    { value: "source", label: "Source" },
    { value: "density", label: "Density" },
  ];

  if (!powerMode) {
    return (
      <button
        onClick={() => setPowerMode(true)}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all cursor-pointer"
        title="Open controls"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }

  const toolbarContent = (
    <>
      {/* Color mode dropdown */}
      <div className="relative">
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as ColorMode)}
          className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 cursor-pointer focus:outline-none focus:border-blue-500/50"
        >
          {colorModes.map((m) => (
            <option key={m.value} value={m.value} className="bg-gray-900">
              Color: {m.label}
            </option>
          ))}
        </select>
      </div>

      <ToolbarButton
        active={dimensionMode === "2d"}
        onClick={() => setDimensionMode(dimensionMode === "3d" ? "2d" : "3d")}
        label={dimensionMode === "3d" ? "3D" : "2D"}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {dimensionMode === "3d" ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
          )}
        </svg>
      </ToolbarButton>

      <ToolbarButton active={showEdges} onClick={() => setShowEdges(!showEdges)} label="Edges">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </ToolbarButton>

      <ToolbarButton active={showClusters} onClick={() => setShowClusters(!showClusters)} label="Clusters">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} strokeDasharray="4 2"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={takeScreenshot} label="Screenshot">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
        }}
        label="Fullscreen"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={resetView} label="Reset">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </ToolbarButton>

      {/* Close button */}
      <button
        onClick={() => setPowerMode(false)}
        className="p-2 rounded-lg text-white/30 hover:text-white/60 transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-30"
          onClick={() => setPowerMode(false)}
        />
        {/* Grid panel */}
        <div className="absolute top-4 right-4 z-40 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 grid grid-cols-2 gap-2">
          {toolbarContent}
        </div>
      </>
    );
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2 flex items-center gap-2">
      {toolbarContent}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/StatsHUD.tsx`**

Extract from current App.tsx. Hidden when `powerMode` is false. Positioned below toolbar.

```typescript
// src/components/StatsHUD.tsx
import { useState, useMemo } from "react";
import { useGalaxyStore } from "../store";
import { getTypeColor, getTypeCategory } from "../constants";

export function StatsHUD() {
  const points = useGalaxyStore((s) => s.points);
  const edges = useGalaxyStore((s) => s.edges);
  const clusters = useGalaxyStore((s) => s.clusters);
  const powerMode = useGalaxyStore((s) => s.powerMode);
  const [expanded, setExpanded] = useState(false);

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

  if (!powerMode) return null;

  return (
    <div className="absolute top-16 right-4 z-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-left hover:border-white/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-white tabular-nums">{stats.total}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">points</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-sm font-semibold text-amber-400 tabular-nums">{stats.entities}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">entities</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-sm font-semibold text-blue-400 tabular-nums">{stats.memories}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">memories</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-sm font-semibold text-emerald-400 tabular-nums">{edges.length}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">edges</p>
          </div>
          {clusters.length > 0 && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-right">
                <p className="text-sm font-semibold text-purple-400 tabular-nums">{clusters.length}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">clusters</p>
              </div>
            </>
          )}
          <svg
            className={`w-3 h-3 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="mt-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 max-h-60 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Types</p>
          {[...stats.types.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 py-0.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getTypeColor(type) }} />
                <span className="text-xs text-white/70 flex-1">{type}</span>
                <span className="text-xs text-white/40 tabular-nums">{count}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/SearchBar.tsx`**

Enhanced with filter chips (visible in power mode). Adds `data-search-input` for keyboard shortcut focus.

```typescript
// src/components/SearchBar.tsx
import { useState, useRef } from "react";
import { useGalaxyStore } from "../store";
import { useSearch } from "../hooks/useSearch";
import { SEARCH_DEBOUNCE_MS } from "../constants";

export function SearchBar() {
  const [value, setValue] = useState("");
  const isSearching = useGalaxyStore((s) => s.isSearching);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = useSearch();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => handleSearch(v), SEARCH_DEBOUNCE_MS);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4">
      <div className="relative">
        <input
          type="text"
          data-search-input
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/LoadingScreen.tsx`**

```typescript
// src/components/LoadingScreen.tsx
import Logo from "./Logo";
import { useGalaxyStore } from "../store";

export function LoadingScreen() {
  const status = useGalaxyStore((s) => s.loadStatus);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
      <Logo className="w-24 h-24 animate-spin-slow mb-6" />
      <h1 className="text-2xl font-bold text-white mb-2">Lurkr Knowledge Galaxy</h1>
      <p className="text-sm text-blue-400 animate-pulse-glow">{status}</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Toolbar.tsx src/components/StatsHUD.tsx \
       src/components/SearchBar.tsx src/components/LoadingScreen.tsx
git commit -m "feat: extract UI components — Toolbar, StatsHUD, SearchBar, LoadingScreen

Collapsible toolbar with power mode toggle, keyboard shortcuts,
color mode dropdown, screenshot, fullscreen. All read from Zustand."
```

---

### Task 6: Create Sidebar and MobilePanel components

**Files:**
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/MobilePanel.tsx`

- [ ] **Step 1: Create `src/components/Sidebar.tsx`**

Desktop floating sidebar — same as current but reads from store.

```typescript
// src/components/Sidebar.tsx
import { useMemo } from "react";
import { useGalaxyStore } from "../store";
import { getEdgeColor, EDGE_TYPE_COLORS } from "../constants";

export function Sidebar() {
  const searchResults = useGalaxyStore((s) => s.searchResults);
  const selectedPoint = useGalaxyStore((s) => s.selectedPoint);
  const edges = useGalaxyStore((s) => s.edges);
  const points = useGalaxyStore((s) => s.points);
  const clusters = useGalaxyStore((s) => s.clusters);
  const clusterAssignments = useGalaxyStore((s) => s.clusterAssignments);
  const selectPoint = useGalaxyStore((s) => s.selectPoint);
  const clearSelection = useGalaxyStore((s) => s.clearSelection);

  const connections = useMemo(() => {
    if (!selectedPoint) return [];
    return edges
      .filter((e) => e.source === selectedPoint.index || e.target === selectedPoint.index)
      .map((e) => {
        const otherIndex = e.source === selectedPoint.index ? e.target : e.source;
        return { edge: e, otherPoint: points[otherIndex] };
      })
      .filter((c) => c.otherPoint != null)
      .sort((a, b) => b.edge.confidence - a.edge.confidence);
  }, [selectedPoint, edges, points]);

  const clusterLabel = useMemo(() => {
    if (!selectedPoint || clusterAssignments.length === 0) return null;
    const cId = clusterAssignments[selectedPoint.index];
    if (cId == null || cId < 0) return "Noise (unclustered)";
    return clusters.find((c) => c.id === cId)?.label ?? `Cluster ${cId + 1}`;
  }, [selectedPoint, clusterAssignments, clusters]);

  if (searchResults.length === 0 && !selectedPoint) return null;

  return (
    <div className="absolute top-4 left-4 bottom-20 z-10 w-80 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white/80">
          {selectedPoint ? "Node Details" : `Search Results (${searchResults.length})`}
        </h2>
        <button onClick={clearSelection} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Selected point detail */}
      {selectedPoint && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedPoint.color }} />
            <h3 className="text-sm font-bold text-white truncate">{selectedPoint.metadata.label}</h3>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-white/50">
              <span className="text-white/30">Type:</span>{" "}
              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px]"
                style={{ backgroundColor: selectedPoint.color + "22", color: selectedPoint.color }}>
                {selectedPoint.metadata.type}
              </span>
            </p>
            <p className="text-xs text-white/50">
              <span className="text-white/30">Source:</span>{" "}
              <span className="text-white/70">{selectedPoint.metadata.source}</span>
            </p>
            {selectedPoint.metadata.detail && (
              <p className="text-xs text-white/50">
                <span className="text-white/30">Detail:</span>{" "}
                <span className="text-white/70">{selectedPoint.metadata.detail}</span>
              </p>
            )}
            {clusterLabel && (
              <p className="text-xs text-white/50">
                <span className="text-white/30">Cluster:</span>{" "}
                <span className="text-white/70">{clusterLabel}</span>
              </p>
            )}
            <p className="text-xs text-white/50">
              <span className="text-white/30">Connections:</span>{" "}
              <span className="text-white/70">{connections.length}</span>
            </p>
          </div>
        </div>
      )}

      {/* Connections grouped by type */}
      {selectedPoint && connections.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
            Connections ({connections.length})
          </p>
          {connections.map((c) => (
            <button
              key={`${c.edge.source}-${c.edge.target}-${c.edge.type}`}
              onClick={() => selectPoint(c.otherPoint!)}
              className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.otherPoint!.color }} />
              <span className="text-xs text-white/70 truncate flex-1 group-hover:text-white/90">
                {c.otherPoint!.metadata.label}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getEdgeColor(c.edge.type) + "22", color: getEdgeColor(c.edge.type) }}>
                {c.edge.type.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] text-white/30 tabular-nums flex-shrink-0">
                {(c.edge.confidence * 100).toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search results list */}
      {!selectedPoint && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {searchResults.map((r) => (
            <button
              key={r.point.index}
              onClick={() => selectPoint(r.point)}
              className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.point.color }} />
                <span className="text-xs font-medium text-white/80 truncate flex-1">{r.point.metadata.label}</span>
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
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/MobilePanel.tsx`**

Bottom 40% panel for mobile — shows the same content as Sidebar but in the split layout.

```typescript
// src/components/MobilePanel.tsx
import { useRef, useCallback } from "react";
import { useGalaxyStore } from "../store";
import { Sidebar } from "./Sidebar";

/**
 * Mobile bottom panel (40% height). Wraps the Sidebar content in a
 * slide-up panel with swipe-to-dismiss.
 */
export function MobilePanel() {
  const selectedPoint = useGalaxyStore((s) => s.selectedPoint);
  const searchResults = useGalaxyStore((s) => s.searchResults);
  const clearSelection = useGalaxyStore((s) => s.clearSelection);
  const startY = useRef<number | null>(null);

  const isOpen = selectedPoint !== null || searchResults.length > 0;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - startY.current;
    if (deltaY > 80) {
      // Swiped down — dismiss
      clearSelection();
    }
    startY.current = null;
  }, [clearSelection]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-[40vh] z-20 bg-black/80 backdrop-blur-md border-t border-white/10 rounded-t-2xl overflow-hidden flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle */}
      <div className="flex justify-center py-2">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Reuse sidebar internals — but in mobile context, Sidebar renders inline */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <MobilePanelContent />
      </div>
    </div>
  );
}

/** Mobile-specific panel content — same data as Sidebar but without absolute positioning */
function MobilePanelContent() {
  // Import the same rendering logic from Sidebar but without the wrapper div
  // For DRY, we'll use the Sidebar component with a prop to control positioning
  // Actually, let's just extract the shared panel content
  const selectedPoint = useGalaxyStore((s) => s.selectedPoint);
  const searchResults = useGalaxyStore((s) => s.searchResults);
  const edges = useGalaxyStore((s) => s.edges);
  const points = useGalaxyStore((s) => s.points);
  const clusters = useGalaxyStore((s) => s.clusters);
  const clusterAssignments = useGalaxyStore((s) => s.clusterAssignments);
  const selectPoint = useGalaxyStore((s) => s.selectPoint);
  const clearSelection = useGalaxyStore((s) => s.clearSelection);
  const { getEdgeColor } = require("../constants");

  // Same connection computation as Sidebar
  const connections = (() => {
    if (!selectedPoint) return [];
    return edges
      .filter((e: any) => e.source === selectedPoint.index || e.target === selectedPoint.index)
      .map((e: any) => ({
        edge: e,
        otherPoint: points[e.source === selectedPoint.index ? e.target : e.source],
      }))
      .filter((c: any) => c.otherPoint != null)
      .sort((a: any, b: any) => b.edge.confidence - a.edge.confidence);
  })();

  return (
    <div className="px-4">
      {/* Close button */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold text-white/80">
          {selectedPoint ? selectedPoint.metadata.label : `Results (${searchResults.length})`}
        </h2>
        <button onClick={clearSelection} className="text-white/30 hover:text-white/60 cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {selectedPoint && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedPoint.color }} />
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: selectedPoint.color + "22", color: selectedPoint.color }}>
              {selectedPoint.metadata.type}
            </span>
            <span className="text-xs text-white/50">{selectedPoint.metadata.source}</span>
          </div>
          {selectedPoint.metadata.detail && (
            <p className="text-xs text-white/60">{selectedPoint.metadata.detail}</p>
          )}
        </div>
      )}

      {selectedPoint && connections.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">
            Connections ({connections.length})
          </p>
          {connections.map((c: any) => (
            <button
              key={`${c.edge.source}-${c.edge.target}`}
              onClick={() => selectPoint(c.otherPoint)}
              className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.otherPoint.color }} />
              <span className="text-xs text-white/70 truncate flex-1">{c.otherPoint.metadata.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: getEdgeColor(c.edge.type) + "22", color: getEdgeColor(c.edge.type) }}>
                {c.edge.type.replace(/_/g, " ")}
              </span>
            </button>
          ))}
        </div>
      )}

      {!selectedPoint && searchResults.map((r) => (
        <button
          key={r.point.index}
          onClick={() => selectPoint(r.point)}
          className="w-full text-left py-2 border-b border-white/5 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.point.color }} />
            <span className="text-xs text-white/80 truncate flex-1">{r.point.metadata.label}</span>
            <span className="text-[10px] text-white/30">{(r.similarity * 100).toFixed(1)}%</span>
          </div>
        </button>
      ))}
    </div>
  );
}
```

**NOTE TO IMPLEMENTER:** The `MobilePanelContent` above uses `require()` which won't work in ESM. Replace with a proper import. Also, the Sidebar and MobilePanelContent share a lot of rendering logic — extract a shared `<NodeDetail />` and `<ConnectionList />` subcomponent to avoid duplication. This is a known DRY violation in the plan that should be resolved during implementation.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx src/components/MobilePanel.tsx
git commit -m "feat: add Sidebar and MobilePanel components

Desktop floating sidebar and mobile bottom 40% panel with
swipe-to-dismiss. Both show node details and search results."
```

---

### Task 7: Rewrite App.tsx as layout shell

**Files:**
- Modify: `src/App.tsx` (complete rewrite)

- [ ] **Step 1: Rewrite `src/App.tsx`**

Replace the entire 1147-line file with a thin layout shell that composes all extracted components.

```typescript
// src/App.tsx
import { useGalaxyStore } from "./store";
import { useGalaxyData } from "./hooks/useGalaxyData";
import { useMobileDetect } from "./hooks/useMobileDetect";
import { GalaxyCanvas } from "./components/GalaxyCanvas";
import { Toolbar } from "./components/Toolbar";
import { StatsHUD } from "./components/StatsHUD";
import { SearchBar } from "./components/SearchBar";
import { Sidebar } from "./components/Sidebar";
import { MobilePanel } from "./components/MobilePanel";
import { LoadingScreen } from "./components/LoadingScreen";
import Logo from "./components/Logo";

export default function App() {
  const loading = useGalaxyStore((s) => s.loading);
  const selectedPoint = useGalaxyStore((s) => s.selectedPoint);
  const searchResults = useGalaxyStore((s) => s.searchResults);
  const isMobile = useMobileDetect();

  // Initialize data loading
  useGalaxyData();

  if (loading) {
    return <LoadingScreen />;
  }

  const panelOpen = selectedPoint !== null || searchResults.length > 0;

  return (
    <div className="w-full h-full relative">
      {/* 3D Canvas — takes 60% on mobile when panel open, 100% otherwise */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          isMobile && panelOpen ? "bottom-[40vh]" : ""
        }`}
      >
        <GalaxyCanvas className="w-full h-full" />
      </div>

      {/* Branding — minimal in showcase mode */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Logo className="w-8 h-8 animate-spin-slow" />
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">
            Lurkr Knowledge Galaxy
          </h1>
          <p className="text-[9px] text-white/30 uppercase tracking-widest">
            pgvector embedding visualizer
          </p>
        </div>
      </div>

      {/* Controls */}
      <Toolbar />
      <StatsHUD />

      {/* Search */}
      <SearchBar />

      {/* Detail panels */}
      {isMobile ? <MobilePanel /> : <Sidebar />}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Run dev server and test**

```bash
npm run dev
```

Open `http://localhost:3456` in browser. Verify:
- Galaxy loads with points and edges
- Clicking a point opens detail sidebar
- Search works
- Toolbar toggle reveals power mode
- Edges can be toggled

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: rewrite App.tsx as thin layout shell (~60 lines)

Replaces 1147-line monolith. All logic extracted to hooks, lib,
and component modules. Zustand store replaces useState sprawl.
Progressive disclosure via powerMode toggle."
```

---

## Chunk 3: Polish & Deploy (Task 8)

### Task 8: Mobile CSS, final polish, and deploy

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Update `src/index.css` with mobile styles**

Add touch-action hints and safe-area insets for mobile.

Add to the existing file after the existing styles:

```css
/* Mobile-specific overrides */
@media (max-width: 768px) {
  /* Prevent pull-to-refresh on mobile */
  body {
    overscroll-behavior: none;
  }

  /* Safe area padding for notched phones */
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}

/* Touch action for the canvas — prevent browser gestures */
canvas {
  touch-action: none;
}
```

- [ ] **Step 2: Update `index.html` viewport meta**

Change the viewport meta to prevent zoom on double-tap (important for 3D interaction on mobile):

Replace:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
With:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/index.css index.html
git commit -m "feat: mobile CSS polish — touch-action, safe-area, prevent zoom

Adds overscroll-behavior, touch-action:none on canvas, safe-area
insets for notched phones, prevents double-tap zoom."
```

- [ ] **Step 5: Push to deploy**

```bash
git push origin main
```

Wait for GitHub Actions to complete:
```bash
gh run list --repo joestechsolutions/semantic-galaxy --limit 1
gh run watch <run-id> --exit-status
```

- [ ] **Step 6: Verify deployment**

Open `https://joestechsolutions.github.io/semantic-galaxy/` on both desktop and phone. Verify:
- Galaxy loads with auto-rotation
- Clicking gear icon reveals toolbar (power mode)
- Color mode dropdown works (Type, Cluster, Source, Density)
- 2D/3D toggle animates smoothly
- Cluster boundaries toggle on/off
- Edge toggle works with confidence-based opacity
- Screenshot button downloads PNG
- Keyboard shortcuts work on desktop (E, C, 2, 3, /, Esc)
- On mobile: search opens 60/40 split, swipe-down dismisses
- On mobile: toolbar opens as grid panel

---

## Summary

| Task | What | Key files |
|------|------|-----------|
| 1 | Dependencies + types + store | `types.ts`, `store.ts` |
| 2 | Lib modules | `lib/parsers.ts`, `lib/colors.ts`, `lib/umap.ts`, `lib/clustering.ts`, `lib/search.ts`, `lib/screenshot.ts` |
| 3 | Hooks | `hooks/useGalaxyData.ts`, `hooks/useSearch.ts`, `hooks/useColorMode.ts`, `hooks/useMobileDetect.ts` |
| 4 | 3D components | `components/GalaxyCanvas.tsx`, `components/GalaxyPoints.tsx`, `components/ConnectionLines.tsx`, `components/ClusterBoundaries.tsx`, `components/CameraController.tsx`, `components/PointTooltip.tsx` |
| 5 | UI controls | `components/Toolbar.tsx`, `components/StatsHUD.tsx`, `components/SearchBar.tsx`, `components/LoadingScreen.tsx` |
| 6 | Panels | `components/Sidebar.tsx`, `components/MobilePanel.tsx` |
| 7 | App shell rewrite | `App.tsx` (~60 lines) |
| 8 | Mobile CSS + deploy | `index.css`, `index.html` |
