# AURORA IPB

> **Automated Intelligence Preparation of the Battlespace**  
> Open-source situational awareness for military operational planning.

Built for the **Junction Defence Hackathon — Challenge by 61N**.  
Aurora aggregates open-source geospatial, demographic, electoral, communications, and weather data into a single live tactical map — so analysts can focus on decisions, not data wrangling.

---

## Features

### Map & Terrain
- **3D Terrain** — Mapbox DEM with 1.5× exaggeration, toggleable at runtime
- **Hillshading & Contours** — Topographic detail in Standard night mode
- **Military Landcover** — GO / SLOW-GO / NO-GO colour scheme over vegetation data
- **Satellite Basemap** — Toggle between night vector and satellite imagery

### Intelligence Overlays
- **Cell Tower Network** — Live viewport-scoped fetch of GSM/UMTS/LTE/CDMA towers with NATO APP-6 milsymbol icons, clustering, and per-tower signal/range popups
- **Municipality Layer** — All 308 Finnish municipalities with click-to-inspect InfoPanel showing:
  - Demographics (population, age structure, male/female split — Statistics Finland 2025)
  - 2023 Parliamentary election results as an inline SVG pie chart with Finnish party colours
- **Weather Widget** — Historical climatology per AOI and date (FMI station data 2016–2026): avg temp ± spread, max/min, rain probability

### Collaborative Drawing
- **Named Layers** — Create/toggle/delete custom drawing layers, persisted in PostGIS
- **Drawing Tools** — Point, Line, Polygon, Rectangle (via `@mapbox/mapbox-gl-draw`)
- **Per-feature Colours** — 8-colour military palette, stored per feature
- **Shared State** — All users see the same layers via the PostGIS backend

### AI Analysis *(backend ready)*
- **`POST /api/ai`** — OpenAI-compatible chat completions proxy to **ConfidentialMind / Gemma-4**
- Accepts `messages`, `maxTokens`, `temperature`; returns `content`, `model`, `usage`
- Designed to receive viewport context (towers, weather, demographics) for AI-assisted IPB

---

## Areas of Interest

Three pre-defined operational areas, selectable from the top navigation strip:

| Area | Focus |
|------|-------|
| **Lappi** | Northern Lapland — E8/E75 corridors, Saariselkä highlands, Inari lake system |
| **Karjala** | North Karelia — Finnish-Russian border zone, Joensuu hub, Niirala crossing |
| **Turku** | Archipelago Sea — maritime chokepoints, Turku port, Stockholm/Tallinn ferry links |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Turbopack |
| Map | Mapbox GL JS, milsymbol (NATO APP-6), `@mapbox/mapbox-gl-draw` |
| Backend | Next.js API Routes, OpenAI SDK (custom baseURL) |
| Database | PostgreSQL 14+ with PostGIS extension |
| AI | ConfidentialMind — Gemma 4 (OpenAI-compatible endpoint) |
| Testing | Vitest 3, React Testing Library, jsdom, v8 coverage |

---

## Prerequisites

- Node.js ≥ 20.9
- PostgreSQL ≥ 14 with the PostGIS extension
- A [Mapbox access token](https://account.mapbox.com/)
- ConfidentialMind API credentials (for AI features)

---

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

Create `.env.local` in the project root:

```env
# Map
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aurora

# AI (ConfidentialMind)
CM_BASE_URL=https://api.poc.confmind-dev.com/v1/api/<workspace>
CM_API_KEY=<jwt_token>
CM_MODEL_NAME=Gemma 4-fovcnlriirydcgilvaix
```

**3. Set up the database**

```bash
# Custom drawing layers schema
psql $DATABASE_URL -f .local/setup_custom_layers.sql

# Ingest open-source data
pip install -r scripts/requirements.txt

python scripts/ingest_demographics.py   # Statistics Finland — 308 municipalities
python scripts/ingest_elections.py      # 2023 parliamentary election — 22 parties
python scripts/ingest_weather.py        # FMI station data 2016–2026
```

**4. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — full-screen tactical map, centred on the Archipelago Sea.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/features?bbox=...` | GeoJSON FeatureCollection from PostGIS |
| `GET` | `/api/cell-towers?bbox=...` | Cell tower overlay (up to 2 000 features) |
| `GET` | `/api/municipalities` | All municipalities with demographics + election data |
| `GET` | `/api/weather?region&month&day` | Historical climatology aggregate |
| `POST` | `/api/ai` | AI chat completions via ConfidentialMind |
| `GET/POST` | `/api/custom-layers` | List / create drawing layers |
| `DELETE` | `/api/custom-layers/[id]` | Delete layer (cascades features) |
| `GET/POST` | `/api/custom-layers/[id]/features` | Fetch / create features |
| `PUT/DELETE` | `/api/custom-layers/[id]/features/[fid]` | Update / delete a single feature |

All routes degrade gracefully — returning empty collections or 503 — when `DATABASE_URL` or AI credentials are absent.

---

## Data Sources

| Dataset | Source | Coverage |
|---------|--------|----------|
| Cell towers | OpenCelliD / CellMapper | Finland |
| Municipality boundaries | National Land Survey of Finland | 308 municipalities |
| Demographics | Statistics Finland (Tilastokeskus) | 2025, all municipalities |
| Election results | Statistics Finland | 2023 parliamentary, 22 parties |
| Weather observations | Finnish Meteorological Institute (FMI) | 2016–2026, 3 regions |
| Terrain / roads | Mapbox Standard vector tiles | Global |

---

## Testing

```bash
npm test                  # run all tests once (314 tests)
npm run test:watch        # watch mode
npm run test:coverage     # v8 coverage report
```

Tests live under `src/test/`, mirroring `src/`. All API routes ≥ 96% coverage, all lib modules 100%.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest test suite |
| `npm run test:coverage` | Tests + v8 coverage |
| `python scripts/ingest_demographics.py` | Load municipality demographics |
| `python scripts/ingest_elections.py` | Load 2023 election results |
| `python scripts/ingest_weather.py` | Load FMI weather observations |
