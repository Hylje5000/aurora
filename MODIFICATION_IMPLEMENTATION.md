# Implementation Plan: Recent Modifications

## 1. ConfidentialMind AI Backend Integration

### Phase 1 — Install dependency & AI client lib
- [x] Run `npm install openai` and confirm it appears in `package.json` dependencies.
- [x] Create `src/lib/ai.ts` with `createAIClient()` factory and `CM_MODEL` constant.
- [x] Create `src/test/lib/ai.test.ts` covering factory construction and fallback logic.

### Phase 2 — API Route
- [x] Create `src/app/api/ai/route.ts` with proxy logic and error handling.
- [x] Create `src/test/api/ai.test.ts` covering 503, 400, 200, 502, and 500 cases.

---

## 2. Elevation Click Feature

### Phase 1 — API Route (`src/app/api/elevation/route.ts`)
- [x] Create `src/app/api/elevation/route.ts` implementing `GET /api/elevation?lng=&lat=`.
- [x] Create `src/test/api/elevation.test.ts` for validation, KNN hits, and error cases.

### Phase 2 — MapView click handler + marker (`src/components/MapView.tsx`)
- [x] Add `elevationMarkerRef` and map click handler to `MapView`.
- [x] Implement marker cleanup in `infoPanelOpen` effect and map teardown.
- [x] Update `src/test/components/MapView.test.tsx` with elevation fetch mocks and click tests.

---

## Final Status
- All AI backend components implemented and tested.
- Elevation click feature fully integrated into MapView with persistent marker and InfoPanel updates.
- Combined test suite remains green (322 tests).
