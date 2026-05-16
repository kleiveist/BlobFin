# Developer Guide

This folder documents BlobFin from a developer perspective: architecture, module ownership, domain calculations, backend services, tooling, and tests.

## Sections

- [Architecture](architecture.md): repository structure and runtime data flow.
- [Frontend](frontend.md): Vite app structure, rendering, state, storage, charting, and UI modules.
- [Domain Model](domain-model.md): reserve and investment calculation rules.
- [Backend](backend.md): FastAPI endpoints, validation, reports, and current legacy boundaries.
- [Tooling](tooling.md): project control CLI, install, run, build, and Tauri tooling.
- [Testing](testing.md): available test suites and how to run them.

## Development Principle

The active BlobFin product logic currently lives in the frontend. Backend and shared schema modules still contain inherited financing/reporting functionality. Treat those modules as existing infrastructure and compatibility code unless a task explicitly migrates them to the BlobFin reserve/investment domain.
