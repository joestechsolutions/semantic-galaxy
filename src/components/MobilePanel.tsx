import { useRef, useCallback, useMemo } from "react";
import { useGalaxyStore } from "../store";
import { getEdgeColor } from "../constants";
import { NodeDetailContent } from "./NodeDetailContent";

/**
 * Mobile bottom panel (40% height). Shows node details or search results
 * in a slide-up panel with swipe-down-to-dismiss.
 */
export function MobilePanel() {
  const selectedPoint = useGalaxyStore((s) => s.selectedPoint);
  const searchResults = useGalaxyStore((s) => s.searchResults);
  const edges = useGalaxyStore((s) => s.edges);
  const points = useGalaxyStore((s) => s.points);
  const clusters = useGalaxyStore((s) => s.clusters);
  const clusterAssignments = useGalaxyStore((s) => s.clusterAssignments);
  const selectPoint = useGalaxyStore((s) => s.selectPoint);
  const clearSelection = useGalaxyStore((s) => s.clearSelection);

  const startY = useRef<number | null>(null);

  const isOpen = selectedPoint !== null || searchResults.length > 0;

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startY.current === null) return;
      const deltaY = e.changedTouches[0].clientY - startY.current;
      if (deltaY > 80) {
        clearSelection();
      }
      startY.current = null;
    },
    [clearSelection]
  );

  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-[40vh] z-20 bg-black/80 backdrop-blur-md border-t border-white/10 rounded-t-2xl overflow-hidden flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle */}
      <div className="flex justify-center py-2 flex-shrink-0">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
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

      {/* Shared content */}
      <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
        <NodeDetailContent
          selectedPoint={selectedPoint}
          searchResults={searchResults}
          connections={connections}
          clusterLabel={clusterLabel}
          selectPoint={selectPoint}
          getEdgeColor={getEdgeColor}
        />
      </div>
    </div>
  );
}
