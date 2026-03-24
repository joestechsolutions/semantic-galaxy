import { useGalaxyStore } from "./store";
import { useGalaxyData } from "./hooks/useGalaxyData";
import { useMobileDetect } from "./hooks/useMobileDetect";
import { GalaxyCanvas } from "./components/GalaxyCanvas";
import { Toolbar } from "./components/Toolbar";
import { StatsHUD } from "./components/StatsHUD";
import { SearchBar } from "./components/SearchBar";
import { Sidebar } from "./components/Sidebar";
import { MobilePanel } from "./components/MobilePanel";
import { LoadingScreen } from "./components/LoadingScreen";
import Logo from "./components/Logo";

export default function App() {
  const loading = useGalaxyStore((s) => s.loading);
  const selectedPoint = useGalaxyStore((s) => s.selectedPoint);
  const searchResults = useGalaxyStore((s) => s.searchResults);
  const isMobile = useMobileDetect();

  useGalaxyData();

  if (loading) {
    return <LoadingScreen />;
  }

  const panelOpen = selectedPoint !== null || searchResults.length > 0;

  return (
    <div className="w-full h-full relative">
      {/* 3D Canvas — shrinks on mobile when panel open */}
      <div className={`absolute inset-0 transition-all duration-300 ${
        isMobile && panelOpen ? "bottom-[40vh]" : ""
      }`}>
        <GalaxyCanvas className="w-full h-full" />
      </div>

      {/* Branding */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Logo className="w-8 h-8 animate-spin-slow" />
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Lurkr Knowledge Galaxy</h1>
          <p className="text-[9px] text-white/30 uppercase tracking-widest">pgvector embedding visualizer</p>
        </div>
      </div>

      <Toolbar />
      <StatsHUD />
      <SearchBar />
      {isMobile ? <MobilePanel /> : <Sidebar />}
    </div>
  );
}
