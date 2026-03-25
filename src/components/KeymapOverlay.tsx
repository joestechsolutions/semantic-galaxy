// src/components/KeymapOverlay.tsx
import { useEffect, useState } from "react";
import { useMobileDetect } from "../hooks/useMobileDetect";

interface Shortcut {
  keys: string[];
  action: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["E"], action: "Toggle edges" },
  { keys: ["C"], action: "Toggle clusters" },
  { keys: ["2"], action: "Switch to 2D view" },
  { keys: ["3"], action: "Switch to 3D view" },
  { keys: ["/"], action: "Focus search bar" },
  { keys: ["Esc"], action: "Clear selection / close panels" },
  { keys: ["?"], action: "Toggle this help" },
];

const MOUSE_CONTROLS = [
  { keys: ["Click"], action: "Select a node" },
  { keys: ["Drag"], action: "Rotate the galaxy" },
  { keys: ["Scroll"], action: "Zoom in / out" },
  { keys: ["Right-drag"], action: "Pan the view" },
];

const TOUCH_CONTROLS = [
  { keys: ["Tap"], action: "Select a node" },
  { keys: ["Drag"], action: "Rotate the galaxy" },
  { keys: ["Pinch"], action: "Zoom in / out" },
  { keys: ["Two-finger drag"], action: "Pan the view" },
  { keys: ["Swipe down"], action: "Dismiss panel" },
];

function KeyRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-white/60">{shortcut.action}</span>
      <div className="flex gap-1 ml-4">
        {shortcut.keys.map((key) => (
          <kbd
            key={key}
            className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-[11px] font-mono text-white/80 shadow-sm"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export function KeymapOverlay() {
  const [open, setOpen] = useState(false);
  const isMobile = useMobileDetect();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const controls = isMobile ? TOUCH_CONTROLS : MOUSE_CONTROLS;

  return (
    <>
      {/* Help button — bottom-left */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`absolute bottom-20 left-4 z-20 w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
          open
            ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
            : "bg-black/60 backdrop-blur-md border-white/10 text-white/30 hover:text-white/60 hover:border-white/20"
        }`}
        title="Keyboard shortcuts (?)"
      >
        <span className="text-sm font-bold">?</span>
      </button>

      {/* Overlay */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute bottom-32 left-4 z-40 w-72 bg-black/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white/80">Controls</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-4 py-3">
              {/* Mouse/Touch section */}
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
                {isMobile ? "Touch" : "Mouse"}
              </p>
              <div className="space-y-0.5 mb-4">
                {controls.map((s, i) => (
                  <KeyRow key={i} shortcut={s} />
                ))}
              </div>

              {/* Keyboard section (desktop only) */}
              {!isMobile && (
                <>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Keyboard</p>
                  <div className="space-y-0.5">
                    {SHORTCUTS.map((s, i) => (
                      <KeyRow key={i} shortcut={s} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-white/[0.06] bg-white/[0.02]">
              <p className="text-[10px] text-white/25 text-center">
                {isMobile ? "Tap ? to dismiss" : "Press ? to dismiss"}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
