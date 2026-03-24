import { useMemo } from "react";
import { useGalaxyStore } from "../store";
import { getEdgeColor } from "../constants";
import { NodeDetailContent } from "./NodeDetailContent";

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
        <button
          onClick={clearSelection}
          className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <NodeDetailContent
        selectedPoint={selectedPoint}
        searchResults={searchResults}
        connections={connections}
        clusterLabel={clusterLabel}
        selectPoint={selectPoint}
        getEdgeColor={getEdgeColor}
      />
    </div>
  );
}
