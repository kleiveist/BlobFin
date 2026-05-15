from __future__ import annotations

import argparse
import json
import shlex
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tools import logger
from tools.inst import report as report_writer
from tools.inst import stop as service_cleanup

ROOT = Path(__file__).resolve().parents[2]
CONSOLE_TAIL_LINES = 12
REPORT_TAIL_LINES = 80
FRONTEND_PORT = 5173
BACKEND_PORT = 8000


@dataclass(slots=True)
class SuiteResult:
    name: str
    status: str
    message: str
    duration_seconds: float
    command: list[str] | None = None
    cwd: str | None = None
    exit_code: int | None = None
    stdout: str = ""
    stderr: str = ""
    stdout_tail: str = ""
    stderr_tail: str = ""
    detail: str = ""

    def __post_init__(self) -> None:
        if self.stdout and not self.stdout_tail:
            self.stdout_tail = _tail_text(self.stdout)
        if self.stderr and not self.stderr_tail:
            self.stderr_tail = _tail_text(self.stderr)

    def to_report_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status,
            "message": self.message,
            "duration_seconds": round(self.duration_seconds, 3),
            "command": _format_command(self.command) if self.command else None,
            "cwd": self.cwd,
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "stdout_tail": self.stdout_tail,
            "stderr_tail": self.stderr_tail,
            "detail": self.detail,
        }


def _tail_lines(text: str, limit: int) -> list[str]:
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return []
    return lines[-limit:]


def _tail_text(text: str, limit: int = REPORT_TAIL_LINES) -> str:
    lines = _tail_lines(text, limit)
    if not lines:
        return ""
    return "\n".join(lines)


def _format_command(command: list[str] | None, *, max_chars: int | None = None) -> str:
    if not command:
        return ""
    formatted = shlex.join(command)
    if max_chars is not None and len(formatted) > max_chars:
        return f"{formatted[: max_chars - 3]}..."
    return formatted


def _run(cmd: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, check=False)


def _expand_suites(value: str) -> list[str]:
    if value == "all":
        return ["schema", "api", "frontend", "e2e"]
    return [value]


def _result_from_completed(
    *,
    name: str,
    completed: subprocess.CompletedProcess[str],
    started: float,
    command: list[str],
    cwd: Path,
    ok_message: str,
    fail_message: str,
) -> SuiteResult:
    status = "OK" if completed.returncode == 0 else "FAIL"
    message = ok_message if completed.returncode == 0 else fail_message
    return SuiteResult(
        name=name,
        status=status,
        message=message,
        duration_seconds=time.monotonic() - started,
        command=command,
        cwd=str(cwd),
        exit_code=completed.returncode,
        stdout=completed.stdout or "",
        stderr=completed.stderr or "",
        stdout_tail=_tail_text(completed.stdout),
        stderr_tail=_tail_text(completed.stderr),
    )


def _run_schema_suite() -> SuiteResult:
    started = time.monotonic()
    schema_path = ROOT / "shared" / "schema" / "input.schema.json"
    valid_path = ROOT / "shared" / "examples" / "valid.json"
    invalid_path = ROOT / "shared" / "examples" / "invalid.json"
    detail = (
        "Schema: shared/schema/input.schema.json; "
        "examples: shared/examples/valid.json, shared/examples/invalid.json"
    )

    if not schema_path.exists() or not valid_path.exists() or not invalid_path.exists():
        return SuiteResult(
            "schema",
            "WARN",
            "schema files missing; suite skipped",
            time.monotonic() - started,
            detail=detail,
        )

    try:
        import jsonschema  # type: ignore

        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        valid_data = json.loads(valid_path.read_text(encoding="utf-8"))
        invalid_data = json.loads(invalid_path.read_text(encoding="utf-8"))

        validator = jsonschema.Draft202012Validator(schema)

        valid_errors = list(validator.iter_errors(valid_data))
        if valid_errors:
            return SuiteResult(
                "schema",
                "FAIL",
                "valid example failed validation",
                time.monotonic() - started,
                detail=f"{detail}; error: {valid_errors[0].message}",
            )

        invalid_errors = list(validator.iter_errors(invalid_data))
        if not invalid_errors:
            return SuiteResult(
                "schema",
                "FAIL",
                "invalid example passed unexpectedly",
                time.monotonic() - started,
                detail=detail,
            )

        return SuiteResult(
            "schema",
            "OK",
            "schema examples validated",
            time.monotonic() - started,
            detail=detail,
        )
    except ImportError:
        backend_python = ROOT / "backend" / ".venv" / "bin" / "python"
        if not backend_python.exists():
            return SuiteResult(
                "schema",
                "FAIL",
                "jsonschema package missing in current runtime and backend venv",
                time.monotonic() - started,
                detail=detail,
            )

        script = (
            "import json, pathlib, jsonschema; "
            "root=pathlib.Path.cwd(); "
            "schema=json.loads((root/'shared/schema/input.schema.json').read_text()); "
            "valid=json.loads((root/'shared/examples/valid.json').read_text()); "
            "invalid=json.loads((root/'shared/examples/invalid.json').read_text()); "
            "v=jsonschema.Draft202012Validator(schema); "
            "assert not list(v.iter_errors(valid)); "
            "assert list(v.iter_errors(invalid)); "
        )
        command = [str(backend_python), "-c", script]
        completed = _run(command, cwd=ROOT)
        result = _result_from_completed(
            name="schema",
            completed=completed,
            started=started,
            command=command,
            cwd=ROOT,
            ok_message="schema examples validated via backend venv",
            fail_message="schema validation failed via backend venv",
        )
        result.detail = detail
        return result


def _run_api_suite() -> SuiteResult:
    started = time.monotonic()
    api_tests = ROOT / "backend" / "tests" / "api"
    if not api_tests.exists():
        return SuiteResult("api", "WARN", "backend/tests/api missing; suite skipped", time.monotonic() - started)

    backend_python = ROOT / "backend" / ".venv" / "bin" / "python"
    if not backend_python.exists():
        fallback_python = shutil.which("python3") or shutil.which("python")
        if fallback_python is None:
            return SuiteResult("api", "FAIL", "python runtime missing", time.monotonic() - started)
        backend_python = Path(fallback_python)

    command = [str(backend_python), "-m", "pytest", "-q", str(api_tests)]
    completed = _run(command, cwd=ROOT)
    return _result_from_completed(
        name="api",
        completed=completed,
        started=started,
        command=command,
        cwd=ROOT,
        ok_message="pytest api suite passed",
        fail_message="pytest api suite failed",
    )


def _run_frontend_suite() -> SuiteResult:
    started = time.monotonic()
    frontend_dir = ROOT / "frontend"
    package_json = frontend_dir / "package.json"
    if not package_json.exists():
        return SuiteResult(
            "frontend",
            "WARN",
            "frontend/package.json missing; suite skipped",
            time.monotonic() - started,
        )

    npm = shutil.which("npm")
    if npm is None:
        return SuiteResult("frontend", "FAIL", "npm not found", time.monotonic() - started)

    command = [npm, "test"]
    completed = _run(command, cwd=frontend_dir)
    return _result_from_completed(
        name="frontend",
        completed=completed,
        started=started,
        command=command,
        cwd=frontend_dir,
        ok_message="npm test frontend suite passed",
        fail_message="npm test frontend suite failed",
    )


def _run_e2e_suite() -> SuiteResult:
    started = time.monotonic()
    e2e_tests = ROOT / "frontend" / "tests" / "e2e"
    if not e2e_tests.exists():
        return SuiteResult("e2e", "WARN", "frontend/tests/e2e missing; suite skipped", time.monotonic() - started)

    npx = shutil.which("npx")
    if npx is None:
        return SuiteResult("e2e", "FAIL", "npx not found", time.monotonic() - started)

    command = [npx, "playwright", "test"]
    completed = _run(command, cwd=ROOT / "frontend")
    return _result_from_completed(
        name="e2e",
        completed=completed,
        started=started,
        command=command,
        cwd=ROOT / "frontend",
        ok_message="playwright e2e suite passed",
        fail_message="playwright e2e suite failed",
    )


def _run_e2e_cleanup(started: float) -> SuiteResult | None:
    logger.info("Running cleanup before E2E tests")
    cleanup_args = argparse.Namespace(
        frontend_port=FRONTEND_PORT,
        backend_port=BACKEND_PORT,
        tracked_only=False,
    )
    cleanup_code = service_cleanup.main(cleanup_args)
    if cleanup_code == 0:
        return None

    return SuiteResult(
        "service-bootstrap",
        "FAIL",
        "cleanup failed before e2e service bootstrap",
        time.monotonic() - started,
        command=["python", "tools/control.py", "stop"],
        cwd=str(ROOT),
        exit_code=cleanup_code,
        detail="E2E service startup was skipped because cleanup did not complete successfully.",
    )


def _start_services_if_needed(selected_suites: list[str], no_start: bool) -> tuple[bool, SuiteResult]:
    requires_services = "e2e" in selected_suites
    if not requires_services:
        return False, SuiteResult("service-bootstrap", "SKIP", "not required", 0.0)
    if no_start:
        return False, SuiteResult("service-bootstrap", "SKIP", "disabled by --no-start", 0.0)

    started = time.monotonic()
    cleanup_failure = _run_e2e_cleanup(started)
    if cleanup_failure is not None:
        return False, cleanup_failure

    command = [sys.executable, str(ROOT / "tools" / "control.py"), "run", "--detach"]
    completed = _run(command, cwd=ROOT)
    if completed.returncode == 0:
        return True, SuiteResult(
            "service-bootstrap",
            "OK",
            "services started by test runner",
            time.monotonic() - started,
            command=command,
            cwd=str(ROOT),
            exit_code=completed.returncode,
            stdout=completed.stdout or "",
            stderr=completed.stderr or "",
            stdout_tail=_tail_text(completed.stdout),
            stderr_tail=_tail_text(completed.stderr),
        )

    return False, SuiteResult(
        "service-bootstrap",
        "FAIL",
        "service bootstrap failed",
        time.monotonic() - started,
        command=command,
        cwd=str(ROOT),
        exit_code=completed.returncode,
        stdout=completed.stdout or "",
        stderr=completed.stderr or "",
        stdout_tail=_tail_text(completed.stdout),
        stderr_tail=_tail_text(completed.stderr),
    )


def _stop_services_if_started(started: bool) -> None:
    if not started:
        return
    _run([sys.executable, str(ROOT / "tools" / "control.py"), "stop"], cwd=ROOT)


def _print_suite_guide() -> None:
    logger.info("ImoCalc test suites")
    print("")
    print("Use an explicit suite command:")
    print("  python tools/control.py --test --suite api      # Backend API only")
    print("  python tools/control.py --test --suite schema   # Schema validation only")
    print("  python tools/control.py --test --suite frontend # Frontend unit tests with npm test")
    print("  python tools/control.py --test --suite e2e      # Frontend E2E with Playwright")
    print("  python tools/control.py --test --suite all      # Default full test run")
    print("")
    print("Useful options:")
    print("  --no-start       Do not start frontend/backend automatically for E2E")
    print("  --report         Write a Markdown report to .report")
    print("  --report json    Write a JSON report to .report")
    print("  --report all     Write Markdown and JSON reports to .report")
    print("  --report done    Remove the .report folder")


def _print_tail(label: str, text: str) -> None:
    lines = _tail_lines(text, CONSOLE_TAIL_LINES)
    if not lines:
        return
    logger.info(f"  {label}:")
    for line in lines:
        print(f"    {line}")


def _print_result_details(item: SuiteResult) -> None:
    if item.command:
        logger.info(f"  command: {_format_command(item.command, max_chars=180)}")
    if item.cwd:
        logger.info(f"  cwd: {item.cwd}")
    if item.exit_code is not None:
        logger.info(f"  exit code: {item.exit_code}")
    if item.detail:
        logger.info(f"  detail: {item.detail}")
    if item.status == "FAIL":
        _print_tail("stdout tail", item.stdout_tail)
        _print_tail("stderr tail", item.stderr_tail)


def _print_results(results: list[SuiteResult], bootstrap: SuiteResult) -> str:
    overall = "OK"
    if bootstrap.status != "SKIP":
        logger.status(
            bootstrap.status,
            f"step:{bootstrap.name:<17} {bootstrap.message} ({bootstrap.duration_seconds:.2f}s)",
        )
        _print_result_details(bootstrap)

    logger.info("Test suite summary")
    for item in results:
        logger.status(item.status, f"suite:{item.name:<7} {item.message} ({item.duration_seconds:.2f}s)")
        _print_result_details(item)
        if item.status == "FAIL":
            overall = "FAIL"
        elif item.status == "WARN" and overall != "FAIL":
            overall = "WARN"
    logger.status(overall, f"Overall test status: {overall}")
    return overall


def _build_report_payload(
    *,
    args: argparse.Namespace,
    selected_suites: list[str],
    bootstrap: SuiteResult,
    results: list[SuiteResult],
    overall: str,
) -> dict[str, Any]:
    display_argv = getattr(args, "display_argv", None) or sys.argv[1:]
    return {
        "command": _format_command(["python", "tools/control.py", *display_argv]),
        "suite_selection": args.suite,
        "expanded_suites": selected_suites,
        "no_start": args.no_start,
        "overall": overall,
        "bootstrap": bootstrap.to_report_dict(),
        "results": [item.to_report_dict() for item in results],
    }


def _write_report_if_requested(
    *,
    args: argparse.Namespace,
    selected_suites: list[str],
    bootstrap: SuiteResult,
    results: list[SuiteResult],
    overall: str,
) -> bool:
    report_mode = getattr(args, "report", None)
    if not report_mode:
        return True

    payload = _build_report_payload(
        args=args,
        selected_suites=selected_suites,
        bootstrap=bootstrap,
        results=results,
        overall=overall,
    )
    try:
        written_paths = report_writer.write_test_report(ROOT, payload, report_mode)
    except (OSError, ValueError) as exc:
        logger.fail(f"failed to write test report: {exc}")
        return False

    for path in written_paths:
        logger.ok(f"test report written: {path.relative_to(ROOT)}")
    return True


def main(args: argparse.Namespace) -> int:
    if getattr(args, "report", None) == "done":
        removed = report_writer.clean_reports(ROOT)
        if removed:
            logger.ok("removed .report")
        else:
            logger.info(".report does not exist")
        return 0

    if getattr(args, "suite_help", False):
        _print_suite_guide()
        return 0

    selected_suites = _expand_suites(args.suite)

    started_by_runner, bootstrap = _start_services_if_needed(selected_suites, args.no_start)

    results: list[SuiteResult] = []

    try:
        if bootstrap.status == "FAIL":
            for suite in selected_suites:
                if suite == "e2e":
                    results.append(
                        SuiteResult(
                            suite,
                            "FAIL",
                            "service bootstrap failed before e2e could run",
                            0.0,
                            detail="See service-bootstrap failure details above.",
                        )
                    )
                elif suite == "schema":
                    results.append(_run_schema_suite())
                elif suite == "api":
                    results.append(_run_api_suite())
                elif suite == "frontend":
                    results.append(_run_frontend_suite())
        else:
            for suite in selected_suites:
                if suite == "schema":
                    results.append(_run_schema_suite())
                elif suite == "api":
                    results.append(_run_api_suite())
                elif suite == "frontend":
                    results.append(_run_frontend_suite())
                elif suite == "e2e":
                    results.append(_run_e2e_suite())
    finally:
        _stop_services_if_started(started_by_runner)

    overall = _print_results(results, bootstrap)
    report_ok = _write_report_if_requested(
        args=args,
        selected_suites=selected_suites,
        bootstrap=bootstrap,
        results=results,
        overall=overall,
    )
    return 1 if overall == "FAIL" or not report_ok else 0
