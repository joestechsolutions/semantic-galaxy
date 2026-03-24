// src/components/Toolbar.tsx
import { useCallback, useEffect } from "react";
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
