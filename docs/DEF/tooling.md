# Tooling

The main project control entry point is:

```sh
python tools/control.py
```

The CLI still has inherited `ImoCalc` wording in its internal description, but it controls the BlobFin repository.

## Common Commands

Install dependencies:

```sh
python tools/control.py --install
```

Run frontend and backend:

```sh
python tools/control.py --run
```

Run on custom ports:

```sh
python tools/control.py --run --frontend-port 5174 --backend-port 8001
```

Stop tracked services:

```sh
python tools/control.py --stop
```

Build the frontend:

```sh
python tools/control.py --build
```

Run tests:

```sh
python tools/control.py --test --suite all
```

Write a test report:

```sh
python tools/control.py --test --suite all --report md
```

## Suites

Supported suites:

- `schema`,
- `api`,
- `frontend`,
- `e2e`,
- `all`.

## Runtime State

The control tooling tracks started services under `tools/.runtime`. Reports are written under `.report` when requested.

## Tauri

Tauri tooling exists under `tools/tauri` and `docs/tools/tauri`. It is not the primary path for the current web frontend task, but it remains available for desktop packaging workflows.

Use:

```sh
python tools/control.py tauri --help
```

for the current subcommands.
