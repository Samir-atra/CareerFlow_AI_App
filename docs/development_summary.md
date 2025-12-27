# Development Summary & Stages

This document outlines the evolution of **CareerFlow AI** through the recent development session.

## Stage 1: Foundation & Presets
**Goal**: Expand the default search capabilities beyond user input.

*   **Action**: Created `constants.ts` to store hardcoded job board URLs for major tech giants (Google, Microsoft, Apple).
*   **Logic**: Updated `App.tsx` to include these preset URLs in the search logic alongside user inputs.

## Stage 2: Browser Compatibility & "Smart Search"
**Goal**: Enable "browser-like" functionality without backend dependencies or encryption errors.

*   **Challenge**: The user requested functionality similar to the `browser-use` library. However, typical browser automation libraries rely on Node.js `crypto` modules which cause errors (e.g., `crypto.createHash`) in purely frontend/browser environments.
*   **Solution**:
    1.  Removed the incompatible `browser-use-sdk` from the import map.
    2.  Implemented a **Smart Search** feature in `AnalysisDisplay.tsx`. Instead of automating the browser (which is security-restricted), the app now uses the AI-extracted keywords to construct "Deep Links".
    3.  These links allow users to instantly open pre-filled search queries on **LinkedIn**, **Indeed**, and **Google Jobs** with a single click.

## Stage 3: Prioritized Search Logic (Waterfall)
**Goal**: Refine how job results are fetched and displayed to respect user intent.

*   **Requirement**: Maximize the relevance of results up to a limit (default 20), prioritizing specific user requests over general presets.
*   **Implementation**:
    1.  **Priority System**:
        *   **Priority 1**: User-provided URL.
        *   **Priority 2**: Preset Boards (Google, MS, Apple).
        *   **Priority 3**: Open Web Search (General keywords).
    2.  **Parallel Execution**: All search tasks run simultaneously to ensure speed.
    3.  **Aggregation**: Results are collected, tagged with their priority level, sorted, and then deduplicated.
    4.  **Pagination**: The final list is sliced to the user's requested count (`jobCount`), ensuring that high-priority results always displace lower-priority ones if the limit is reached.

## Stage 4: Documentation
**Goal**: Finalize project structure and instructions.

*   **Action**: Added `README.md` for general project overview and `docs/development_summary.md` (this file) to track the iteration history.

---
**Current Status**: The application is fully functional as a client-side React app using the Gemini API for intelligence and standard web APIs for navigation and document handling.