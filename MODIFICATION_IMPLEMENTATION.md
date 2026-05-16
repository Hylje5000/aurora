# Implementation Plan: Fix Cell-Tower Cluster Visibility Sync

## Journal

_(Updated after each phase)_

---

## Phase 0 — Baseline check

- [ ] Run `npm test` to confirm the suite is green before any changes.

---

## Phase 1 — Fix `MapView.tsx`

Two targeted edits to `src/components/MapView.tsx`:

### 1a. `style.load` — set initial cluster layer visibility

In the `style.load` handler, immediately after the `const vis = layerVisibility;` line,
compute `clustersVisible` and pass it to both cluster `addLayer` calls as `layout.visibility`.

```ts
const clustersVisible =
  vis.cellGSM || vis.cellUMTS || vis.cellLTE || vis.cellCDMA;
```

- `cell-towers-clusters` → add `layout: { visibility: clustersVisible ? "visible" : "none" }`
- `cell-towers-cluster-count` → add `layout: { visibility: clustersVisible ? "visible" : "none" }`

### 1b. `layerVisibility` `useEffect` — live sync

After the existing `LAYER_GROUPS` loop, append:

```ts
const clustersVisible =
  layerVisibility.cellGSM ||
  layerVisibility.cellUMTS ||
  layerVisibility.cellLTE ||
  layerVisibility.cellCDMA;
for (const id of ["cell-towers-clusters", "cell-towers-cluster-count"]) {
  map.setLayoutProperty(id, "visibility", clustersVisible ? "visible" : "none");
}
```

After completing Phase 1:

- [ ] After completing tasks, if you added any TODOs or left anything unfinished, add new tasks.
- [ ] Update `src/test/components/MapView.test.tsx` to assert that both cluster layers are hidden when all cell types are off, and visible when at least one is on.
- [ ] Run `next lint --fix` and fix any remaining lint issues.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — all tests must pass (hard blocker).
- [ ] Run `prettier --write .` for consistent formatting.
- [ ] Re-read this file and handle any changes.
- [ ] Update this file with learnings, surprises, or deviations; check off completed items.
- [ ] Run `git diff` and draft a commit message; present it to the user for approval.
- [ ] Wait for user approval before committing or moving on.
- [ ] After committing, verify the fix looks correct in the running dev server.

---

## Phase 2 — Final verification & docs

- [ ] Run `npm run test:coverage` and record the summary in the Journal.
- [ ] Update `CLAUDE.md` so the **Layer toggle system** and **Cell tower overlay** sections accurately describe cluster visibility behaviour.
- [ ] Ask the user to inspect the running app and confirm they are satisfied.
