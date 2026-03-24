# Semantic Galaxy Enhancements — Design Spec

**Goal:** Transform the Semantic Galaxy from a basic 3D point cloud into a professional embedding explorer that impresses on first glance and reveals power-user data tools on demand. Mobile-first, static deployment on GitHub Pages.

**Audience:** Both — impressive showcase for clients/investors at first glance, with professional data engineering tools (filters, color modes, clustering, export) tucked behind toggles and panels.

**Architecture:** React 19 + Three.js/R3F + Tailwind CSS v4. Static site, no backend. All new features are client-side computation on existing TSV data files.

**Deployment:** GitHub Pages via GitHub Actions (unchanged).

---

## 1. Layout & Progressive Disclosure

### Default State (Showcase Mode)
- Full-screen 3D galaxy with subtle bloom, animated points
- Auto-rotating camera orbit so the scene feels alive
- Minimal chrome: logo, search bar (bottom center), small toolbar toggle (top-right)
- Tapping/clicking a node shows a clean detail card

### Power Mode (Toggled)
- Toolbar expands with all controls (color-by, 2D/3D, clusters, edges, export)
- Stats HUD appears with type breakdown
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

---

## 3. 2D/3D Toggle

- **3D** is default (impressive first impression)
- **2D** mode re-runs UMAP with `nComponents: 2`, locks camera to top-down orthographic view
- Smooth animated transition: points lerp from old positions to new over ~1 second
- Toggle is a button in the toolbar (cube icon for 3D, square icon for 2D)

---

## 4. Clustering (HDBSCAN)

- Runs client-side on the 3D UMAP positions (not the 768-dim raw vectors — too expensive in browser)
- Uses a JavaScript HDBSCAN implementation or density-based equivalent
- Each cluster auto-labeled by its most common type (e.g., "Cluster 3: mostly technology")
- Convex hull outlines drawn around each cluster boundary
- Cluster boundaries toggleable independently of color mode
- Cluster count shown in Stats HUD
- In "Color by Cluster" mode, each cluster gets a distinct color; noise points get grey

---

## 5. Edge Rendering (Enhanced)

- Current: all 634 edges as vertex-colored line segments
- Enhanced: opacity based on confidence score (high confidence = solid, low = faint)
- When a node is selected: only its edges highlight at full opacity, rest dim to 10%
- Edge visibility togglable via toolbar
- Edge type colors remain from current `EDGE_TYPE_COLORS` mapping

---

## 6. Toolbar & Controls

### Collapsed by Default
- Small icon button (sliders/gear icon) in top-right corner
- Tapping reveals the full toolbar

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
| Reset view | home | Return camera to default orbit position |

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
| Arrow keys | Cycle through search results |

---

## 7. Stats HUD

- Hidden by default (appears in power mode / when toolbar is expanded)
- Shows: total points, entities, memories, edges, cluster count
- Expandable to show type breakdown with colored dot indicators
- On mobile: accessible as a tab in the bottom info panel

---

## 8. Detail Panel

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

## 9. Search

- **Text search** (current implementation — works on GitHub Pages without Ollama)
- Results show: label, type badge (colored), snippet of detail field
- Results highlight in galaxy as brighter/larger points
- Top result auto-focused by camera
- **Filter chips** below search bar: tap to filter by type (person, technology, episodic, etc.) or source (entity/memory)
- On mobile: search activates the 60/40 split with results in the bottom panel

---

## 10. Touch Optimizations (Mobile)

- Larger tap targets for nodes (increase hit detection radius on mobile)
- No hover states — everything is tap-based
- Pinch to zoom, drag to orbit (Three.js OrbitControls touch support)
- Toolbar items are icon buttons with labels below (not tiny icon-only)
- Prevent accidental orbit when tapping nodes (distinguish tap vs drag via movement threshold)
- Swipe-down on bottom panel to dismiss

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
│   ├── ClusterBoundaries.tsx    # Convex hull overlays for HDBSCAN clusters
│   ├── Sidebar.tsx              # Detail panel + search results (desktop floating)
│   ├── MobilePanel.tsx          # Bottom 40% panel (mobile split)
│   ├── Toolbar.tsx              # Collapsible controls bar
│   ├── SearchBar.tsx            # Search input + filter chips
│   ├── StatsHUD.tsx             # Stats overlay
│   ├── LoadingScreen.tsx        # Animated loading state
│   └── Logo.tsx                 # Galaxy SVG logo (existing)
├── hooks/
│   ├── useGalaxyData.ts         # Data loading, UMAP projection, clustering
│   ├── useSearch.ts             # Search logic, text matching, result ranking
│   ├── useColorMode.ts          # Color mode state + point color computation
│   └── useMobileDetect.ts      # Viewport detection, touch vs mouse
├── lib/
│   ├── clustering.ts            # HDBSCAN wrapper, cluster labeling
│   ├── umap.ts                  # UMAP projection (2D/3D), position interpolation
│   ├── colors.ts                # Color computation for all modes (type, cluster, source, density)
│   └── screenshot.ts            # Canvas-to-PNG export
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
| `density-clustering` or equivalent | HDBSCAN/DBSCAN for client-side clustering |
| `d3-scale-chromatic` | Color scales for cluster and density modes |
| `three` (already installed) | Convex hull geometry (ConvexGeometry from three/examples) |

No heavy additions. Zustand is already installed but unused — will use it for state management in the refactor.

---

## 14. Out of Scope

- Backend/API changes
- New data sources or embedding models
- Real-time data updates
- User accounts or saved states
- Drift analysis (requires temporal reference data we don't have yet)
