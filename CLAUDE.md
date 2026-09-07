# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
npm run dev       # Vite dev server (5173)
npm run build     # tsc -b && vite build — type-check runs first
npm run lint      # eslint .
npm run test      # vitest run (domain unit tests)
npx vitest run src/domain/rooms.test.ts       # single file
npm run deploy    # build + firebase deploy — deploys live; confirm first
```

No separate typecheck script — run `npx tsc -b`.

`preview.html` is a Firebase-free dev harness:
- `/preview.html` — renders a demo scene through `SceneView` + the blueprint/line export.
- `/preview.html?editor` — mounts the **full editor** (TopBar/Toolbar/LeftPanel/PlannerCanvas/
  PropertiesPanel) with a demo project loaded into the store, no auth/Firestore.
Not part of the production build (Vite only bundles `index.html`).

## Architecture

Vite + React 19 + TS + Tailwind v4 (CSS-first `@theme` in `src/index.css`) + Zustand +
Konva/react-konva. Firebase only (Auth + Firestore + Hosting). **2D only** — no server, all
geometry client-side.

### Domain (`src/domain/`, pure, each with `*.test.ts`)

- `scene.ts` — all types + `emptyScene`/`normalizeScene`/`makeRoomRect`/`makeRoomL|U|T`. Geometry
  is in **centimetres**, world-space, Y-down. `Scene`: `walls, rooms, surfaces, openings,
  furniture, texts, dims, symbols, routes, zones, styleboards, compass, settings`. `Wall`/`Opening`
  carry `status` (`existing|demolish|new`); `Route` carries `gauge`/`circuit`; `Zone.kind` covers
  heat-cable/heat-water/screed/plaster/insulation/waterproofing. `settings`: `renderMode`
  (`line|blueprint|color`), `layers`, `showOverallChains`, `showDemolition`, `colorByCircuit`,
  `wallHeight`. **`normalizeScene` is the migration layer** — it back-fills every field and
  converts legacy `heatZones[]` → `zones[]`, so any old Firestore doc or `.floorplan` import loads.
- `geometry.ts` — area/centroid/bbox/projection/rotation, `pointInPolygon`, `signedAreaCm2`.
- `units.ts` — cm ⇆ m/mm; `dimensions.ts` — `wallDimensions`, `overallChains`, `roomLabels`,
  `measureLabel`; `snapping.ts` — grid/vertex/angle snap.
- `rooms.ts` — `detectRooms(walls)`: **planarizes** walls (splits at T-junctions) then traces
  minimal graph faces, drops the outer. `reconcileRooms` keeps names/floors by centroid.
- `walls.ts` — `wallNodes`, `moveNode`, `splitWall`, `mergeCollinear`.
- `schedule.ts` — `furnitureSchedule`, `roomSchedule`; `circuits.ts` — `circuitGroups` /
  `circuitColorMap` (group engineering by `circuit`, assign colours);
  `elevation.ts` — `wallElevation(scene, wallId)` + `furnitureHeight(kind)`;
  `svgExport.ts` — `sceneToSVG` (vector, 1 unit = 1 cm); `projectFile.ts` —
  `toProjectFile`/`fromProjectFile` (`.floorplan` JSON round-trip).

### Config / services / stores

- `src/config/` — `dotenv.config.ts`, `firebase.config.ts`, `firebase.factory.ts`
  (`FirebaseFactory<T>` generic CRUD; sanitizes `undefined` → `null`).
- `src/services/projects.service.ts` — `dbProjects` only. Projects are a shared workspace.
- `src/store/useAuthStore.ts` — Google popup + email allowlist gate (signs out non-allowed).
- `src/store/useProjectsStore.ts` — project list CRUD.
- `src/store/usePlannerStore.ts` — the editor. `selected: Selection[]` (multi-select),
  `commit`-based undo/redo, `beginDrag`/`dragElementTo`/`endDrag` for smooth grouped drags,
  clipboard (`copySelection`/`paste`), `align/nudge/move Selected`, wall-node ops
  (`moveWallNode`, `splitWallAt`), `autoDetectRooms`, `addSymbol/addRoute/addHeatZone/addCompass`,
  `setRoomFloor/setWallMaterial/setWallThickness`. `layerOf(type)` maps element → layer.
  `toScreen`/`toWorld` helpers here.

### Rendering (`src/components/Editor/render/`)

- `SceneView.tsx` — the single component that draws the whole 2D scene into one scaled Konva
  `<Group>`, painting `theme.background` first (so blueprint/line show on-screen too). Reused
  verbatim on-screen and for raster export. Respects `settings.layers`, `showDemolition`
  (red/green wall+opening strokes), `colorByCircuit` (via `circuitColorMap`). Order: grid → rooms
  → surfaces → walls (Rect + procedural texture) → joints → openings → zones → routes → symbols →
  furniture (+`id="furn-<id>"` for the Transformer) → dims → overall chains → labels → compass.
- `theme.ts` — `themeForMode(mode)` → screen/blueprint/line palettes.
- `hatch.ts` — **procedural** canvas textures (`wallHatch`, `floorHatch`, `WALL_MATERIAL_COLOR`,
  `floorTint`): brick/wood-grain/concrete/glass walls, herringbone/plank/tile/carpet floors.
  Same canvases feed the 3D view as `CanvasTexture`.
- `SymbolShape` / `RouteShape` (with `gauge` label + `colorOverride`) / `CompassMark`.
- `exportScene.tsx` — offscreen raster export (paper A4–A1, scale 1:20–1:200/DPI, title block,
  furniture spec + room explication tables). SVG export goes through `domain/svgExport.ts`
  instead (a real vector path, not Konva).

### 3D (`src/components/Editor/3d/`, lazy-loaded)

`Scene3D.tsx` — `@react-three/fiber` + `drei` `<OrbitControls makeDefault enableDamping>` (LMB
rotate / RMB pan / wheel zoom). Walls become boxes split around openings (below sill / above head /
side pieces); floors are double-sided `ShapeGeometry` planes with the procedural textures;
furniture are boxes sized `w × furnitureHeight(kind) × d`. In-canvas HUD (`CameraRig` + a
`{preset, nonce}` state) has view presets **3D / Зверху / Спереду / Збоку** that reposition the
camera and re-`target` the controls. `webglSupported()` guard + `Canvas3DBoundary` show a message
instead of a blank canvas when WebGL is unavailable. `usePlannerStore.view3d` + TopBar 2D/3D
toggle; `Editor` swaps `<PlannerCanvas>` ↔ `<Scene3D>`.

### Wall elevations

`ElevationView.tsx` (modal, opened by `openElevation(wallId)` from `WallProps`) renders
`wallElevation()` — wall rectangle at `wallHeight`, openings as cut-outs at sill/head, furniture
silhouettes projected onto the wall axis, dimension chain — with PNG/PDF download.

### Editor UI (`src/components/Editor/`)

- `Toolbar.tsx` — thin left rail: select/wall/room(+poly/L/U/T)/surface/door/window/opening/
  demolish/text/dimension/measure/compass/pan + grid/snap toggles.
- `LeftPanel.tsx` — tabs: **Каталог** (`constants/catalog.ts`, ~100 items, HTML5 drag-to-canvas),
  **Інженерне** (`constants/engineering.ts`: Електрика/Сантехніка/Опалення/Ремонт — symbol
  palettes + wire/pipe tools + `ZONE_KINDS` zone tools), **Оздоблення** (styleboards +
  apply-finish-to-selection), **Об'єкти** (layers, circuit legend, element list).
- `PropertiesPanel.tsx` — 0 → hint; 1 → per-type editor (wall gets status + "Розгортка"; opening
  gets sill/head + status; route gets `gauge`/`circuit`; surface/zone editors); ≥2 → align + dup.
- `TopBar.tsx` — title, undo/redo, fit, zoom, 2D/3D, render-mode toggle, overall-chains,
  compass, detect-rooms, demolition toggle, colour-by-circuit toggle, `.floorplan` download,
  units, save, export.
- `Canvas/PlannerCanvas.tsx` — pan/zoom, marquee multi-select, grouped drag (`dragElementTo`),
  wall-node handles, a Konva `<Transformer>` bound to the single selected furniture
  (`onTransformEnd` → `transformFurniture`), right-click wall menu, and every draw tool
  (wall/room/surface chains, openings, demolish click-cycle, symbols with wall-snap, routes,
  zones, room presets, compass, ephemeral measure).

### Access control

`src/constants/allowlist.ts` (`ALLOWED_EMAILS`) + `firestore.rules` (`allowedEmails()`) — keep
in sync. `useAuthStore` signs out any Google account not in the list.

### Out of scope (deliberately)

- **Excluded for good** (house-level, not "apartment plan"): multi-floor / multiple sheets;
  standalone structural elements (columns, beams, stairs, balconies, terraces, floor openings);
  roof, terrain.
- **Deferred**: trace-over background image (upload a scan and draw over it) — would need a
  base64 blob in the Firestore doc, since the project has no Firebase Storage.

Feature backlog / ideas for future work: `docs/FEATURES.md`. Note the app is for **personal
use** (the owners planning their own flat) — that doc's roadmap is prioritised accordingly and
skips agency/commercial features.
