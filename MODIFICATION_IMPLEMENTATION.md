# Implementation Plan: Next.js Project Initialization (IPB Aurora)

## Journal

_Updated after each phase._

---

## Phase 0 — Pre-flight Checks

- [x] Verify Node.js version meets the ≥20.9 requirement (`node --version`).
- [x] Verify `npm` is available.
- [x] Confirm no conflicting files exist in the working directory that `create-next-app` would overwrite.
- [x] Note: There are no existing tests to run (empty repo), so skip the "run tests" step this phase.
- [x] Update journal.

---

## Phase 1 — Bootstrap with create-next-app

- [x] Run `create-next-app@latest` in the current directory (`.`) with the recommended defaults:
  - TypeScript
  - Tailwind CSS
  - ESLint
  - App Router
  - `src/` directory
  - Import alias `@/*`
  - AGENTS.md / CLAUDE.md guidance file
  - **No** React Compiler (keep it simple for hackathon speed)
- [x] Verify the generated directory structure matches the design doc.
- [x] Run `npm run dev` briefly to confirm the default app starts without errors, then stop it.
- [x] Run `npm run lint` to confirm baseline linting passes.
- [x] Run `tsc --noEmit` to confirm baseline TypeScript passes.
- [x] Update journal.
- [ ] Present commit diff to user and wait for approval before committing.

---

## Phase 2 — Install Dependencies

- [x] Install Mapbox GL JS: `npm install mapbox-gl`
- [x] Install Mapbox GL JS types: `npm install --save-dev @types/mapbox-gl`
- [x] Install PostgreSQL client: `npm install pg`
- [x] Install pg types: `npm install --save-dev @types/pg`
- [x] Run `tsc --noEmit` — fix any type errors introduced by new packages.
- [x] Run `npm run lint --fix` — fix any lint issues.
- [x] Update journal.
- [ ] Present commit diff to user and wait for approval before committing.

---

## Phase 3 — Environment & Config

- [x] Create `.env.local` with placeholder values:
  ```
  NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_TOKEN_HERE
  DATABASE_URL=postgresql://user:password@localhost:5432/aurora
  ```
- [x] Confirm `.env.local` is git-ignored (should already be in default `.gitignore`).
- [x] Add a `next.config.ts` note if any Webpack/Turbopack config is needed for mapbox-gl (check if `mapbox-gl` requires any special handling in Next.js 15).
- [x] Run `tsc --noEmit` — no errors expected.
- [x] Run `npm run lint` — no errors expected.
- [x] Update journal.
- [ ] Present commit diff to user and wait for approval before committing.

---

## Phase 4 — Database Client

- [x] Create `src/lib/db.ts` — singleton `pg.Pool` using `DATABASE_URL`, with the global dev-reload guard.
- [x] Export a typed `query` helper for convenience.
- [x] Run `tsc --noEmit` — fix any type errors.
- [x] Run `npm run lint` — fix any lint issues.
- [x] Run `prettier --write .` — fix formatting.
- [x] Update journal.
- [ ] Present commit diff to user and wait for approval before committing.

---

## Phase 5 — MapView & MapLoader Components

- [x] Create `src/components/MapView.tsx`:
  - `'use client'` directive.
  - Imports `mapboxgl` and `mapbox-gl/dist/mapbox-gl.css`.
  - Sets `mapboxgl.accessToken` from `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`.
  - Uses `useRef` for the container DOM node and the `Map` instance.
  - Initializes map in `useEffect` (empty deps), cleans up with `map.remove()`.
  - Default center: `[21.5, 60.2]` (Archipelago Sea, Finland), zoom 7.
  - Container div is `w-full h-full`.
- [x] Create `src/components/MapLoader.tsx`:
  - Uses `next/dynamic` with `ssr: false` to wrap `MapView`.
  - Provides a loading fallback (`<div className="w-full h-full bg-gray-900" />`).
- [x] Run `tsc --noEmit` — fix any type errors.
- [x] Run `npm run lint` — fix any lint issues.
- [x] Run `prettier --write .`
- [x] Update journal.
- [ ] Present commit diff to user and wait for approval before committing.

---

## Phase 6 — Home Page & Root Layout

- [ ] Update `src/app/globals.css`:
  - Keep Tailwind directives.
  - Ensure `html, body, #__next` are set to `height: 100%` so the full-screen map works.
- [ ] Update `src/app/layout.tsx`:
  - Set `<html>` and `<body>` to `h-full` (Tailwind).
  - Include a minimal dark theme appropriate for a military ops tool.
- [ ] Update `src/app/page.tsx`:
  - Import `MapLoader` from `@/components/MapLoader`.
  - Render a full-screen container (`w-full h-screen`) with `MapLoader` inside.
  - Remove the default Next.js boilerplate content.
- [ ] Start dev server, visually verify map renders over Finland, stop server.
- [ ] Run `tsc --noEmit` — fix any type errors.
- [ ] Run `npm run lint` — fix any lint issues.
- [ ] Run `prettier --write .`
- [ ] Update journal.
- [ ] Present commit diff to user and wait for approval before committing.

---

## Phase 7 — GeoJSON API Route Stub

- [ ] Create `src/app/api/features/route.ts`:
  - `GET` handler accepts `bbox` query param (`minLng,minLat,maxLng,maxLat`).
  - Validates the param; returns 400 if missing or malformed.
  - Queries PostGIS with `ST_MakeEnvelope` / `ST_Intersects` / `ST_AsGeoJSON`.
  - Returns a `FeatureCollection` JSON response.
  - If `DATABASE_URL` is not set, returns an empty `FeatureCollection` with a warning (graceful degradation for demo without DB).
- [ ] Run `tsc --noEmit` — fix any type errors.
- [ ] Run `npm run lint` — fix any lint issues.
- [ ] Run `prettier --write .`
- [ ] Update journal.
- [ ] Present commit diff to user and wait for approval before committing.

---

## Phase 8 — Final Cleanup & Documentation

- [ ] Update `README.md` with:
  - Project name and description (IPB Aurora).
  - Prerequisites (Node 20+, Mapbox token, PostgreSQL + PostGIS).
  - Setup instructions (`npm install`, `.env.local` configuration, `npm run dev`).
  - Overview of key files/directories.
- [ ] Update `CLAUDE.md` (project's `claude.md`) to reflect the current file structure, tech decisions, and any implementation notes.
- [ ] Run full lint + type-check + prettier one final time.
- [ ] Ask the user to inspect the running app and confirm satisfaction.
- [ ] After completing a task, if any TODOs remain in the code or anything was not fully implemented, add new tasks here to track them.
- [ ] Update journal with final notes.
- [ ] Present commit diff to user and wait for approval before committing.

---

## Journal

### Phase 0
Node.js v23.11.0 (above 20.9 minimum), npm 10.9.2. No conflicting Next.js files in the repo.

### Phase 1
Ran `create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-react-compiler`. Had to temporarily move existing files (.local/, claude.md, MODIFICATION_*.md) since create-next-app refuses to init in a non-empty directory. Restored them after. On macOS case-insensitive FS, our `claude.md` became `CLAUDE.md`; content is intact. Generated Next.js 16.2.6 with Turbopack. Dev server boots in 209ms. Lint and tsc clean.

### Phase 2
Installed `mapbox-gl` + `@types/mapbox-gl` and `pg` + `@types/pg`. The recurring `eslint-visitor-keys` engine warning (requires Node ^20.19 or ^22.13 or >=24, we have v23.11) is harmless — it's a transitive ESLint dep and does not affect functionality. tsc and lint both clean after install.

### Phase 3
Created `.env.local` with `NEXT_PUBLIC_MAPBOX_TOKEN` and `DATABASE_URL` placeholders. Confirmed git-ignored by `.env*` rule. No `next.config.ts` changes needed — Turbopack + `next/dynamic ssr:false` handles mapbox-gl without webpack overrides.

### Phase 4
Created `src/lib/db.ts` with a `pg.Pool` singleton guarded by `global._pgPool` to survive Next.js hot reloads in dev. Exports a generic `query<T>` helper. Removed an unnecessary `eslint-disable-next-line no-var` comment (ESLint config doesn't flag `var` in `declare global` blocks). tsc and lint clean.

### Phase 5
Created `MapView.tsx` (`'use client'`, mapboxgl init via useRef/useEffect, NavigationControl added, cleanup on unmount) and `MapLoader.tsx` (next/dynamic ssr:false wrapper with dark fallback). eslint-disable comment on the exhaustive-deps rule is justified — center/zoom are one-shot init props. tsc and lint clean.

### Phase 6
_Not yet started._

### Phase 7
_Not yet started._

### Phase 8
_Not yet started._
