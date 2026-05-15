<!-- AUTO-GENERATED:backlink START -->
[← Back](tools.md)
<!-- AUTO-GENERATED:backlink END -->
# install Command

## Purpose
`install` sets up local dependencies for frontend, backend, and optional Playwright browser runtime.

## CLI Syntax
```bash
python tools/control.py --install [--skip-frontend] [--skip-backend] [--skip-playwright]
```

From current help output:
- `--skip-frontend`: skip npm install
- `--skip-backend`: skip backend dependency install
- `--skip-playwright`: skip Chromium installation

## Execution Flow
1. Ensure `.env` exists (from `.env.example` if needed).
2. Frontend install (`npm install --no-audit --no-fund`) unless skipped.
3. Backend install:
   - Preferred path: `uv`
   - Fallback path: `venv + pip`
4. Playwright Chromium install unless skipped (or frontend failed).
5. Print summarized per-step status and overall status.

## Backend Fallback and Repair Logic
When `uv` is unavailable or fails:
- Uses backend venv python for pip operations.
- Validates `python -m pip --version`.
- If pip is missing, rebuilds venv using:
  - `python -m venv --clear backend/.venv`
- Re-checks pip, then runs:
  - `python -m pip install --upgrade pip`
  - `python -m pip install -r backend/requirements.txt`

## Progress Logs
Long-running steps emit `ℹ️` progress lines with elapsed times.

## Exit Behavior
- `0`: no `FAIL` in final summary
- `1`: at least one `FAIL` in final summary

## Typical Usage
```bash
python tools/control.py --install
python tools/control.py --install --skip-playwright
python tools/control.py --install --skip-frontend --skip-playwright
```

## Common Failure Modes and Recovery
- `❌ frontend npm not found`: install Node.js/npm.
- `❌ backend ... missing requirements.txt`: verify backend scaffold.
- `❌ backend ... pip still missing after venv rebuild`: inspect Python installation and rerun.
- `❌ playwright npx not found`: ensure npm installation is complete.
