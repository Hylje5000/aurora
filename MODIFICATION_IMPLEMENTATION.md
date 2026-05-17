# Implementation Plan: Fix Map Overlay Color Rendering in Night Mode

## Overview

Add `*-emissive-strength: 1` paint properties to all custom overlay layers in `src/components/MapView.tsx` so they render in their true colours when the Standard style's `lightPreset: "night"` is active.

Only `src/components/MapView.tsx` changes. No API routes, no other components, no test fixtures.

---

## Phase 1: Pre-flight checks

- [ ] Run all tests to ensure the project is in a good state before starting.
  ```
  npm test
  ```

---

## Phase 2: Add emissive-strength to all affected layers

Apply `*-emissive-strength: 1` to every affected `addLayer` call in `MapView.tsx`.

### Groups of changes

**AOI layers** (fill + 3 lines, no slot)
- `aoi-fill` → `fill-emissive-strength: 1`
- `aoi-outline-glow` → `line-emissive-strength: 1`
- `aoi-outline` → `line-emissive-strength: 1`
- `aoi-outline-outer` → `line-emissive-strength: 1`

**Municipality layers** (fill + line, no slot)
- `municipalities-fill` → `fill-emissive-strength: 1`
- `municipalities-outline` → `line-emissive-strength: 1`

**Municipality highlight layers** (already slot:"top", add emissive-strength for robustness)
- `municipality-highlight-fill` → `fill-emissive-strength: 1`
- `municipality-highlight-line` → `line-emissive-strength: 1`

**Terrain overlays** (slot:"bottom"/"middle")
- `landcover-military` → `fill-emissive-strength: 1`
- `contours-minor` → `line-emissive-strength: 1`
- `contours-major` → `line-emissive-strength: 1`
- `contours-labels` → `text-emissive-strength: 1`

**Infrastructure layers** (no slot)
- `roads-line-casing` → `line-emissive-strength: 1`
- `roads-line` → `line-emissive-strength: 1`
- `bridges-symbol` → `icon-emissive-strength: 1`
- `railways-line` → `line-emissive-strength: 1`

**Route planning layers** (no slot)
- `route-line-outline` → `line-emissive-strength: 1`
- `route-line` → `line-emissive-strength: 1`

**Route hazard layers** (no slot)
- `route-hazards-info` → `circle-emissive-strength: 1`
- `route-hazards-warning` → `circle-emissive-strength: 1`
- `route-hazards-critical` → `circle-emissive-strength: 1`

**Coverage gap + circle layers**
- `route-coverage-gaps-line` → `line-emissive-strength: 1`
- `coverage-circles-fill` → `fill-emissive-strength: 1`
- `coverage-circles-line` → `line-emissive-strength: 1`

**Measurement overlay** (no slot)
- `measure-fill` → `fill-emissive-strength: 1`
- `measure-line` → `line-emissive-strength: 1`
- `measure-vertices` → `circle-emissive-strength: 1`

**Custom drawing layers** (in `addCustomLayerSourcesToMap` function, no slot)
- `custom-layer-{id}-fill` → `fill-emissive-strength: 1`
- `custom-layer-{id}-line` → `line-emissive-strength: 1`
- `custom-layer-{id}-circle` → `circle-emissive-strength: 1`
- `custom-layer-{id}-symbol` → `icon-emissive-strength: 1`

**Intentionally excluded:**
- `hillshading` — hillshade layer; lighting effect is desired for terrain visualization.
- `cell-towers-*` — already working correctly (icons embed colour in image data).

### Post-phase checklist

- [ ] Run `next lint --fix` to auto-fix lint issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript type errors.
- [ ] Run `npm test` — all tests must pass (non-zero exit is a hard blocker).
- [ ] Run `prettier --write .` to fix formatting.
- [ ] Re-read MODIFICATION_IMPLEMENTATION.md for any changes.
- [ ] Update MODIFICATION_IMPLEMENTATION.md Journal section.
- [ ] Run `git diff` to verify changes and draft a commit message for user approval.
- [ ] Wait for approval before committing.
- [ ] After committing, verify changes look correct in the browser (satellite off → true colours; satellite on → still correct).

---

## Phase 3: Final checks & wrap-up

- [ ] Run `npm run test:coverage` and record coverage summary in Journal.
- [ ] Update CLAUDE.md if any implementation details changed (likely none — this is a paint-property-only fix with no architectural change).
- [ ] Ask the user to inspect the running app and confirm they are satisfied.

---

## Journal

_Populated after each phase._

### Phase 1

### Phase 2

### Phase 3
