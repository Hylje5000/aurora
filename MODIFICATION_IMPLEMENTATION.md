# Implementation Plan: Phase 1 Route Planning

**Date:** 2026-05-16  
**Branch:** `feat/navigation-api`  
**Design doc:** `MODIFICATION_DESIGN.md`

---

## Journal

_Updated after each phase._

---

## Phase 0 — Baseline health check

- [ ] Run `npm test` and confirm all tests pass before any changes.

---

## Phase 1 — Types and API route

### Tasks

- [ ] Create `src/lib/routing.ts` with:
  - `RouteProfile` type
  - `Waypoint`, `RouteStep`, `RouteLeg`, `PlannedRoute` interfaces
  - `PROFILE_COLORS: Record<RouteProfile, string>`
  - `formatDuration(s: number): string`
  - `formatDistance(m: number): string`
  - `profileLabel(p: RouteProfile): string`
- [ ] Create `src/app/api/route-plan/route.ts`:
  - `POST` handler
  - Validate 2–25 waypoints, known profile → 400 on failure
  - Missing `NEXT_PUBLIC_MAPBOX_TOKEN` → 503 + `X-Aurora-Warning` header
  - Build Mapbox Directions URL (`geometries=geojson&steps=true&overview=full`)
  - Forward fetch, parse `routes[0]`, normalise to `PlannedRoute`
  - Empty `routes` array → 404
  - Mapbox non-200 → 502
- [ ] Create `src/test/lib/routing.test.ts`
- [ ] Create `src/test/api/route-plan.test.ts`
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`
- [ ] Re-read this file and update accordingly.
- [ ] Update Journal with findings.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for approval, then commit.

---

## Phase 2 — RoutePanel component

### Tasks

- [ ] Create `src/components/RoutePanel.tsx`:
  - `'use client'` directive
  - `forwardRef` with `RoutePanelHandle { addWaypoint(coords: [number, number]): void }`
  - Internal state: `waypoints`, `profile`, `route`, `loading`, `error`, `expandedLeg`
  - Profile selector: 4 icon buttons with active highlight
  - Waypoint list: numbered labels, up/down reorder, × remove
  - "Add Stop" button → calls `onAddingWaypointChange(true)`
  - "Clear" button → resets waypoints + route
  - Auto-fetch: 400 ms debounce on `[waypoints, profile]`
  - Summary row: total distance + duration (hidden when no route)
  - Leg accordion: click to expand → step list
  - Loading spinner and error display
  - Close button calls `onClose`
  - Dark-slate visual style matching existing panels
- [ ] Export `RoutePanelHandle` type
- [ ] After completing tasks, add new tasks for anything left TODO in code.
- [ ] Create `src/test/components/RoutePanel.test.tsx`
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`
- [ ] Re-read this file and update accordingly.
- [ ] Update Journal with findings.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for approval, then commit.

---

## Phase 3 — MapView additions

### Tasks

- [ ] Add new optional props to `MapViewProps`:
  - `plannedRoute?: PlannedRoute | null`
  - `routeProfile?: RouteProfile`
  - `routeWaypoints?: Waypoint[]`
  - `addingWaypoint?: boolean`
  - `onWaypointClick?: (coords: [number, number]) => void`
- [ ] Add `addingWaypointRef` (mirrors prop, used inside async click handler)
- [ ] Add `waypointMarkersRef: mapboxgl.Marker[]` for cleanup
- [ ] In `style.load`: add `route-source` + `route-line` layer (line, width 5, slot `top`)
- [ ] Add `useEffect([plannedRoute, routeProfile])`: update source data + line color
- [ ] Add `useEffect([routeWaypoints])`: remove old markers, create new numbered markers
- [ ] Add `useEffect([addingWaypoint])`: sync cursor and ref
- [ ] Modify elevation click: check `addingWaypointRef` first; if true, call `onWaypointClick` and return
- [ ] Clean up waypoint markers in teardown
- [ ] After completing tasks, add new tasks for anything left TODO in code.
- [ ] Add MapView test coverage in `src/test/components/MapView.test.tsx`
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`
- [ ] Re-read this file and update accordingly.
- [ ] Update Journal with findings.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for approval, then commit.

---

## Phase 4 — MapWithNav wiring + Route button

### Tasks

- [ ] Add 6 new state vars + `routePanelRef` to `MapWithNav`
- [ ] Add `handleWaypointClick` and `handleRouteChange` callbacks
- [ ] Add floating Route button (`absolute top-4 right-20 z-10`)
- [ ] Render `<RoutePanel ref={routePanelRef}>` when `routePanelOpen`
- [ ] Pass new props to `<MapView>`
- [ ] After completing tasks, add new tasks for anything left TODO in code.
- [ ] Add/update `MapWithNav` tests in `src/test/components/MapWithNav.test.tsx`
- [ ] Run `next lint --fix` and fix any issues.
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`
- [ ] Re-read this file and update accordingly.
- [ ] Update Journal with findings.
- [ ] Run `git diff`, draft commit message, present to user for approval.
- [ ] Wait for approval, then commit.

---

## Phase 5 — Final checks and documentation

### Tasks

- [ ] Run `npm run test:coverage` and record coverage summary in the Journal.
- [ ] Verify in the running dev server that the feature works end-to-end:
  - Open route panel, add 2+ waypoints by clicking map, route line appears
  - Profile switch recolours the line
  - Clear button removes line and markers
  - Existing features (elevation, cell towers, drawing) still work
- [ ] Update `CLAUDE.md` to document the new files, components, and patterns.
- [ ] Update `README.md` if relevant.
- [ ] Ask the user to inspect the running app and confirm they are satisfied.

---

## File Summary

### New files

| File | Purpose |
|------|---------|
| `src/lib/routing.ts` | Types + formatting helpers |
| `src/app/api/route-plan/route.ts` | Backend Directions API proxy |
| `src/components/RoutePanel.tsx` | Floating route planning UI |
| `src/test/lib/routing.test.ts` | Unit tests for lib |
| `src/test/api/route-plan.test.ts` | API route tests |
| `src/test/components/RoutePanel.test.tsx` | Component tests |

### Modified files

| File | Changes |
|------|---------|
| `src/components/MapView.tsx` | Route source/layer, waypoint markers, `addingWaypoint` cursor, click intercept |
| `src/components/MapWithNav.tsx` | Route panel state, Route button, wiring |
| `src/test/components/MapView.test.tsx` | New prop coverage |
| `src/test/components/MapWithNav.test.tsx` | Route button + wiring tests |
