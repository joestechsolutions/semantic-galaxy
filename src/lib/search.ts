// src/lib/search.ts
import type { GalaxyPoint, SearchResult } from "../types";
import { MAX_SEARCH_RESULTS } from "../constants";

export async function embedQuery(query: string): Promise<number[] | null> {
  try {
    const response = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", input: query }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.embeddings[0];
  } catch {
    return null;
  }
}

export function textSearch(query: string, points: GalaxyPoint[]): SearchResult[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return points
    .map((point) => {
      const text = `${point.metadata.label} ${point.metadata.type} ${point.metadata.detail}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (text.includes(w)) score += 1;
      }
      if (point.metadata.label.toLowerCase().includes(q)) score += 2;
      return { point, similarity: score / (words.length + 2) };
    })
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_SEARCH_RESULTS);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function performSearch(
  query: string,
  points: GalaxyPoint[],
): Promise<SearchResult[]> {
  const queryEmbedding = await embedQuery(query);
  if (queryEmbedding) {
    return points
      .map((point) => ({
        point,
        similarity: cosineSimilarity(queryEmbedding, point.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, MAX_SEARCH_RESULTS);
  }
  return textSearch(query, points);
}
