/** Radius of the 3D galaxy sphere layout */
export const GALAXY_RADIUS = 15;

/** Size of individual point sprites */
export const POINT_SIZE = 0.18;

/** Size of highlighted (search result) points */
export const HIGHLIGHT_SIZE = 0.3;

/** Camera distance when focusing on a point */
export const FOCUS_DISTANCE = 3;

/** Debounce delay for search input (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Number of search results to show in sidebar */
export const MAX_SEARCH_RESULTS = 20;

/** Type-to-color mapping */
export const TYPE_COLORS: Record<string, string> = {
  // Entity types (warm palette)
  person: "#FFD700",
  organization: "#FF8C00",
  technology: "#FF4444",
  project: "#FF6347",
  concept: "#FFA500",
  location: "#FF69B4",
  event: "#FF1493",
  tool: "#E8A317",
  skill: "#FF7F50",
  platform: "#DC143C",
  language: "#CD5C5C",
  framework: "#B22222",
  service: "#FF4500",
  agent: "#DAA520",
  workflow: "#D2691E",

  // Memory types (cool palette)
  episodic: "#4169E1",
  semantic: "#00CED1",
  procedural: "#9370DB",
  reference: "#20B2AA",
  feedback: "#7B68EE",
  user: "#00BFFF",
  project_memory: "#6A5ACD",
  system: "#4682B4",
  conversation: "#5F9EA0",
  instruction: "#6495ED",
  preference: "#87CEEB",
  context: "#48D1CC",
  task: "#BA55D3",

  // Default
  unknown: "#AAAAAA",
};

/** Edge relationship type colors */
export const EDGE_TYPE_COLORS: Record<string, string> = {
  works_on: "#4CAF50",
  related_to: "#607D8B",
  built_with: "#FF9800",
  uses: "#2196F3",
  owned_by: "#9C27B0",
  provided_by: "#00BCD4",
  affiliated_with: "#F44336",
};

/** Get color for a given edge type, falling back to grey */
export function getEdgeColor(type: string): string {
  return EDGE_TYPE_COLORS[type] ?? "#444444";
}

/** Get color for a given type, falling back to unknown */
export function getTypeColor(type: string): string {
  const normalized = type?.toLowerCase().trim() ?? "unknown";
  return TYPE_COLORS[normalized] ?? TYPE_COLORS.unknown;
}

/** Get a distinct list of all known type categories */
export function getTypeCategory(type: string): "entity" | "memory" | "unknown" {
  const normalized = type?.toLowerCase().trim() ?? "unknown";
  const entityTypes = new Set([
    "person", "organization", "technology", "project", "concept",
    "location", "event", "tool", "skill", "platform", "language",
    "framework", "service", "agent", "workflow",
  ]);
  const memoryTypes = new Set([
    "episodic", "semantic", "procedural", "reference", "feedback",
    "user", "project_memory", "system", "conversation", "instruction",
    "preference", "context", "task",
  ]);
  if (entityTypes.has(normalized)) return "entity";
  if (memoryTypes.has(normalized)) return "memory";
  return "unknown";
}
