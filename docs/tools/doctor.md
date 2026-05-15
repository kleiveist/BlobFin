<!-- AUTO-GENERATED:backlink START -->
[← Back](tools.md)
<!-- AUTO-GENERATED:backlink END -->
# doctor Command

## Purpose
`doctor` validates local readiness for the current ImoCalc implementation baseline.

## CLI Syntax
```bash
python tools/control.py --doctor [--watch] [--interval N]
```

From current help output:
- `--watch`: run checks continuously
- `--interval`: seconds between runs in watch mode (default `5`)

## What It Checks
- Runtime tools: `python3`, `node`, `npm`, `uv`
- Ports: `5173`, `8000`
- Project structure: `frontend`, `backend`, `shared`
- Dependency footprint:
  - `frontend/node_modules`
  - `backend/.venv`

## Output Behavior
- One line per check with emoji status.
- Final overall line as aggregated status.
- In watch mode, it also prints changed statuses since previous iteration.

## Exit Behavior
- `0`: overall not `FAIL`
- `1`: overall `FAIL`

## Typical Usage
```bash
python tools/control.py --doctor
python tools/control.py --doctor --watch --interval 3
```

## Common Failure Modes and Recovery
- `❌ node` / `❌ npm`: install Node.js/npm and rerun doctor.
- `❌ uv`: optional for current fallback flow, but recommended for preferred backend install path.
- `⚠️ frontend-deps`: run `python tools/control.py --install`.
- `⚠️ backend-venv`: run `python tools/control.py --install --skip-frontend --skip-playwright`.
- `⚠️ port:5173` or `⚠️ port:8000`: port is in use; stop the running process or retarget run ports.
