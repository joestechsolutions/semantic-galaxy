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
