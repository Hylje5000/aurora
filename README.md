![Aurora Header Image](img/header.png)

> Aurora takes military operations from planning to execution faster and more efficiently than ever.

Aurora makes military operational planning faster and easier, so that you can make the right decisions before your enemy does.

A modern, easy-to-use UI with all the data you need to make decisions right there with you, supported by our operational data model (ODM), offering responsive data retrieval without compromising on security.

Built for the **Aalto Defence Hackathon 2026**, challenge by 61N.

---

## Architecture

![Aurora Architecture diagram](img/architecture.png)

> Aurora is designed to run in a TL II / NATO SECRET -environment, with a dedicated Data Lakehouse for ingesting data from public data sources.

## Tech Stack

| Layer    | Technology                              |
| -------- | --------------------------------------- |
| Frontend | Next.js 16                              |
| Map      | Mapbox, NATO APP-6 icons from milsymbol |
| Backend  | Next.js API Routes                      |
| Database | PostgreSQL 14+                          |
| AI       | Gemma 4 from ConfidentialMind           |

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

---

## API Reference

| Method       | Endpoint                                 | Description                                          |
| ------------ | ---------------------------------------- | ---------------------------------------------------- |
| `GET`        | `/api/features?bbox=...`                 | GeoJSON FeatureCollection from PostGIS               |
| `GET`        | `/api/cell-towers?bbox=...`              | Cell tower overlay (up to 2 000 features)            |
| `GET`        | `/api/municipalities`                    | All municipalities with demographics + election data |
| `GET`        | `/api/weather?region&month&day`          | Historical climatology aggregate                     |
| `POST`       | `/api/ai`                                | AI chat completions via ConfidentialMind             |
| `GET/POST`   | `/api/custom-layers`                     | List / create drawing layers                         |
| `DELETE`     | `/api/custom-layers/[id]`                | Delete layer (cascades features)                     |
| `GET/POST`   | `/api/custom-layers/[id]/features`       | Fetch / create features                              |
| `PUT/DELETE` | `/api/custom-layers/[id]/features/[fid]` | Update / delete a single feature                     |

All routes degrade gracefully — returning empty collections or 503 — when `DATABASE_URL` or AI credentials are absent.

---

## Data Sources

| Dataset                 | Source                                                 | Coverage                                  |
| ----------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Cell towers             | OpenCelliD / CellMapper                                | Finland                                   |
| Municipality boundaries | National Land Survey of Finland                        | 308 municipalities                        |
| Demographics            | Statistics Finland (Tilastokeskus)                     | 2025, all municipalities                  |
| Election results        | Statistics Finland                                     | 2023 parliamentary, 22 parties            |
| Weather observations    | Finnish Meteorological Institute (FMI)                 | 2016–2026, 3 regions                      |
| Roads & railways        | Finnish Transport Infrastructure Agency (Väylävirasto) | All infrastructure on the 3 focus regions |
| Topographic data        | National Land Survey of Finland (Maanmittauslaitos)    | 10m x 10m dataset on the 3 focus regions  |

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

| Command                                 | Description                    |
| --------------------------------------- | ------------------------------ |
| `npm run dev`                           | Dev server with Turbopack      |
| `npm run build`                         | Production build               |
| `npm run lint`                          | ESLint                         |
| `npm test`                              | Vitest test suite              |
| `npm run test:coverage`                 | Tests + v8 coverage            |
| `python scripts/ingest_demographics.py` | Load municipality demographics |
| `python scripts/ingest_elections.py`    | Load 2023 election results     |
| `python scripts/ingest_weather.py`      | Load FMI weather observations  |
