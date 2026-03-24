// src/lib/parsers.ts
import type { MetadataRow, Edge } from "../types";

export function parseVectorsTSV(text: string): number[][] {
  return text
    .trim()
    .split("\n")
    .map((line) => line.split("\t").map(Number));
}

export function parseMetadataTSV(text: string): MetadataRow[] {
  const lines = text.trim().split("\n");
  return lines.slice(1).map((line) => {
    const cols = line.split("\t");
    return {
      label: cols[0] ?? "",
      type: cols[1] ?? "unknown",
      source: cols[2] ?? "",
      detail: cols[3] ?? "",
    };
  });
}

export function parseEdgesTSV(text: string): Edge[] {
  const lines = text.trim().split("\n");
  return lines.slice(1).map((line) => {
    const [source, target, type, confidence] = line.split("\t");
    return {
      source: Number(source),
      target: Number(target),
      type: type ?? "related_to",
      confidence: Number(confidence),
    };
  });
}
