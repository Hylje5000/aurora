# Implementation Plan: Military Terrain & Intelligence Layers

## Journal

_(Updated after each phase)_

---

## Phase 0: Baseline Health Check

- [ ] Run `npm test` to confirm all 67 tests pass before any changes.
- [ ] Run `tsc --noEmit` to confirm zero TypeScript errors.
- [ ] Run `next lint` to confirm zero lint errors.

---

## Phase 1: Shared Layer Types (`src/lib/layers.ts`)

Create the shared type definitions and constants that both `MapView` and `LayerPanel` will import.

- [ ] Create `src/lib/layers.ts` with:
  - `LayerKey` union type: `'terrain3d' | 'hillshade' | 'contours' | 'landcover'`
  - `LayerVisibility` interface (extends `Record<LayerKey, boolean>`)
  - `DEFAULT_LAYER_VISIBILITY` constant (terrain3d off, others on)
  - `LAYER_GROUPS` constant mapping each `LayerKey` to the Mapbox layer IDs it controls
- [ ] Create unit tests in `src/test/lib/layers.test.ts`:
  - All keys present in `DEFAULT_LAYER_VISIBILITY`
  - `LAYER_GROUPS` entries match the layer IDs that will be added to the map
- [ ] Run `next lint --fix`
- [ ] Run `tsc --noEmit` and fix any errors
- [ ] Run `npm test` — must be green
- [ ] Run `prettier --write .`
- [ ] Re-read this file and update if needed
- [ ] Update Journal with findings
- [ ] Present `git diff` and commit message for approval — wait for approval before committing

---

## Phase 2: LayerPanel Component (`src/components/LayerPanel.tsx`)

Build the floating toggle panel UI.

- [ ] Create `src/components/LayerPanel.tsx`:
  - `'use client'` directive
  - Props: `visibility: LayerVisibility`, `onToggle: (key: LayerKey) => void`
  - Collapsible panel (local `open` state, defaults to `true`)
  - Fixed position: `absolute left-4 bottom-10` inside map container
  - Dark slate style: `bg-slate-900/90 border border-slate-700 rounded-lg`
  - Header row: "LAYERS" label (monospace, slate-400) + chevron collapse button
  - Three sections when expanded:
    - **TERRAIN**: 3D Terrain row + Hillshade row
    - **ELEVATION**: Contour Lines row
    - **VEGETATION**: Land Cover row
  - Each row: coloured dot indicator + label + checkbox
  - Section headings: `text-[10px] text-slate-500 tracking-widest font-mono uppercase`
- [ ] Create unit tests in `src/test/components/LayerPanel.test.tsx`:
  - Renders all four toggle rows
  - Calls `onToggle` with correct key on checkbox click
  - Collapse/expand chevron toggles section visibility
  - Checked state matches `visibility` prop
- [ ] Run `next lint --fix`
- [ ] Run `tsc --noEmit` and fix any errors
- [ ] Run `npm test` — must be green
- [ ] Run `prettier --write .`
- [ ] Re-read this file and update if needed
- [ ] Update Journal with findings
- [ ] Present `git diff` and commit message for approval — wait for approval before committing

---

## Phase 3: MapView Terrain Layers

Extend `MapView.tsx` with the new Mapbox terrain sources, layers, and visibility sync effect.

- [ ] Add `layerVisibility: LayerVisibility` prop to `MapViewProps` (with sensible default using `DEFAULT_LAYER_VISIBILITY`)
- [ ] Inside `style.load` handler, after existing config, add:
  - Military basemap config hardening:
    ```ts
    map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
    map.setConfigProperty('basemap', 'showTransitLabels', false);
    map.setConfigProperty('basemap', 'show3dObjects', false);
    map.setConfigProperty('basemap', 'colorWater', '#0d2137');
    ```
  - Add `mapbox-dem` raster-dem source (`mapbox://mapbox.mapbox-terrain-dem-v1`, tileSize 512, maxzoom 14)
  - Add `terrain-v2` vector source (`mapbox://mapbox.mapbox-terrain-v2`)
  - Add layers in slot order (using initial visibility from prop):
    1. `hillshading` — hillshade, slot `bottom`
    2. `landcover-military` — fill, terrain-v2 landcover source-layer, slot `bottom`
    3. `contours-minor` — line, terrain-v2 contour source-layer, slot `bottom`
    4. `contours-major` — line, terrain-v2 contour source-layer, slot `bottom`
    5. `contours-labels` — symbol, terrain-v2 contour source-layer, slot `middle`
  - If `layerVisibility.terrain3d` is true at init: call `map.setTerrain(...)`
- [ ] Add a ref (`layerVisibilityRef`) to hold current layerVisibility so the sync effect can access it without re-running init
- [ ] Add `useEffect([layerVisibility], ...)` to sync visibility changes to live map:
  - For each key in `LAYER_GROUPS`, call `map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')` for each layer ID
  - For `terrain3d`: call `map.setTerrain(...)` or `map.setTerrain(null)`
  - Guard: only run if map is initialised and style is loaded
- [ ] Track style-loaded state with a ref (`styleLoadedRef`) to guard the sync effect
- [ ] Update MapView tests in `src/test/components/MapView.test.tsx`:
  - Test that hillshading, landcover-military, contours layers are added on style.load
  - Test that layerVisibility prop change triggers setLayoutProperty calls
  - Test that terrain3d toggle calls setTerrain / setTerrain(null)
  - Test military config hardening calls (showPointOfInterestLabels: false, etc.)
- [ ] After completing tasks, if any TODOs were added to code, add new tasks here to address them
- [ ] Run `next lint --fix`
- [ ] Run `tsc --noEmit` and fix any errors
- [ ] Run `npm test` — must be green
- [ ] Run `prettier --write .`
- [ ] Re-read this file and update if needed
- [ ] Update Journal with findings
- [ ] Present `git diff` and commit message for approval — wait for approval before committing
- [ ] After committing, verify the map shows terrain layers in the browser

---

## Phase 4: Wire Up MapWithNav

Connect `LayerPanel` and the new `MapView` prop in `MapWithNav.tsx`.

- [ ] Import `LayerVisibility`, `DEFAULT_LAYER_VISIBILITY`, `LayerKey` from `@/lib/layers`
- [ ] Import `LayerPanel` from `@/components/LayerPanel`
- [ ] Add `layerVisibility` state: `useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY)`
- [ ] Add `handleToggle` callback: `(key: LayerKey) => setLayerVisibility(prev => ({ ...prev, [key]: !prev[key] }))`
- [ ] Pass `layerVisibility` to `MapView`
- [ ] Render `LayerPanel` inside the map container div (sibling to `MapView`), passing `visibility` and `onToggle`
- [ ] Update `MapWithNav` tests in `src/test/components/MapWithNav.test.tsx`:
  - Test that `LayerPanel` is rendered
  - Test that toggling a layer key calls `MapView` with updated `layerVisibility`
- [ ] After completing tasks, if any TODOs were added to code, add new tasks here to address them
- [ ] Run `next lint --fix`
- [ ] Run `tsc --noEmit` and fix any errors
- [ ] Run `npm test` — must be green
- [ ] Run `prettier --write .`
- [ ] Re-read this file and update if needed
- [ ] Update Journal with findings
- [ ] Present `git diff` and commit message for approval — wait for approval before committing
- [ ] After committing, verify the layer panel appears and toggles work correctly in the browser

---

## Phase 5: Wrap-Up

- [ ] Run `npm run test:coverage` and record the full coverage summary in the Journal below
- [ ] Update `README.md` if relevant (layer panel feature, new terrain capabilities)
- [ ] Update `CLAUDE.md` to reflect:
  - New `src/lib/layers.ts` file and its exports
  - New `LayerPanel.tsx` component
  - New Mapbox sources and layers in `MapView.tsx`
  - Updated `MapWithNav.tsx` state
  - Updated file structure table
- [ ] Ask the user to inspect the running app and confirm they are satisfied

---

## Journal

### Phase 0
_(to be filled in)_

### Phase 1
_(to be filled in)_

### Phase 2
_(to be filled in)_

### Phase 3
_(to be filled in)_

### Phase 4
_(to be filled in)_

### Phase 5 — Coverage Summary
_(to be filled in)_
