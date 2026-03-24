// src/hooks/useSearch.ts
import { useCallback } from "react";
import * as THREE from "three";
import { useGalaxyStore } from "../store";
import { performSearch } from "../lib/search";

export function useSearch() {
  const points = useGalaxyStore((s) => s.points);
  const setSearchResults = useGalaxyStore((s) => s.setSearchResults);
  const setIsSearching = useGalaxyStore((s) => s.setIsSearching);
  const flyToPoint = useGalaxyStore((s) => s.flyToPoint);
  const clearSelection = useGalaxyStore((s) => s.clearSelection);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        clearSelection();
        return;
      }

      setIsSearching(true);
      try {
        const results = await performSearch(query.trim(), points);
        setSearchResults(results);

        if (results.length > 0) {
          flyToPoint(results[0].point);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [points, setSearchResults, setIsSearching, flyToPoint, clearSelection],
  );

  return handleSearch;
}
