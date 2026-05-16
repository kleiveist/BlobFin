# Architecture

BlobFin is organized as a small monorepo with frontend, backend, shared data, and Python tooling.

## Repository Areas

```text
frontend/   Vite + TypeScript single page app
backend/    FastAPI service with validation, calculation, PDF, and privacy endpoints
shared/     JSON schemas, examples, legal data, and shared assets
tools/      Python control CLI for install, run, stop, build, test, and Tauri workflows
docs/       User, developer, and tooling documentation
```

## Runtime Shape

The main planning application is the frontend:

1. `frontend/src/main.ts` loads saved state.
2. UI templates from `frontend/src/views/templates.ts` create the app shell.
3. Input events update `AppState`.
4. Reserve calculations run in `frontend/src/domain/reserveCalculator.ts`.
5. Investment projections run in `frontend/src/domain/assetProjection.ts`.
6. Results are rendered into metric cards, tables, and the canvas chart.
7. State is saved through `frontend/src/lib/storage.ts`.

The backend is available as a separate FastAPI process. It currently exposes legacy financing validation/calculation and PDF endpoints. The Vite frontend is allowed by CORS from `127.0.0.1:5173` and `localhost:5173`.

## Data Flow

```text
Browser input
  -> AppState
  -> reserve summary
  -> yearly table + reserve metrics
  -> investment contribution selection
  -> asset projection
  -> chart + investment statistics
  -> localStorage
```

## Important Boundaries

- Keep pure calculation rules in `frontend/src/domain`.
- Keep formatting in `frontend/src/lib/format.ts`.
- Keep persistence and state normalization in `frontend/src/lib/storage.ts`.
- Keep HTML structure in `frontend/src/views/templates.ts`.
- Keep chart drawing and chart hit detection in `frontend/src/views/investmentChart.ts`.
- Keep backend API contracts under `backend/app/api` and `shared/schema`.

## Current Legacy Boundary

Some backend naming still says `ImoCalc`. Examples include the FastAPI app title, health service name, and financing schemas. This is documented because it affects onboarding, tests, and API expectations. Do not assume backend schemas describe the current frontend reserve/investment state.
