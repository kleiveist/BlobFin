<!-- AUTO-GENERATED:docs-index START -->

## 📄 Files
- ⏭️ (keine Markdown-Dateien im Projekt-Root)

# DOCS
- 📚 [Docs Home](docs/index.md)

## 📁 DEF
- 🗂️ [Overview](docs/def/def.md)

## 📁 DEF
- 🗂️ [Overview](docs/DEF/DEF.md)
- 📝 [Architecture](docs/DEF/architecture.md)
- 📝 [Backend](docs/DEF/backend.md)
- 📝 [Domain Model](docs/DEF/domain-model.md)
- 📝 [Frontend](docs/DEF/frontend.md)
- 📝 [Testing](docs/DEF/testing.md)
- 📝 [Tooling](docs/DEF/tooling.md)

## 📁 Tools Documentation (Current Implemented State)
- 🗂️ [Overview](docs/tools/tools.md)
- 📝 [build Command](docs/tools/build.md)
- 📝 [doctor Command](docs/tools/doctor.md)
- 📝 [install Command](docs/tools/install.md)
- 📝 [Tool Logging and Output Semantics](docs/tools/logging.md)
- 📝 [run and stop Commands](docs/tools/run-stop.md)
- 📝 [test Command](docs/tools/test.md)

## 📁 USR
- 🗂️ [Overview](docs/usr/usr.md)

## 📁 USR
- 🗂️ [Overview](docs/USR/USR.md)
- 📝 [Data, Export, And Reset](docs/USR/data-export-reset.md)
- 📝 [Getting Started](docs/USR/getting-started.md)
- 📝 [Investment Planning](docs/USR/investment-planning.md)
- 📝 [Reserve Planning](docs/USR/reserve-planning.md)

<!-- AUTO-GENERATED:docs-index END -->
# BlobFin

BlobFin is a local finance planning application for yearly reserve planning, cashflow visibility, and long-term investment and payout projections. The current primary product surface is a Vite + TypeScript frontend. The repository also contains a FastAPI backend, shared JSON schemas, PDF/report assets, and a Python control CLI inherited from an earlier project.

## What The App Does

- Plans yearly cost and reserve positions month by month.
- Separates fixed balances, reserves, temporary expenses, and savings positions.
- Calculates monthly remaining net income, yearly outflows, interest, and cashback.
- Selects savings positions, account interest, and cashback as investment inputs.
- Projects asset growth, percentage withdrawals, retirement payouts, inflation, and capital gains tax on realized gains.
- Shows an interactive investment chart where each yearly bar can be opened for a value breakdown.
- Provides a prepared Tauri desktop shell for building the web frontend as a desktop app.

## Documentation Map

User-focused documentation lives in `docs/USR`:

- [User Guide](docs/USR/README.md)
- [Getting Started](docs/USR/getting-started.md)
- [Reserve Planning](docs/USR/reserve-planning.md)
- [Investment Planning](docs/USR/investment-planning.md)
- [Data, Export, And Reset](docs/USR/data-export-reset.md)

Developer-focused documentation lives in `docs/DEF`:

- [Developer Guide](docs/DEF/README.md)
- [Architecture](docs/DEF/architecture.md)
- [Frontend](docs/DEF/frontend.md)
- [Domain Model](docs/DEF/domain-model.md)
- [Backend](docs/DEF/backend.md)
- [Tooling](docs/DEF/tooling.md)
- [Testing](docs/DEF/testing.md)

Operational tooling details also exist under `docs/tools`.

## Quick Start

Install dependencies:

```sh
python tools/control.py --install
```

Run frontend and backend locally:

```sh
python tools/control.py --run
```

Default local URLs:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`

Stop tracked services:

```sh
python tools/control.py --stop
```

## Direct Frontend Commands

From `frontend`:

```sh
npm run dev
npm run build
npm run preview
npm run test
```

## Repository Layout

```text
backend/          FastAPI service, validation, calculation, PDF endpoints
docs/             User, developer, and tooling documentation
frontend/         Vite + TypeScript single page application
shared/           JSON schemas, examples, legal data, shared assets
src-tauri/        Tauri desktop shell, configuration, capabilities, and icons
tools/            Python project control CLI and test/build/run helpers
```

## Current Status Note

The frontend is the active BlobFin planning app. The backend and some shared schemas still use legacy financing names and endpoints from the previous project. They are documented as existing infrastructure so developers can identify what is active, what is compatibility tooling, and what should be renamed or replaced in future backend work.
