# Design: Aurora IPB Recent Modifications

## 1. ConfidentialMind AI Backend Integration

### Overview
Add a server-side AI layer to the Aurora IPB application. A new Next.js API route (`POST /api/ai`) exposes an OpenAI-compatible chat completions interface backed by ConfidentialMind's hosted Gemma-4 model. No frontend changes in this phase — only the wiring (client lib + route + tests).

### Detailed Analysis
ConfidentialMind exposes an **OpenAI-compatible** REST API. The OpenAI Node.js SDK accepts a custom `baseURL` and `apiKey`, making it a drop-in client for any OpenAI-compatible endpoint.

Environment variables (already in `.env.local`, prefixed `CM_`):
- `CM_BASE_URL`: Project endpoint (path to the workspace)
- `CM_API_KEY`: JWT bearer token
- `CM_MODEL_NAME`: Model ID (`google/gemma-4-31B-it`)

---

## 2. Elevation Click Feature

### Overview
Add on-demand terrain elevation lookup to the Aurora IPB map. A user clicks anywhere on the map and sees the NLS Finland DEM elevation for that point in the InfoPanel on the right side. A temporary amber marker pin at the click location provides spatial context. The InfoPanel is dismissed via its existing × button.

### Detailed Analysis
- **API Route**: `GET /api/elevation?lng=&lat=` performs a PostGIS KNN query on the `height_data` table.
- **Frontend Integration**: `MapView` adds a click listener that fetches the elevation and updates the `InfoPanel` via the `onInfoPanel` callback.
- **Marker Lifecycle**: An amber `mapboxgl.Marker` is placed at the click point and removed when the panel closes or a new click occurs.

---

## Alternatives Considered

| Alternative | Decision |
|---|---|
| A. Raw `fetch` for AI | Rejected — SDK handles retries and types better. |
| B. Vercel AI SDK | Rejected — overkill for this phase. |
| Inspect tool mode for Elevation | Rejected — adds complexity; any click should inspect. |
| Popups for Elevation | Rejected — InfoPanel is the established pattern for context. |

---

## Detailed Design: AI Integration

### 1. `openai` npm package
Version pinned in `package.json`.

### 2. `src/lib/ai.ts` — client factory
A factory function (not a singleton) constructs and returns an `OpenAI` instance with the correct `baseURL` and `apiKey`.

### 3. `POST /api/ai` route
- Proxies requests to ConfidentialMind.
- Returns `content`, `model`, and `usage`.
- Handles 400 (bad input), 503 (missing config), 502 (upstream error), 500 (unexpected).

---

## Detailed Design: Elevation Feature

### 1. API Route: `GET /api/elevation`
Uses the `<->` operator on the GiST-indexed `geom` column for efficient KNN lookup.

### 2. MapView Click Handler
Registers a one-shot click handler that clears the old marker, fetches data, and sets the new marker and InfoPanel data.
