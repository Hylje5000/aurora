# Modification Design: Route Analysis PDF Export

## Overview

This modification adds an "Export to PDF" feature to the Aurora application. This allows users to download a professional, tactical report of a planned route, including a map overview, AI-generated tactical summary, and a detailed list of identified hazards (route intelligence). The output is optimized for physical printing and battlefield use (Light Mode).

## Detailed Analysis

Currently, users can plan routes and see intelligence/summaries in the UI, but there is no way to export this data for offline use or for inclusion in formal mission briefings.

### Goal

- Provide a downloadable PDF report.
- Include a high-quality map screenshot of the entire route.
- Include the AI-generated tactical summary.
- Include all hazards (critical, warning, info) with their details.
- Optimize for high-contrast printing (light background).

### Problem/Challenges

1. **Map Capture**: Mapbox GL JS renders to a WebGL canvas. By default, this canvas is cleared after each frame, making `toDataURL()` return a blank image unless `preserveDrawingBuffer: true` is set during map initialization.
2. **PDF Layout**: Converting the rich UI (markdown, charts, icons) into a structured PDF requires a robust library like `@react-pdf/renderer`.
3. **Data Availability**: The PDF needs access to `plannedRoute`, `routeIntelligence`, `routeSummary`, and the `Map` instance.

## Alternatives Considered

1. **jsPDF + html2canvas**:
   - _Pros_: Captures exactly what is on the screen.
   - _Cons_: Poor quality for text (rendered as images), difficult to handle multi-page layouts, and often buggy with WebGL canvases.
2. **Server-side Generation (Puppeteer)**:
   - _Pros_: Highest fidelity.
   - _Cons_: Heavy infrastructure requirements, difficult to pass complex client-side state (route data, AI summary) to a server-side browser instance.
3. **@react-pdf/renderer (Chosen)**:
   - _Pros_: Declarative React-like syntax, excellent for multi-page documents, generates high-quality vector-based text (searchable and crisp for printing).
   - _Cons_: Requires manually defining the PDF layout using their primitives (View, Text, Image).

## Detailed Design

### 1. Map Screenshot Capability

- Modify `src/components/MapView.tsx`:
  - Set `preserveDrawingBuffer: true` in `mapboxgl.Map` options.
  - Expose a `getMapScreenshot()` method via `useImperativeHandle`. This method will:
    - Return a base64 Data URL of the current canvas.
    - Optionally allow capturing specific bounds or at a specific resolution.

### 2. PDF Document Structure (`src/components/RoutePDF.tsx`)

Create a new component using `@react-pdf/renderer`:

- **Header**: Title ("AURORA - ROUTE ANALYSIS REPORT"), Date/Time, AOI.
- **Section 1: Mission Overview**:
  - Distance, Estimated Duration, Profile (Driving/Walking), Vehicle Type & Weight.
  - **Map Image**: The captured route overview.
- **Section 2: Tactical Summary**:
  - The AI-generated markdown content, parsed and rendered as PDF text blocks.
- **Section 3: Intelligence & Hazards**:
  - A categorized list of hazards.
  - Ordered by Criticality (Critical -> Warning -> Info).
  - Hazard Type, Location (Coordinates), and Detailed Message.

### 3. UI Integration (`src/components/RoutePanel.tsx`)

- Add an "Export PDF" button in the "Route Assessment" section.
- Handle the export flow:
  1. Trigger screenshot from `MapView`.
  2. Generate PDF blob using `PDFDownloadLink` or `pdf()` function from `@react-pdf/renderer`.
  3. Trigger download.

### 4. Aesthetics (Print-Friendly)

- Use a white background for the entire document.
- Use dark navy/black for text.
- Map hazard severities to legible colors:
  - Critical: Bold Red (#B91C1C)
  - Warning: Amber (#B45309)
  - Info: Slate Blue (#475569)
- Use a clean, professional sans-serif font (standard PDF fonts like Helvetica).

## Diagram (Mermaid)

```mermaid
graph TD
    User((User)) -->|Click Export| RoutePanel
    RoutePanel -->|Call| MapView[MapView: getMapScreenshot]
    MapView -->|toDataURL| Canvas((WebGL Canvas))
    Canvas -->|Image Data| RoutePanel
    RoutePanel -->|Pass Data| RoutePDF[RoutePDF Component]
    RoutePDF -->|Render| PDFEngine[@react-pdf/renderer]
    PDFEngine -->|Download| User
```

## Summary of Design

The solution utilizes `@react-pdf/renderer` for high-quality, print-optimized document generation. It modifies the `MapView` to enable canvas capturing and wires the data from `MapWithNav` / `RoutePanel` into a structured report.

## References

- [Mapbox GL JS: preserveDrawingBuffer](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters)
- [@react-pdf/renderer Documentation](https://react-pdf.org/)
- [Capturing Mapbox screenshots](https://github.com/mapbox/mapbox-gl-js/issues/2873)
