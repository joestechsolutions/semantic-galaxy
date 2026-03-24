import type { GalaxyPoint, SearchResult, Edge } from "../types";

interface Connection {
  edge: Edge;
  otherPoint: GalaxyPoint;
}

interface NodeDetailContentProps {
  selectedPoint: GalaxyPoint | null;
  searchResults: SearchResult[];
  connections: Connection[];
  clusterLabel: string | null;
  selectPoint: (point: GalaxyPoint) => void;
  getEdgeColor: (type: string) => string;
}

/**
 * Shared rendering logic for node details and search results.
 * Used by both Sidebar (desktop) and MobilePanel (mobile).
 */
export function NodeDetailContent({
  selectedPoint,
  searchResults,
  connections,
  clusterLabel,
  selectPoint,
  getEdgeColor,
}: NodeDetailContentProps) {
  return (
    <>
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
              <span
                className="inline-block px-1.5 py-0.5 rounded-full text-[10px]"
                style={{
                  backgroundColor: selectedPoint.color + "22",
                  color: selectedPoint.color,
                }}
              >
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

      {/* Connections grouped by relationship type */}
      {selectedPoint && connections.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
            Connections ({connections.length})
          </p>
          {connections.map((c) => (
            <button
              key={`${c.edge.source}-${c.edge.target}-${c.edge.type}`}
              onClick={() => selectPoint(c.otherPoint)}
              className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.otherPoint.color }}
              />
              <span className="text-xs text-white/70 truncate flex-1 group-hover:text-white/90">
                {c.otherPoint.metadata.label}
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
                {r.point.metadata.type} — {r.point.metadata.source}
              </p>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
