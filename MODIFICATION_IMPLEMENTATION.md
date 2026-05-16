# Implementation Plan: NATO Milsymbol Cell Tower Markers

## Journal

_Updated after each phase._

---

## Phase 0 — Baseline health check

- [x] Run `npm test` and confirm all tests pass before starting.

---

## Phase 1 — Install milsymbol

- [x] Run `npm install milsymbol` to add the package.
- [x] Verify `milsymbol` appears in `package.json` dependencies and that TypeScript types are included (milsymbol ships its own `.d.ts`).
- [x] Run `tsc --noEmit` to confirm no type errors introduced by the new package.
- [x] Run `npm test` — all tests must still pass (no code changed yet).
- [x] Run `next lint --fix`.
- [x] Run `prettier --write .`.
- [x] Update MODIFICATION_IMPLEMENTATION.md Journal with findings.
- [ ] Present the following commit for user approval:
  ```
  chore(deps): add milsymbol for NATO military symbology rendering
  ```
- [ ] Wait for approval, then commit.

---

## Phase 2 — Add `src/lib/milsymbol.ts` utility

- [x] Create `src/lib/milsymbol.ts` with `createMilsymbolImage(opts)` as designed:
  - Accepts `{ sidc, size?, fillColor?, uniqueDesignation? }`
  - Instantiates `new ms.Symbol(sidc, options)`
  - Calls `.asSVG()` to get the SVG string
  - Returns a `Promise<HTMLImageElement>` via data URL → `<img onload>`
- [x] Create `src/test/lib/milsymbol.test.ts`:
  - `vi.mock("milsymbol")` — mock `Symbol` class with `.asSVG()` returning a minimal SVG string
  - Mock the global `Image` class so `onload` fires synchronously
  - Assert `img.src` contains `data:image/svg+xml`
  - Assert the returned value is the `HTMLImageElement`
  - Assert that error path (`onerror`) rejects the promise
- [x] Run `tsc --noEmit` — fix any type errors.
- [x] Run `npm test` — all tests must pass (including the new milsymbol tests).
- [x] Run `next lint --fix`.
- [x] Run `prettier --write .`.
- [x] Update MODIFICATION_IMPLEMENTATION.md Journal.
- [x] Present commit for user approval:
  ```
  feat(lib): add createMilsymbolImage utility for NATO symbol generation
  ```
- [ ] Wait for approval, then commit.

---

## Phase 3 — Replace circle layers with symbol layers in `MapView.tsx`

- [x] Import `createMilsymbolImage` from `@/lib/milsymbol` in `MapView.tsx`.
- [x] Define `TOWER_CONFIGS` array (id, radio, color, visible) — replaces the existing inline `towerLayers` array.
- [x] Define `SIDC = "SFGPUUSR-------"`.
- [x] Wrap the `style.load` callback as `async`.
- [x] Inside `style.load`, after adding cluster layers:
  - `await Promise.all(TOWER_CONFIGS.map(...))` — generate and register one milsymbol image per radio type via `map.addImage()`.
- [x] Replace the existing `circle`-type `addLayer` calls with `symbol`-type layers:
  - `type: "symbol"`
  - `layout`: `"icon-image": "${id}-icon"`, `"icon-size": 0.6`, `"icon-allow-overlap": true`, `"visibility": ...`
  - Remove all `paint` properties (no `circle-radius`, `circle-color`, etc.)
- [x] Verify the popup and hover handlers reference the same layer IDs — no changes needed there.
- [x] Verify `LAYER_GROUPS` in `src/lib/layers.ts` — layer IDs are unchanged, so no edits required.
- [x] After completing tasks above, add any TODOs as new tasks if anything was skipped or left incomplete.
- [x] Update `src/test/components/MapView.test.tsx`:
  - Mock `createMilsymbolImage` from `@/lib/milsymbol` using `vi.mock` — return a resolved promise with a stub `HTMLImageElement`.
  - Assert `map.addImage` is called 4 times (once per radio type icon).
  - Update layer assertions from `type: "circle"` to `type: "symbol"` for the four per-radio layers.
  - Assert `icon-image` is set in the layout (not `circle-radius` in paint).
- [x] Run `tsc --noEmit` — fix any type errors.
- [x] Run `npm test` — all tests must pass (hard blocker if not).
- [x] Run `next lint --fix`.
- [x] Run `prettier --write .`.
- [x] Re-read MODIFICATION_IMPLEMENTATION.md to check for any missed tasks.
- [x] Update MODIFICATION_IMPLEMENTATION.md Journal.
- [ ] `git diff` — review changes, draft commit message, present to user:
  ```
  feat(map): replace circle cell-tower markers with NATO milsymbol icons
  ```
- [ ] Wait for approval, then commit.
- [ ] Verify hot-reload in browser — NATO symbols should appear on the map in place of the dots.

---

## Phase 4 — Final checks, docs, coverage

- [ ] Run `npm run test:coverage` and record the coverage summary in the Journal below.
- [ ] Update `CLAUDE.md` to reflect:
  - `milsymbol` is now a dependency
  - `src/lib/milsymbol.ts` exists and what it does
  - Cell tower individual markers are now `symbol` layers using NATO APP-6 icons (SIDC `SFGPUUSR-------`)
- [ ] Check if `README.md` exists and needs updating (unlikely; update only if relevant).
- [ ] Ask the user to inspect the running app and confirm they are satisfied, or note any modifications needed.

---

## Journal

### Phase 0

114 tests pass. Baseline green.

### Phase 1

`milsymbol@3.0.4` installed. Types ship with the package at `node_modules/milsymbol/index.d.ts` — no separate `@types/milsymbol` needed. `tsc --noEmit` clean. All 114 tests still pass. Note: `next lint --fix` does not accept `--fix`; use `npm run lint` (calls `eslint` directly) instead in future phases.

### Phase 2

`src/lib/milsymbol.ts` created — thin wrapper: `ms.Symbol(sidc, opts).asSVG()` → data URL → `HTMLImageElement` promise. 4 unit tests added covering: data URL format, option passthrough, default size, and `onerror` rejection path. 118 tests pass. `tsc` clean. Lint clean.

### Phase 3

`MapView.tsx`: imported `createMilsymbolImage`, made `style.load` callback async, replaced the `circle`-type tower layers with `symbol`-type layers using `map.addImage()` + `icon-image`. SIDC `SFGPUUSR-------` (Friendly, Ground, Signal — Radio Unit). `LAYER_GROUPS`, popup, hover, and visibility sync `useEffect` untouched — layer IDs unchanged. Tests: added `mockAddImage` to the Map mock, mocked `@/lib/milsymbol`, made `fireStyleLoad` properly async, replaced the old circle-layer test with two new tests (addImage × 4, symbol layers with icon-image). 119 tests pass. `tsc` and lint clean.

### Phase 4 — Coverage summary

_To be filled in._
