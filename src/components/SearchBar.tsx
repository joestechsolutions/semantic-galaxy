// src/components/SearchBar.tsx
import { useState, useRef } from "react";
import { useGalaxyStore } from "../store";
import { useSearch } from "../hooks/useSearch";
import { SEARCH_DEBOUNCE_MS } from "../constants";

export function SearchBar() {
  const [value, setValue] = useState("");
  const isSearching = useGalaxyStore((s) => s.isSearching);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = useSearch();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => handleSearch(v), SEARCH_DEBOUNCE_MS);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4">
      <div className="relative">
        <input
          type="text"
          data-search-input
          value={value}
          onChange={handleChange}
          placeholder="Search knowledge galaxy..."
          className="w-full bg-black/60 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <svg className="w-5 h-5 text-blue-400 animate-spin-slow" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
