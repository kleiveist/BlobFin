<!-- AUTO-GENERATED:backlink START -->
[← Back](def.md)
<!-- AUTO-GENERATED:backlink END -->
# Frontend

The frontend is a Vite + TypeScript single page application without a component framework.

## Package

`frontend/package.json` defines:

- `npm run dev`: start Vite on `127.0.0.1`.
- `npm run build`: run TypeScript checking and create a Vite build.
- `npm run preview`: preview the production build.
- `npm run test`: run Vitest tests.

Dependencies are intentionally small. Runtime dependencies are currently empty; Vite, TypeScript, and Vitest are development dependencies.

## Key Files

- `frontend/src/main.ts`: application bootstrap, event delegation, rendering, state updates, storage writes, chart popup handling.
- `frontend/src/types.ts`: central TypeScript state and result interfaces.
- `frontend/src/data/defaults.ts`: default settings and default positions.
- `frontend/src/views/templates.ts`: static HTML template functions for the app shell and controls.
- `frontend/src/views/investmentChart.ts`: canvas chart drawing, bar hit areas, click handling.
- `frontend/src/styles.css`: full application styling.
- `frontend/src/lib/storage.ts`: local storage persistence and legacy state normalization.
- `frontend/src/lib/csv.ts`: CSV import/export helpers.
- `frontend/src/lib/format.ts`: money, percent, labels, and numeric helpers.
- `frontend/src/domain/reserveCalculator.ts`: yearly reserve, cashflow, interest, and cashback calculations.
- `frontend/src/domain/investmentContributions.ts`: recurring and one-time investment contribution selection.
- `frontend/src/domain/assetProjection.ts`: long-term asset, withdrawal, payout, inflation, and tax projection.

## State Lifecycle

1. `loadState()` reads `blobfin.reserveCalculator.v1`.
2. If missing, legacy `jahreskalkulatorState` can be normalized.
3. `render()` calculates reserve and investment outputs.
4. User input updates a field in `AppState`.
5. `saveState()` persists the new state.
6. The UI is re-rendered or synchronized.

The app uses event delegation on the page root for most input, change, click, and drag/drop behavior. This keeps the template output simple and avoids a component runtime.

## Rendering

`templates.ts` creates the main document shell. Dynamic parts are filled by `main.ts`:

- position table rows,
- yearly table rows,
- investment include list,
- metric values,
- range labels,
- chart popup.

## Chart Interaction

`investmentChart.ts` draws the full chart to a canvas and stores clickable bar hit areas in a `WeakMap`. On click, the chart returns the selected `AssetProjectionPoint` to `main.ts`, which renders the popup with the year-specific value breakdown.

## Storage Compatibility

`storage.ts` normalizes missing or older fields. This is important because new UI fields such as `visible`, `interestBearing`, `cashback`, `payoutYear`, and the current investment setting names were added over time.

When adding state fields:

- update `types.ts`,
- update defaults,
- update storage normalization,
- update rendering and inputs,
- add or adjust focused tests.
