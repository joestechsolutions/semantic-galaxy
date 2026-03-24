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
