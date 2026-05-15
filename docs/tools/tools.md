<!-- AUTO-GENERATED:backlink START -->
[← Back](../index.md)
<!-- AUTO-GENERATED:backlink END -->
# Tools Documentation (Current Implemented State)

<!-- AUTO-GENERATED:docs-index START -->

## 📄 Pages
- 📝 [build Command](build.md)
- 📝 [doctor Command](doctor.md)
- 📝 [install Command](install.md)
- 📝 [Tool Logging and Output Semantics](logging.md)
- 📝 [run and stop Commands](run-stop.md)
- 📝 [test Command](test.md)

## 📁 Tauri Desktop Tooling
- 🗂️ [Overview](tauri/tauri.md)
- 📝 [Tauri Debug Guide](tauri/Debug.md)

<!-- AUTO-GENERATED:docs-index END -->

This section documents the current operational behavior of the ImoCalc tooling stack.
It covers commands, output semantics, runtime artifacts, dependency strategy, and failure handling.

## Tool Entry Point
All commands are invoked from the project root through:

```bash
python tools/control.py <command> [options]
```

Available commands:
- `build`
- `doctor`
- `install`
- `run`
- `stop`
- `test`
- `tauri doctor|install|run|build|test|copy`

## Command Documentation
- [build.md](/home/kleif/Projects/ImoCalc/docs/tools/build.md)
- [doctor.md](/home/kleif/Projects/ImoCalc/docs/tools/doctor.md)
- [install.md](/home/kleif/Projects/ImoCalc/docs/tools/install.md)
- [run-stop.md](/home/kleif/Projects/ImoCalc/docs/tools/run-stop.md)
- [tauri/tauri.md](/home/kleif/Projects/ImoCalc/docs/tools/tauri/tauri.md)
- [test.md](/home/kleif/Projects/ImoCalc/docs/tools/test.md)
- [logging.md](/home/kleif/Projects/ImoCalc/docs/tools/logging.md)

## Shared Concepts

### Status Model
Internal tooling status logic is based on `OK`, `WARN`, `FAIL`.
The CLI output renders those states through the emoji logger:
- `✅` = OK
- `⚠️` = WARN
- `❌` = FAIL
- `ℹ️` = informational line

### Exit Code Contract
- `0` = command completed without `FAIL`
- `1` = command completed with `FAIL` (or parser/runtime error)

### Port and Endpoint Conventions
- Frontend port: `5173`
- Backend port: `8000`
- Health endpoint: `GET /health`

### Runtime Artifacts
`run` and `stop` share runtime state in:
- `tools/.runtime/run_state.json`
- `tools/.runtime/logs/*.log` (for detached mode)

`test --report` writes local report files in:
- `.report/*.md`
- `.report/*.json` when JSON output is requested

### Dependency Strategy
- Preferred backend installer: `uv`
- Automatic fallback: `venv + pip`
- If backend venv is broken (e.g. missing pip), install flow auto-rebuilds it.

## Intended Audience
This documentation is for developers and maintainers operating the local toolchain.
For onboarding and architecture context, see [docs/dev/README.md](/home/kleif/Projects/ImoCalc/docs/dev/README.md).
