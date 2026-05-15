<!-- AUTO-GENERATED:backlink START -->
[← Back](tools.md)
<!-- AUTO-GENERATED:backlink END -->
# test Command

## Purpose
`test` orchestrates schema, backend API, frontend unit, and E2E suites from one entry point.

## CLI Syntax
```bash
python tools/control.py --test
python tools/control.py --test --suite api|schema|frontend|e2e|all [--no-start] [--report [md|json|all|done]]
```

From current help output:
- `--suite`: choose one suite or `all`
- `--no-start`: do not auto-start services
- `--report`: write a test report to `.report`

Bare `python tools/control.py --test` prints the guided suite help and does not run tests.

## Suite Coverage (Current State)
- `schema`: validates shared schema examples.
- `api`: executes backend API pytest suite.
- `frontend`: executes frontend unit tests through `npm test`.
- `e2e`: executes Playwright test suite.
- `all`: runs `schema`, `api`, `frontend`, `e2e` in that order.

## Frontend Unit Suite
The `frontend` suite runs the frontend package test script:

```bash
cd frontend
npm test
```

In `frontend/package.json`, this currently maps to:

```bash
vitest run
```

Use it directly through the control script:

```bash
python tools/control.py --test --suite frontend
python tools/control.py --test --suite frontend --report
python tools/control.py --test --suite frontend --report json
python tools/control.py --test --suite frontend --report all
```

When `--report` is enabled, the generated Markdown and JSON reports include the full `npm test` stdout/stderr output plus the command, working directory, exit code, duration, and final suite status.

The guided help includes:

```bash
python tools/control.py --test --suite api      # Backend API only
python tools/control.py --test --suite schema   # Schema validation only
python tools/control.py --test --suite frontend # Frontend unit tests with npm test
python tools/control.py --test --suite e2e      # Frontend E2E with Playwright
python tools/control.py --test --suite all      # Default full test run
```

## Service Bootstrap Rules
- Auto-start applies when `e2e` is included and `--no-start` is not set.
- Before E2E auto-start, the test runner automatically runs the same cleanup used by
  `python tools/control.py --stop` for tracked services and stale listeners on ports
  `5173` and `8000`.
- Empty cleanup state is successful; stale services or occupied default ports are cleaned
  before the E2E environment starts.
- `--no-start` skips both cleanup and service start so externally managed E2E services are
  left untouched.
- If service bootstrap fails, `e2e` is marked `FAIL`; other suites proceed where possible.

## Output and Exit Behavior
- Cleanup output and service bootstrap result when E2E requires auto-start.
- Per-suite result lines with elapsed times.
- Command, working directory, and exit code for command-backed suites.
- Failure detail blocks with useful stdout/stderr tails.
- Final overall result line.
- Exit code `1` when overall is `FAIL`, else `0`.

## Reports
Use `--report` to persist the same test context into the root `.report` folder.
Markdown is the default report format.

```bash
python tools/control.py --test --suite all --report
python tools/control.py --test --suite api --report json
python tools/control.py --test --suite e2e --report all
```

Report files include:
- generated timestamp
- original command
- suite selection and expanded suites
- overall status
- service bootstrap details when present
- per-suite status, duration, command, working directory, and exit code
- full stdout/stderr output in Markdown and JSON reports
- stdout/stderr tail fields in JSON for quick automation

Clean report files when they are no longer needed:

```bash
python tools/control.py --test --report done
```

## Typical Usage
```bash
python tools/control.py --test
python tools/control.py --test --suite schema
python tools/control.py --test --suite api
python tools/control.py --test --suite frontend
python tools/control.py --test --suite e2e
python tools/control.py --test --suite all
python tools/control.py --test --suite all --no-start
python tools/control.py --test --suite all --report
python tools/control.py --test --report done
```

## Common Failure Modes and Recovery
- `❌ service-bootstrap ... npm not found`: install Node/npm.
- `❌ schema ... jsonschema missing`: run backend install path to restore venv dependencies.
- `❌ api ... pytest failed`: inspect `backend/tests/api` and backend setup.
- `❌ frontend ... npm test failed`: inspect `frontend/src/**/*.test.*` and frontend setup.
- `❌ e2e ... playwright failed`: ensure frontend is installed and browser runtime is present.
- Report cleanup did nothing: `.report` did not exist yet.
