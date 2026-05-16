# Modification Design: AI Route Executive Summary

## Overview
This modification adds an AI-generated executive summary for route planning in the Aurora IPB application. The summary provides military-grade tactical insights based on route geometry, vehicle profiles, infrastructure hazards, and communications coverage. It is generated automatically in the background when a route is analyzed and is accessible via a centered modal.

## Detailed Analysis
### Current State
- `RoutePanel` fetches route plans and intelligence (hazards/comms).
- `RouteIntelligence` provides raw data about road/bridge constraints.
- No high-level tactical synthesis is available for planning officers.

### Goals
- Automatically generate a tactical summary using the `/api/ai` endpoint (ConfidentialMind LLM).
- Display the summary in a professional, centered modal.
- Ensure the process is non-blocking and provides clear loading states.
- Follow "tactical military format" for the output.

### User Interaction
1. User plans a route and selects a vehicle.
2. Intelligence is fetched automatically.
3. Simultaneously, an AI request is dispatched.
4. An "AI Summary" button appears in the Route Assessment section of the `RoutePanel`.
5. Clicking the button opens a centered modal with the summary.

## Detailed Design

### 1. State and Data Flow
- **`MapWithNav`**:
    - Owns `routeSummary` and `isSummaryLoading` state.
    - Owns `summaryModalOpen` state.
    - Passes `onSummaryModalOpen` and `routeSummary` props to `RoutePanel`.
- **`RoutePanel`**:
    - Triggers AI fetch in a `useEffect` that depends on `intelligence`.
    - Dispatches summary result to `MapWithNav` via `onSummaryChange`.
    - Displays "AI Summary" button (with loading spinner if needed).

### 2. AI Prompting Strategy
The prompt will be constructed to provide tactical context:
- **Role**: Senior Military Planning Officer (G3/S3).
- **Inputs**:
    - Vehicle profile (Mass, Height, Width, etc.)
    - Route summary (Distance, Duration, Profile)
    - Hazards (Critical, Warning, Info)
    - Comms gaps and coverage.
- **Format**: Tactical Executive Summary with sections like "Mobility Assessment," "Critical Constraints," and "Tactical Recommendations."

### 3. Components
- **`SummaryModal`**: A new component (or addition to `RoutePanel`'s sibling) that renders the AI content. It will use a centered layout similar to `FeatureDialog`.
- **`RoutePanel` Enhancement**: Add the button and loading indicator in the `RouteAssessment` section.

### 4. Diagram (Mermaid)
```mermaid
sequenceRef RoutePanel
    RoutePanel->>API: POST /api/route-intelligence
    API-->>RoutePanel: RouteIntelligence JSON
    RoutePanel->>MapWithNav: handleHazardsChange(intel)
    RoutePanel->>API: POST /api/ai (Prompt with Route + Intel)
    API-->>RoutePanel: AI Summary Text
    RoutePanel->>MapWithNav: onSummaryChange(text)
    Note over RoutePanel: "AI Summary" button enabled
    User->>RoutePanel: Click "AI Summary"
    RoutePanel->>MapWithNav: onSummaryModalOpen(true)
    MapWithNav->>SummaryModal: render(text)
```

## Summary of Design
- **Automatic Trigger**: AI fetch happens in `RoutePanel` immediately after intelligence is received.
- **Background Loading**: The user can continue working while the summary generates.
- **Centered Modal**: Provides a focused view of the tactical instructions.
- **Military Tone**: System prompt ensures "military grade" output.

## References
- ConfidentialMind AI API Integration: `src/lib/ai.ts`
- Route Intelligence API: `src/app/api/route-intelligence/route.ts`
- Existing Modal Pattern: `src/components/FeatureDialog.tsx`
