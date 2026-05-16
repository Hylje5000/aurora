# Implementation Plan: Phase 2 Route Intelligence

**Date:** 2026-05-16  
**Branch:** `feat/navigation-api`  
**Design doc:** `MODIFICATION_DESIGN.md`

---

## Phase 0 — Pre-flight checks

- [ ] Run `npm test` to confirm the suite is green before starting.
- [ ] Confirm branch is `feat/navigation-api` and working tree is clean.

---

## Phase 1 — Types (`src/lib/routing.ts`)

Add `VehicleProfile`, `VEHICLE_PRESETS`, `HazardSeverity`, `RouteHazard`, and `RouteIntelligence` to the routing type module.

### Tasks

- [ ] Add `VehicleProfile` interface with fields: `label`, `mass_t`, `axle_mass_t`, `bogie_mass_t`, `height_m`, `width_m`.
- [ ] Add `VEHICLE_PRESETS` array: Infantry (mass 0), Wheeled APC (18 t), IFV/BMP (22 t), MBT/tank (60 t), Custom (zeros).
- [ ] Add `HazardSeverity` type: `'critical' | 'warning' | 'info'`.
- [ ] Add `RouteHazard` interface: `id`, `type`, `severity`, `message`, `coordinates`, `properties`.
- [ ] Add `RouteIntelligence` interface: `hazards: RouteHazard[]`, `summary: { critical, warning, info, passable }`.
- [ ] Update `src/test/lib/routing.test.ts` — add tests for `VEHICLE_PRESETS` completeness (5 entries, Infantry mass_t=0, MBT mass_t=60) and type shapes.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Update `MODIFICATION_IMPLEMENTATION.md` journal, check off completed tasks.
- [ ] Present commit message to user and wait for approval before committing.

---

## Phase 2 — API route (`POST /api/route-intelligence`)

New file: `src/app/api/route-intelligence/route.ts`

### Tasks

- [ ] Create `src/app/api/route-intelligence/route.ts`.
- [ ] Validate request body: `routeGeometry` must be a GeoJSON LineString with ≥2 coordinates; `vehicle` must be a `VehicleProfile`-shaped object (all numeric fields, non-negative). Return 400 on failure.
- [ ] Return 503 with empty hazards + `X-Aurora-Warning` header when `DATABASE_URL` is not set.
- [ ] Implement roads PostGIS query:
  - `DISTINCT ON (link_id)` within 20 m of the route geometry (geography cast).
  - Return `ST_ClosestPoint` as the representative coordinate for the hazard marker.
  - `LIMIT 500` to bound query cost.
- [ ] Implement bridges PostGIS query: within 50 m of route geometry, no dedup needed (bridges are unique points).
- [ ] Implement `classifyRoadHazards(row, vehicle)` pure function covering all 10 road rules (damage recurring, damage, condition class, mass, bogie mass, axle mass, width, height, pavement, rut depth).
- [ ] Implement `classifyBridgeHazards(row, vehicle)` pure function covering all 5 bridge rules (status, vehicle mass, bogie mass, axle mass, height).
- [ ] Build `hazards[]` array, sort CRITICAL → WARNING → INFO.
- [ ] Compute `summary` from hazard counts; `passable = critical === 0`.
- [ ] Return `{ hazards, summary }` as JSON.
- [ ] Handle DB errors with 500.
- [ ] Create `src/test/api/route-intelligence.test.ts`:
  - Missing DATABASE_URL → 503 with empty hazards.
  - Invalid body (missing routeGeometry, bad vehicle) → 400.
  - Road hazard: `has_damage=true, damage_recurring=true` → WARNING.
  - Road hazard: `condition_class=5` → WARNING.
  - Road hazard: `max_mass_kg=10000, vehicle.mass_t=60` → CRITICAL.
  - Road hazard: `width_cm=200, vehicle.width_m=3.6` → CRITICAL.
  - Road hazard: `pavement_type=2` → INFO.
  - Bridge hazard: `max_vehicle_mass_t=16, vehicle.mass_t=60` → CRITICAL.
  - Bridge hazard: `height_restriction_m=2.5, vehicle.height_m=2.9` → CRITICAL.
  - Infantry (mass_t=0) skips mass-based checks.
  - Multiple hazards sorted CRITICAL first.
  - Empty result (no roads/bridges near route) → `passable: true`.
  - DB error → 500.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Update `MODIFICATION_IMPLEMENTATION.md` journal.
- [ ] Present commit message to user and wait for approval before committing.

---

## Phase 3 — RoutePanel UI additions

Extend `src/components/RoutePanel.tsx` with the vehicle selector and hazard list.

### Tasks

- [ ] Add `onHazardsChange?: (intel: RouteIntelligence | null) => void` and `onHazardFocus?: (hazard: RouteHazard) => void` to `RoutePanelProps`.
- [ ] Add `vehicle` state (type `VehicleProfile`), initialised to Infantry preset.
- [ ] Add `intelligence` state (type `RouteIntelligence | null`), initially `null`.
- [ ] Add `intelligenceLoading` state (`boolean`).
- [ ] Add vehicle intelligence abort ref and debounce ref (600 ms, fires after route is set and vehicle changes).
- [ ] Add `useEffect([route, vehicle])` that triggers `POST /api/route-intelligence` with 600 ms debounce; calls `onHazardsChange` with result.
- [ ] Clear `intelligence` when `route` becomes null; call `onHazardsChange(null)`.
- [ ] Render **Vehicle section** above Waypoints:
  - `<select>` with 5 preset options; selecting auto-fills fields below.
  - 5 `<input type="number" min="0" step="0.1">` fields: Mass (t), Axle (t), Bogie (t), Height (m), Width (m).
  - Editing any field switches preset display to "Custom" (track preset by index, not name).
- [ ] Render **Route Assessment section** below route summary, only when `route !== null`:
  - Summary line: green "✓ Route passable" or red "✗ IMPASSABLE — N critical" based on `intelligence?.summary`.
  - Warning/info count line (amber) when `warning > 0 || info > 0`.
  - Scrollable hazard list (max-h-48); each hazard is a `<button>` calling `onHazardFocus?.(hazard)`.
  - Hazard row: colored dot (red/amber/slate) + message text.
  - Loading indicator while `intelligenceLoading`.
- [ ] Extend `src/test/components/RoutePanel.test.tsx`:
  - Vehicle selector renders with 5 options.
  - Selecting "MBT (tank)" preset auto-fills mass=60.
  - Editing a field switches selected preset label to "Custom".
  - Intelligence fetch fires after route is set + debounce.
  - Hazard list renders CRITICAL rows in red, WARNING in amber.
  - Clicking a hazard row calls `onHazardFocus` with correct hazard.
  - Passable summary shows green text when `critical=0`.
  - Impassable summary shows red text when `critical>0`.
  - Intelligence cleared when route cleared.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Update `MODIFICATION_IMPLEMENTATION.md` journal.
- [ ] Present commit message to user and wait for approval before committing.

---

## Phase 4 — MapView hazard layers + focused-hazard effect

Extend `src/components/MapView.tsx` to render hazard circles and handle hazard focus.

### Tasks

- [ ] Add `routeHazards?: RouteHazard[]` and `focusedHazard?: RouteHazard | null` to `MapViewProps`.
- [ ] In `style.load` (after existing route layers), add:
  - GeoJSON source `route-hazards-source` (empty FeatureCollection).
  - Layer `route-hazards-critical` — circle, color `#ef4444`, radius 8, stroke white 2px, filter `severity == "critical"`, slot `top`.
  - Layer `route-hazards-warning` — circle, color `#eab308`, radius 6, stroke white 1px, filter `severity == "warning"`, slot `top`.
  - Layer `route-hazards-info` — circle, color `#94a3b8`, radius 5, filter `severity == "info"`, slot `top`.
- [ ] Add `useEffect([routeHazards])` guarded by `styleLoadedRef`: convert `routeHazards` to a GeoJSON FeatureCollection (Point features; properties: `severity`, `id`, `message`, `type`) and call `setData` on `route-hazards-source`.
- [ ] Add `hazardFocusMarkerRef` (`useRef<mapboxgl.Marker | null>(null)`).
- [ ] Add `useEffect([focusedHazard])`: remove previous marker; if non-null, `map.flyTo({ center, zoom: 15, duration: 800 })` and create a `mapboxgl.Marker({ color: severityColor(focusedHazard.severity) })` at coordinates.
- [ ] Clean up `hazardFocusMarkerRef` in map teardown.
- [ ] Update `src/test/components/MapView.test.tsx`:
  - `routeHazards` prop with CRITICAL hazard → `setData` called with FeatureCollection containing `severity: "critical"` property.
  - `focusedHazard` set → mock map's `flyTo` called with correct center.
  - Changing `focusedHazard` removes previous marker.
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Update `MODIFICATION_IMPLEMENTATION.md` journal.
- [ ] Present commit message to user and wait for approval before committing.

---

## Phase 5 — MapWithNav wiring

Wire `RoutePanel` ↔ `MapView` hazard state through `MapWithNav`.

### Tasks

- [ ] Add `routeIntelligence` state (`RouteIntelligence | null`) to `MapWithNav`.
- [ ] Add `focusedHazard` state (`RouteHazard | null`) to `MapWithNav`.
- [ ] Implement `handleHazardsChange(intel)`: `setRouteIntelligence(intel)`.
- [ ] Implement `handleHazardFocus(hazard)`:
  - `setFocusedHazard(hazard)`.
  - `setInfoPanelData({ title: bridgeOrRoadTitle, rows: buildHazardInfoRows(hazard) })` — include message, severity, coordinates, and key properties from `hazard.properties` (e.g. bridge name, mass limits).
- [ ] Pass to `RoutePanel`: `onHazardsChange={handleHazardsChange}` and `onHazardFocus={handleHazardFocus}`.
- [ ] Pass to `MapView`: `routeHazards={routeIntelligence?.hazards ?? []}` and `focusedHazard={focusedHazard}`.
- [ ] Clear `focusedHazard` when InfoPanel is closed (in `onClose` handler).
- [ ] Update `src/test/components/MapWithNav.test.tsx`:
  - `onHazardsChange` from `RoutePanel` stub updates `routeHazards` passed to `MapView` stub.
  - `onHazardFocus` from `RoutePanel` stub triggers InfoPanel to open (check `data-testid` / aria).
- [ ] Run `next lint --fix`.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `prettier --write .`.
- [ ] Update `MODIFICATION_IMPLEMENTATION.md` journal.
- [ ] Present commit message to user and wait for approval before committing.

---

## Phase 6 — Final checks & documentation

- [ ] Run `npm run test:coverage` and record the summary in the Journal below.
- [ ] Verify no TODO comments or unimplemented stubs remain in new/modified files.
- [ ] After completing any tasks, if any TODOs were added during coding, add new tasks to address them before closing out.
- [ ] Update `CLAUDE.md` to reflect Phase 2 additions: `VehicleProfile`, `VEHICLE_PRESETS`, `RouteHazard`, `RouteIntelligence`, `POST /api/route-intelligence` route, vehicle selector + hazard panel in `RoutePanel`, hazard layers in `MapView`, `focusedHazard`/`routeIntelligence` state in `MapWithNav`.
- [ ] Ask the user to inspect the running app and confirm they are satisfied.

---

## Journal

### 2026-05-16 — All phases complete

**Phase 0 (Pre-flight):** 386 tests passing, clean branch. ✓

**Phase 1 (Types):** Added `VehicleProfile`, `VEHICLE_PRESETS` (5 presets), `HazardSeverity`, `RouteHazard`, `RouteIntelligence` to `src/lib/routing.ts`. 5 new tests → 391 total. ✓

**Phase 2 (API):** Created `POST /api/route-intelligence`. Roads query uses `DISTINCT ON (link_id)` and `ST_ClosestPoint` for representative coordinates. Bridges query uses 50 m buffer. 10 road rules + 5 bridge rules. Infantry (`mass_t=0`) correctly skips mass checks. 28 new tests → 419 total. ✓

**Phase 3 (RoutePanel UI):** Vehicle selector with preset auto-fill + custom editing. Route assessment section with passable/impassable summary + severity-colored hazard rows. **Surprise:** React Compiler ESLint rules (`react-hooks/refs`, `react-hooks/set-state-in-effect`) flagged patterns that the original code used without issue. Root cause: the plugin does whole-component analysis and adding more effects/state changes its evaluation. Fixed by: (1) targeted `eslint-disable` for the "latest ref" pattern (same as original, two refs needed); (2) `eslint-disable` block for the 3-setState early-return in the route fetch effect; (3) restructured intelligence effect to have no synchronous `setState` in its early return. 9 new tests → 428 total. ✓

**Phase 4 (MapView layers):** `route-hazards-source` + 3 circle layers added in `style.load`. `useEffect([routeHazards])` syncs GeoJSON. `useEffect([focusedHazard])` handles `flyTo` + colored marker. `mockFlyTo` added to MapView test mock. **Deviation:** existing "cell tower filter" test used `mock.calls[last]` which broke when hazard effect fired an additional `setData`. Fixed by looking up the cell-towers-source call index explicitly. 5 new tests → 433 total. ✓

**Phase 5 (MapWithNav wiring):** `routeIntelligence` + `focusedHazard` state. `handleHazardsChange` clears `focusedHazard` when null. `handleHazardFocus` builds InfoPanel rows (bridge: name/mass/height/status; road: mass/width/condition class). InfoPanel `onClose` clears `focusedHazard`. RoutePanel stub updated with `TriggerHazards`/`ClearHazards`/`FocusHazard` buttons. MapView stub exposes `data-hazard-count` + `data-focused-hazard` attributes. 4 new tests → 437 total. ✓

**Phase 6 (Final):** Coverage run: `routing.ts` 100%, `route-intelligence/route.ts` 96.3%, `RoutePanel.tsx` 98.6%, `MapWithNav.tsx` 86%, `MapView.tsx` 86%. CLAUDE.md updated with Route Intelligence section. MODIFICATION_IMPLEMENTATION.md updated. ✓

**Total test count:** 437 (up from 386 before Phase 2 work began).
**No TODO stubs remain** in any new or modified files.
