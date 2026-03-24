import { useMemo } from "react";
import type { GalaxyPoint, SearchResult, Edge } from "../types";
import { getTypeCategory } from "../constants";

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

/** Icon for entity category */
function CategoryIcon({ category }: { category: "entity" | "memory" | "unknown" }) {
  if (category === "entity") {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    );
  }
  if (category === "memory") {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}

/** Confidence bar visualization */
function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-white/40 tabular-nums w-8 text-right">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export function NodeDetailContent({
  selectedPoint,
  searchResults,
  connections,
  clusterLabel,
  selectPoint,
  getEdgeColor,
}: NodeDetailContentProps) {
  // Group connections by relationship type
  const groupedConnections = useMemo(() => {
    const groups = new Map<string, Connection[]>();
    for (const c of connections) {
      const type = c.edge.type;
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(c);
    }
    // Sort groups by size (largest first)
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [connections]);

  /* ── Selected Node Detail ─────────────────────────────────── */
  if (selectedPoint) {
    const category = getTypeCategory(selectedPoint.metadata.type);
    const categoryLabel = category === "entity" ? "Entity" : category === "memory" ? "Memory" : "Node";

    return (
      <div className="flex flex-col h-full">
        {/* Hero card */}
        <div className="px-5 pt-4 pb-4">
          {/* Big colored glow circle + name */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative flex-shrink-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: selectedPoint.color + "20",
                  boxShadow: `0 0 20px ${selectedPoint.color}30`,
                }}
              >
                <div
                  className="w-5 h-5 rounded-full"
                  style={{
                    backgroundColor: selectedPoint.color,
                    boxShadow: `0 0 12px ${selectedPoint.color}80`,
                  }}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white leading-tight mb-1">
                {selectedPoint.metadata.label}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    backgroundColor: selectedPoint.color + "20",
                    color: selectedPoint.color,
                  }}
                >
                  {selectedPoint.metadata.type}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                  <CategoryIcon category={category} />
                  {categoryLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {selectedPoint.metadata.detail && (
              <div className="col-span-2 bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Detail</p>
                <p className="text-xs text-white/80 leading-relaxed">{selectedPoint.metadata.detail}</p>
              </div>
            )}
            <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Source</p>
              <p className="text-xs text-white/80 capitalize">{selectedPoint.metadata.source}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Connections</p>
              <p className="text-xs text-white/80">{connections.length} node{connections.length !== 1 ? "s" : ""}</p>
            </div>
            {clusterLabel && (
              <div className="col-span-2 bg-white/[0.03] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Cluster</p>
                <p className="text-xs text-white/80">{clusterLabel}</p>
              </div>
            )}
          </div>

          {/* Relationship type legend (mini bar chart) */}
          {groupedConnections.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {groupedConnections.map(([type, conns]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
                  style={{
                    backgroundColor: getEdgeColor(type) + "15",
                    color: getEdgeColor(type),
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: getEdgeColor(type) }}
                  />
                  {type.replace(/_/g, " ")}
                  <span className="text-white/30 ml-0.5">{conns.length}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Connections list — grouped by relationship type */}
        {groupedConnections.length > 0 && (
          <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-white/[0.06]">
            {groupedConnections.map(([type, conns]) => (
              <div key={type} className="px-4 pt-3 pb-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getEdgeColor(type) }}
                  />
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: getEdgeColor(type) }}
                  >
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-white/20">{conns.length}</span>
                </div>
                <div className="space-y-0.5">
                  {conns.map((c) => (
                    <button
                      key={`${c.edge.source}-${c.edge.target}`}
                      onClick={() => selectPoint(c.otherPoint)}
                      className="w-full text-left flex items-center gap-2.5 py-2 px-2.5 -mx-0.5 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer group"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white/10 group-hover:ring-white/20 transition-all"
                        style={{ backgroundColor: c.otherPoint.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 font-medium truncate group-hover:text-white transition-colors">
                          {c.otherPoint.metadata.label}
                        </p>
                        <p className="text-[10px] text-white/30 truncate">
                          {c.otherPoint.metadata.type}
                        </p>
                      </div>
                      <div className="w-16 flex-shrink-0">
                        <ConfidenceBar value={c.edge.confidence} color={getEdgeColor(c.edge.type)} />
                      </div>
                      {/* Arrow icon */}
                      <svg className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state for no connections */}
        {connections.length === 0 && (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center">
              <svg className="w-8 h-8 text-white/10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-xs text-white/30">No connections found</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Search Results ────────────────────────────────────────── */
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {searchResults.map((r, i) => (
        <button
          key={r.point.index}
          onClick={() => selectPoint(r.point)}
          className="w-full text-left px-4 py-3 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors border-b border-white/[0.04] cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: r.point.color + "15",
                  color: r.point.color,
                }}
              >
                {i + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/85 truncate group-hover:text-white transition-colors">
                {r.point.metadata.label}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: r.point.color + "15",
                    color: r.point.color,
                  }}
                >
                  {r.point.metadata.type}
                </span>
                <span className="text-[10px] text-white/25">{r.point.metadata.source}</span>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums" style={{ color: r.point.color }}>
                {(r.similarity * 100).toFixed(0)}%
              </p>
              <p className="text-[9px] text-white/25">match</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
