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
