<!-- AUTO-GENERATED:backlink START -->
[← Back](tools.md)
<!-- AUTO-GENERATED:backlink END -->
# run and stop Commands

## Purpose
- `run`: starts frontend and backend services for local development.
- `stop`: stops services started/tracked by `run`.

## CLI Syntax
```bash
python tools/control.py --run [--frontend-port 5173] [--backend-port 8000] [--detach]
python tools/control.py --stop
```

From current help output:
- `--frontend-port`: frontend port override
- `--backend-port`: backend port override
- `--detach`: run services in background

## run Behavior
### Preflight
- Detects existing tracked runtime state.
- Checks target ports for availability.
- Validates required files and binaries (`frontend/package.json`, `backend/app/main.py`, npm, Python).

### Service Start
- Frontend command: `npm run dev -- --host 127.0.0.1 --port <frontend-port>`
- Backend command: `<backend-python> -m uvicorn app.main:app --host 127.0.0.1 --port <backend-port>`

### Foreground Mode
- Streams both service outputs as `ℹ️` lines.
- Returns failure if a process exits unexpectedly.
- On interrupt, performs tracked shutdown.

### Detached Mode
- Stores process metadata in `tools/.runtime/run_state.json`.
- Writes logs under `tools/.runtime/logs`.

## stop Behavior
- Reads runtime state.
- Sends `SIGTERM` first, then `SIGKILL` fallback after timeout.
- Clears runtime state file after stop attempt.

## Exit Behavior
- `run`: `1` on preflight/start/crash failure; `0` on clean interrupt path.
- `stop`: `1` if any process could not be terminated; otherwise `0`.

## Typical Usage
```bash
python tools/control.py --run
python tools/control.py --run --detach
python tools/control.py --stop
```

## Known/Expected Runtime Notes
- Backend root path `/` currently returns 404 by design; use `/health` for health checks.
- `No module named uvicorn` means backend venv packages are not installed for the selected python path.
