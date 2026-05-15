# Project Context: Automated IPB (Intelligence Preparation of the Battlespace)

## Overview

We are building a web application for the Junction Defence Hackathon (Challenge by 61N). The tool automates the IPB process using open-source data to provide rapid, comprehensive environmental situational awareness for military operational planning. It visualizes geographic areas (e.g., Archipelago Sea, North Karelia, Lapland) and aggregates data dynamically based on the map viewport.

## Tech Stack

* **Frontend**: Next.js (React), Tailwind CSS, and Mapbox GL JS (or MapLibre GL JS).
* **Backend**: Next.js API Routes for lightweight queries, standard JSON API responses, and dashboard aggregations.
* **Map Layer**: Built-in Mapbox vector tiles for the heavy basemap layers (standard terrain, roads, and background context).
* **Database**: PostgreSQL with the PostGIS extension acting as our single source of truth for all custom spatial data and points of interest (POIs).
* **Data Ingestion (Pre-computation)**: Python background scripts (using GeoPandas, requests, etc.) to fetch, clean, and populate our PostGIS database with static data before the demo.

## Data Architecture & Flow

* **Base Map Layers (Terrain, General Roads, Elevation)**: Rendered natively via Mapbox's built-in standard vector tile APIs. This eliminates the need to host our own heavy spatial data or dedicated tile servers.
* **Custom Overlay Layers (Cell Towers, Medical Facilities, Units, POIs)**: Rendered via raw GeoJSON. The frontend fetches this data through Next.js API routes directly from our PostGIS database and handles rendering natively.
* **Dynamic Dashboard**: As the user pans, zooms, or draws a polygon, the frontend passes the bounding box to a Next.js API route to query PostGIS and return summary statistics (e.g., total civilian population, average bridge capacity).

## Key Features to Implement

1. **Interactive Map Layer**: A base map highlighting critical infrastructure, terrain features (GO / SLOW GO / NO GO areas), and weather impacts.
2. **Dynamic Viewport Clustering**: Utilize Mapbox's native clustering (`cluster: true`) for dense GeoJSON point data (like cell towers or localized demographics) to prevent frontend lag.
3. **Military Symbology**: Use the `milsymbol` JavaScript library to dynamically generate NATO APP-6 and US MIL-STD-2525 standard icons on the client side.
4. **Chokepoint & Logistics Analysis**: Visualize road segments and bridge weight/height limits to show where heavy armored units or supply convoys can safely maneuver.
5. **Explainability Panel**: A UI component that transparently displays which data sources and timestamps are currently visible and active for the analysts to ensure trust in the intelligence.

## Primary Open-Source Data Sources

* **Terrain & Topography**: National Land Survey of Finland (NLS) GeoPackages.
* **Transportation (Roads/Bridges)**: Digiroad from the Finnish Transport Infrastructure Agency (FTIA).
* **Weather**: Finnish Meteorological Institute (FMI) Open Data WFS.
* **Demographics**: Statistics Finland (Paavo) 1km x 1km grid data.
* **Space & Comm Signatures**: N2YO REST API for satellite groundtracks and orbital predictions, paired with OpenCelliD or CellMapper for cellular networks.