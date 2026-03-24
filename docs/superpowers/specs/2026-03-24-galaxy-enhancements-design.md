# Semantic Galaxy Enhancements — Design Spec

**Goal:** Transform the Semantic Galaxy from a basic 3D point cloud into a professional embedding explorer that impresses on first glance and reveals power-user data tools on demand. Mobile-first, static deployment on GitHub Pages.

**Audience:** Both — impressive showcase for clients/investors at first glance, with professional data engineering tools (filters, color modes, clustering, export) tucked behind toggles and panels.

**Architecture:** React 19 + Three.js/R3F + Tailwind CSS v4. Static site, no backend. All new features are client-side computation on existing TSV data files.

**Deployment:** GitHub Pages via GitHub Actions (unchanged).

---

## 1. Layout & Progressive Disclosure

### State Model
A single boolean `powerMode` controls progressive disclosure:
- **`powerMode: false`** (default) — Showcase Mode
- **`powerMode: true`** — Power Mode (toggled by toolbar expand button)

Expanding the toolbar sets `powerMode: true`. Collapsing it sets `powerMode: false`.

### Default State (Showcase Mode)
- Full-screen 3D galaxy with subtle bloom, animated points
- Auto-rotating camera orbit (`OrbitControls.autoRotate = true`). Auto-rotation stops on any user interaction (mouse drag, touch drag, node click, search). It does NOT resume automatically — user must click "Reset view" to restart it.
- Minimal chrome: logo, search bar (bottom center), small toolbar toggle (top-right)
- Tapping/clicking a node shows a clean detail card

### Power Mode (Toggled)
- Toolbar expands with all controls (color-by, 2D/3D, clusters, edges, export)
- Stats HUD appears with type breakdown (positioned below the toolbar, not competing for the same corner)
- Filter chips appear below search bar

### Desktop
- Full-screen canvas at all times
- Floating, collapsible panels appear on demand (sidebar, stats, toolbar)
- Hover states for tooltips, click for detail panel

### Mobile
- Default: full-screen galaxy, search bar at bottom (thumb-reachable), toolbar toggle in top corner
- On node select or panel open: 60/40 vertical split — galaxy top (60%), info panel bottom (40%)
- Panel is scrollable, dismissible with X button or swipe-down
- Back to full-screen galaxy when panel dismissed
- Mobile breakpoint: `max-width: 768px` (standard tablet/phone threshold). `useMobileDetect` checks both viewport width AND touch capability (`'ontouchstart' in window`) — mobile mode activates when EITHER condition is true.

---

## 2. Color Modes

A "Color by" dropdown in the toolbar (hidden by default, visible in power mode).

| Mode | Description | Use Case |
|------|-------------|----------|
| **Type** (default) | Current warm/cool palette — person=gold, episodic=blue, etc. | Understand composition at a glance |
| **Cluster** | HDBSCAN auto-detected clusters, each assigned a distinct color | Find natural groupings the types don't reveal |
| **Source** | Two colors — entities (warm amber) vs memories (cool blue) | Quick high-level entity/memory split |
| **Density** | Heatmap gradient by connection count — cold (0-1 edges) to hot (10+) | Find hub nodes and orphans |

Color mode selection persists until changed. Default is "Type" for the best first impression.

Cluster and density color palettes use a hand-rolled categorical palette (12-16 distinct colors) and a linear HSL gradient (blue→yellow→red) respectively — no d3 dependency needed.

---

## 3. 2D/3D Toggle

- **3D** is default (impressive first impression)
- **2D/3D strategy:** Pre-compute BOTH projections at load time. `useGalaxyData` runs UMAP twice during initial load (`nComponents: 3` and `nComponents: 2`), storing both position sets. Toggling between 2D/3D animates points from one pre-computed position set to the other — no re-computation on toggle.
- In 2D mode, camera switches to top-down orthographic view
- Smooth animated transition: points lerp from old positions to new over ~1 second using `useFrame`
- Toggle is a button in the toolbar (cube icon for 3D, square icon for 2D)
- Initial load shows a progress indicator during UMAP computation (both projections)

---

## 4. Clustering (DBSCAN)

- Runs client-side on the 3D UMAP positions (not the 768-dim raw vectors — too expensive in browser)
- Uses `density-clustering` package (DBSCAN algorithm). DBSCAN is sufficient for this use case: fixed-density clusters on UMAP output where UMAP has already normalized density. Variable-density handling (HDBSCAN) is unnecessary on UMAP-projected coordinates. If `density-clustering` CommonJS import proves problematic, fall back to a ~50-line inline DBSCAN implementation (the algorithm is simple).
- Each cluster auto-labeled by its most common type (e.g., "Cluster 3: mostly technology")
- Cluster boundaries rendered as transparent mesh hulls (ConvexGeometry from `three/addons/geometries/ConvexGeometry`) with `MeshBasicMaterial({ transparent: true, opacity: 0.08, wireframe: false })` plus wireframe edges via `EdgesGeometry` + `LineSegments` for visible outlines
- Cluster boundaries toggleable independently of color mode
- Cluster count shown in Stats HUD
- In "Color by Cluster" mode, each cluster gets a distinct color; noise points get grey

---

## 5. Edge Rendering (Enhanced)

- Current behavior: edges are filtered (removed from geometry) when a node is selected
- New behavior: ALL 634 edges render at all times. Per-edge opacity controlled via vertex alpha channel:
  - Default: opacity based on confidence score (high confidence = solid, low = faint)
  - When a node is selected: connected edges at full opacity, all others dim to 10% opacity
  - This replaces the current `edges.filter()` approach with a vertex-color-alpha approach
- Edge visibility togglable via toolbar
- Edge type colors remain from current `EDGE_TYPE_COLORS` mapping

---

## 6. Toolbar & Controls

### Collapsed by Default
- Small icon button (sliders/gear icon) in top-right corner
- Tapping reveals the full toolbar and enters Power Mode

### Desktop Toolbar
- Horizontal bar across the top, semi-transparent dark background
- Icon + label buttons:

| Control | Icon | Behavior |
|---------|------|----------|
| Color by | palette | Dropdown: Type / Cluster / Source / Density |
| 2D / 3D | cube/square | Toggle, animated transition |
| Edges | network lines | Toggle edge visibility |
| Clusters | dotted boundary | Toggle convex hull overlays |
| Screenshot | camera | Export current canvas view as PNG |
| Fullscreen | expand | Browser fullscreen API |
| Reset view | home | Return camera to default orbit position + restart auto-rotation |

### Mobile Toolbar
- Same controls, laid out as a 2x4 grid in a slide-out panel from top-right
- Dismisses on outside tap

### Keyboard Shortcuts (Desktop Only)
| Key | Action |
|-----|--------|
| `E` | Toggle edges |
| `C` | Toggle clusters |
| `2` / `3` | Switch 2D / 3D |
| `/` | Focus search bar |
| `Esc` | Clear selection, close panels |
| Arrow keys | Cycle through search results (highlights in sidebar + flies camera) |

### Stats HUD
- Positioned below toolbar (top-right area, offset down to avoid collision with toolbar toggle)
- Hidden by default (appears when `powerMode: true`)
- Shows: total points, entities, memories, edges, cluster count
- Expandable to show type breakdown with colored dot indicators
- On mobile: accessible as a tab in the bottom info panel

---

## 7. Detail Panel

### Node Detail Card (On Select)
- **Header:** node label + type badge (colored pill with type name)
- **Metadata:** source (entity/memory), detail field, cluster assignment (if clustering active)
- **Connections section:**
  - Connected nodes grouped by relationship type
  - Each connection: node label, relationship type badge, confidence percentage
  - Tapping a connection flies camera to that node and updates panel
- **Stats:** connection count, cluster membership

### Desktop
- Floating sidebar panel (left side), slides in on node select
- Close button or click empty space to dismiss

### Mobile
- Bottom 40% panel in the 60/40 split
- Scrollable content
- X button or swipe-down to dismiss

---

## 8. Search

- **Text search** (current implementation — works on GitHub Pages without Ollama)
- Results show: label, type badge (colored), snippet of detail field
- Results highlight in galaxy as brighter/larger points
- Top result auto-focused by camera
- **Filter chips** below search bar: tap to filter by type (person, technology, episodic, etc.) or source (entity/memory). Chips only visible in power mode.
- On mobile: search activates the 60/40 split with results in the bottom panel. Search bar stays at the top of the bottom panel (above the results list).

---

## 9. Touch Optimizations (Mobile)

- Larger tap targets for nodes (increase hit detection radius on mobile via raycaster threshold)
- No hover states — everything is tap-based
- Pinch to zoom, drag to orbit (Three.js OrbitControls touch support)
- Toolbar items are icon buttons with labels below (not tiny icon-only)
- Prevent accidental orbit when tapping nodes (distinguish tap vs drag via pointer movement threshold: <5px movement = tap, >=5px = drag)
- Swipe-down on bottom panel to dismiss

---

## 10. Screenshot Export

- Requires `preserveDrawingBuffer: true` on the R3F `<Canvas gl>` prop
- `lib/screenshot.ts` calls `renderer.domElement.toDataURL('image/png')` after a render
- Creates a download link with filename `semantic-galaxy-{timestamp}.png`
- On mobile: uses `navigator.share()` if available (native share sheet), falls back to download

---

## 11. File Structure Refactor

Break the 1147-line App.tsx into focused modules:

```
src/
├── App.tsx                      # Layout shell, state coordination, progressive disclosure
├── components/
│   ├── GalaxyCanvas.tsx         # R3F Canvas, camera controller, post-processing
│   ├── GalaxyPoints.tsx         # InstancedMesh + InteractiveSpheres
│   ├── ConnectionLines.tsx      # Edge line segments with confidence opacity
│   ├── ClusterBoundaries.tsx    # Convex hull overlays for DBSCAN clusters
│   ├── Sidebar.tsx              # Detail panel + search results (desktop floating)
│   ├── MobilePanel.tsx          # Bottom 40% panel (mobile split)
│   ├── Toolbar.tsx              # Collapsible controls bar
│   ├── SearchBar.tsx            # Search input + filter chips
│   ├── StatsHUD.tsx             # Stats overlay
│   ├── LoadingScreen.tsx        # Animated loading state
│   └── Logo.tsx                 # Galaxy SVG logo (existing)
├── hooks/
│   ├── useGalaxyData.ts         # Data loading, UMAP projection (2D+3D), clustering
│   ├── useSearch.ts             # Search logic, text matching, result ranking
│   ├── useColorMode.ts          # Color mode state + point color computation
│   └── useMobileDetect.ts      # Viewport width + touch capability detection
├── lib/
│   ├── clustering.ts            # DBSCAN wrapper, cluster labeling, convex hull computation
│   ├── umap.ts                  # UMAP projection helpers
│   ├── colors.ts                # Color computation for all modes (type, cluster, source, density)
│   └── screenshot.ts            # Canvas-to-PNG export (requires preserveDrawingBuffer)
├── store.ts                     # Zustand store for global state (replaces useState sprawl)
├── constants.ts                 # Type/color mappings (existing, extended)
├── types.ts                     # Shared TypeScript interfaces
├── index.css                    # Global styles + mobile breakpoints
├── main.tsx                     # Entry point
├── umap-js.d.ts                 # UMAP type declarations
└── vite-env.d.ts                # Vite types
```

---

## 12. Data Pipeline

**No changes.** Same TSV files (vectors.tsv, metadata.tsv, edges.tsv), same kg-export-projector.sh export script. All new features are client-side computation on existing data.

---

## 13. New Dependencies

| Package | Purpose |
|---------|---------|
| `density-clustering` | DBSCAN clustering (CommonJS, no types — write thin wrapper). If import fails, inline a ~50-line DBSCAN. |
| `zustand` | State management (replace useState sprawl). NOT currently installed despite earlier claim — must `npm install`. |

Removed from earlier draft:
- `d3-scale-chromatic` — replaced by hand-rolled palettes to keep bundle small

Already installed and reused:
- `three` (ConvexGeometry from `three/addons/`)
- `umap-js`
- `@react-three/drei`, `@react-three/fiber`, `@react-three/postprocessing`

---

## 14. Out of Scope

- Backend/API changes
- New data sources or embedding models
- Real-time data updates
- User accounts or saved states
- Drift analysis (requires temporal reference data we don't have yet)
