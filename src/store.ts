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
  points: GalaxyPoint[];
  edges: Edge[];
  clusters: ClusterInfo[];
  clusterAssignments: number[];
  loading: boolean;
  loadStatus: string;
  refreshing: boolean;
  powerMode: boolean;
  colorMode: ColorMode;
  dimensionMode: DimensionMode;
  showEdges: boolean;
  showClusters: boolean;
  autoRotate: boolean;
  searchResults: SearchResult[];
  isSearching: boolean;
  hoveredPoint: GalaxyPoint | null;
  selectedPoint: GalaxyPoint | null;
  cameraTarget: THREE.Vector3 | null;
  cameraEnabled: boolean;
  selectedSearchIndex: number;

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

  selectPoint: (point: GalaxyPoint) => void;
  clearSelection: () => void;
  resetView: () => void;
  flyToPoint: (point: GalaxyPoint) => void;
}

export const useGalaxyStore = create<GalaxyState>((set) => ({
  points: [],
  edges: [],
  clusters: [],
  clusterAssignments: [],
  loading: true,
  loadStatus: "Initializing...",
  refreshing: false,
  powerMode: false,
  colorMode: "type",
  dimensionMode: "3d",
  showEdges: true,
  showClusters: false,
  autoRotate: true,
  searchResults: [],
  isSearching: false,
  hoveredPoint: null,
  selectedPoint: null,
  cameraTarget: null,
  cameraEnabled: false,
  selectedSearchIndex: -1,

  setPoints: (points) => set({ points }),
  setEdges: (edges) => set({ edges }),
  setClusters: (clusters, assignments) => set({ clusters, clusterAssignments: assignments }),
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
