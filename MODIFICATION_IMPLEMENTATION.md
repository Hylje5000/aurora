# Implementation Plan: Full Dark Theme Audit

## Journal

_(Updated after each phase)_

---

## Phase 0 — Baseline health check

- [ ] Run `npm test` and confirm all existing tests pass. Record count in journal.

---

## Phase 1 — Dark basemap, dark NavigationControl, AreaNav polish

### Tasks

- [ ] Modify `src/components/MapView.tsx`:
  - Add `map.setConfigProperty("basemap", "lightPreset", "night");` as the first line inside the existing `style.load` callback.
- [ ] Modify `src/app/globals.css`:
  - Add dark override block for `.mapboxgl-ctrl-group`, `.mapboxgl-ctrl-group button`, `.mapboxgl-ctrl-group button:last-child`, and `.mapboxgl-ctrl-group button .mapboxgl-ctrl-icon`.
- [ ] Modify `src/components/AreaNav.tsx`:
  - Change inactive button border class from `border-white/20` to `border-white/30`.
- [ ] Review `src/test/components/MapView.test.tsx` — check whether the existing mock covers `setConfigProperty` and update if needed.
- [ ] Run `next lint --fix` (or `npm run lint`).
- [ ] Run `tsc --noEmit` and fix any type errors.
- [ ] Run `npm test` — all tests must pass. Non-zero exit is a hard blocker.
- [ ] Run `prettier --write .`.
- [ ] Re-read this plan; update it if anything has changed.
- [ ] Update journal below with findings.
- [ ] Present `git diff` summary and commit message to the user for approval. Wait for approval before committing.
- [ ] After committing, verify hot-reload in the browser: map should render dark, NavigationControl should be dark, nav buttons should have a slightly more visible border.
- [ ] After completing any task, if you added any TODOs to the code or didn't fully implement anything, add new tasks here to track them.

---

## Phase 2 — Final polish & wrap-up

- [ ] Run `npm run test:coverage` and record the coverage summary in the journal.
- [ ] Update `CLAUDE.md` to reflect the dark theme changes:
  - `lightPreset: "night"` applied in `style.load`.
  - Dark NavigationControl CSS overrides in `globals.css`.
- [ ] Ask the user to inspect the running app and confirm they are satisfied, or if any modifications are needed.

---

## Journal

### Phase 0

_(to be filled in)_

### Phase 1

_(to be filled in)_

### Phase 2

_(to be filled in)_
