// src/components/LoadingScreen.tsx
import Logo from "./Logo";
import { useGalaxyStore } from "../store";

export function LoadingScreen() {
  const status = useGalaxyStore((s) => s.loadStatus);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
      <Logo className="w-24 h-24 animate-spin-slow mb-6" />
      <h1 className="text-2xl font-bold text-white mb-2">Lurkr Knowledge Galaxy</h1>
      <p className="text-sm text-blue-400 animate-pulse-glow">{status}</p>
    </div>
  );
}
