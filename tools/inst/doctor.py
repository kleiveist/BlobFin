from __future__ import annotations

import argparse
import importlib.util
import shutil
import socket
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from tools import logger

ROOT = Path(__file__).resolve().parents[2]


@dataclass(slots=True)
class CheckResult:
    name: str
    status: str
    message: str


def _status_priority(status: str) -> int:
    order = {"OK": 0, "WARN": 1, "FAIL": 2}
    return order.get(status, 2)


def _command_version(command: list[str], cwd: Path | None = None) -> tuple[bool, str]:
    try:
        completed = subprocess.run(command, cwd=cwd, capture_output=True, text=True, check=False)
    except OSError as exc:
        return False, str(exc)

    output = (completed.stdout or completed.stderr).strip()
    if completed.returncode == 0:
        return True, output.splitlines()[0] if output else "available"
    return False, output or f"exit code {completed.returncode}"


def _check_binary(name: str, help_text: str, version_cmd: list[str]) -> CheckResult:
    binary = shutil.which(name)
    if binary is None:
        return CheckResult(
            name=name,
            status="FAIL",
            message=f"not found. Action: install {help_text}.",
        )
    ok, version = _command_version(version_cmd)
    if not ok:
        return CheckResult(name=name, status="WARN", message=f"found at {binary}, version check failed: {version}")
    return CheckResult(name=name, status="OK", message=f"{binary} ({version})")


def _port_is_occupied(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def _check_port(port: int) -> CheckResult:
    occupied = _port_is_occupied(port)
    if occupied:
        return CheckResult(
            name=f"port:{port}",
            status="WARN",
            message="occupied on 127.0.0.1 (may be expected if services are already running)",
        )
    return CheckResult(name=f"port:{port}", status="OK", message="free")


def _check_project_structure() -> list[CheckResult]:
    results: list[CheckResult] = []

    frontend = ROOT / "frontend"
    backend = ROOT / "backend"
    shared = ROOT / "shared"

    if frontend.exists() and (frontend / "package.json").exists():
        results.append(CheckResult("frontend", "OK", "frontend scaffold is present"))
    else:
        results.append(CheckResult("frontend", "FAIL", "frontend scaffold missing (expected frontend/package.json)"))

    if backend.exists() and (backend / "app" / "main.py").exists():
        results.append(CheckResult("backend", "OK", "backend scaffold is present"))
    else:
        results.append(CheckResult("backend", "FAIL", "backend scaffold missing (expected backend/app/main.py)"))

    if shared.exists():
        results.append(CheckResult("shared", "OK", "shared directory is present"))
    else:
        results.append(CheckResult("shared", "WARN", "shared directory missing"))

    node_modules = frontend / "node_modules"
    if node_modules.exists():
        results.append(CheckResult("frontend-deps", "OK", "node_modules found"))
    else:
        results.append(CheckResult("frontend-deps", "WARN", "node_modules not found (run install)"))

    backend_venv = backend / ".venv"
    if backend_venv.exists():
        results.append(CheckResult("backend-venv", "OK", "backend/.venv found"))
    else:
        fastapi_available = importlib.util.find_spec("fastapi") is not None
        if fastapi_available:
            results.append(CheckResult("backend-venv", "WARN", "backend/.venv missing, but fastapi is importable globally"))
        else:
            results.append(CheckResult("backend-venv", "WARN", "backend/.venv missing (run install)"))

    return results


def _check_backend_runtime() -> CheckResult:
    backend_python = ROOT / "backend" / ".venv" / "bin" / "python"
    if not backend_python.exists():
        return CheckResult(
            name="backend-runtime",
            status="WARN",
            message="backend venv python missing. Action: run 'python tools/control.py install'.",
        )

    check = subprocess.run(
        [
            str(backend_python),
            "-c",
            "import fastapi, jsonschema, pytest, uvicorn; print('runtime-ok')",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if check.returncode == 0:
        return CheckResult(name="backend-runtime", status="OK", message="fastapi/jsonschema/pytest/uvicorn importable")

    details = (check.stdout or check.stderr).strip() or f"exit code {check.returncode}"
    return CheckResult(
        name="backend-runtime",
        status="FAIL",
        message=f"dependency import failed. Action: reinstall backend dependencies. Details: {details}",
    )


def _check_playwright_browser() -> CheckResult:
    frontend_dir = ROOT / "frontend"
    if not (frontend_dir / "package.json").exists():
        return CheckResult(name="playwright", status="WARN", message="frontend/package.json missing; check skipped")

    npx = shutil.which("npx")
    if npx is None:
        return CheckResult(
            name="playwright",
            status="WARN",
            message="npx not found. Action: install Node.js/npm and rerun install.",
        )

    version_ok, version = _command_version([npx, "playwright", "--version"], cwd=frontend_dir)
    if not version_ok:
        return CheckResult(
            name="playwright",
            status="WARN",
            message="playwright cli unavailable. Action: run 'python tools/control.py install'.",
        )

    browser_cache = Path.home() / ".cache" / "ms-playwright"
    chromium_dirs = [path for path in browser_cache.glob("chromium-*") if path.is_dir()]
    if chromium_dirs:
        return CheckResult(
            name="playwright",
            status="OK",
            message=f"{version}; chromium browser cache present",
        )

    return CheckResult(
        name="playwright",
        status="WARN",
        message=f"{version}; chromium browser missing. Action: run 'python tools/control.py install'.",
    )


def run_checks() -> tuple[list[CheckResult], str]:
    checks: list[CheckResult] = [
        _check_binary("python3", "Python 3", ["python3", "--version"]),
        _check_binary("node", "Node.js (includes npm)", ["node", "--version"]),
        _check_binary("npm", "npm", ["npm", "--version"]),
        _check_binary("npx", "npm (includes npx)", ["npx", "--version"]),
        _check_binary("uv", "uv", ["uv", "--version"]),
        _check_port(5173),
        _check_port(8000),
    ]
    checks.extend(_check_project_structure())
    checks.append(_check_backend_runtime())
    checks.append(_check_playwright_browser())

    overall = "OK"
    for item in checks:
        if _status_priority(item.status) > _status_priority(overall):
            overall = item.status
    return checks, overall


def _print_report(checks: list[CheckResult], overall: str, previous: dict[str, str] | None = None) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"Doctor report at {timestamp}")
    for item in checks:
        logger.status(item.status, f"{item.name:<14} {item.message}")

    if previous is not None:
        changed = [f"{item.name}: {previous[item.name]} -> {item.status}" for item in checks if previous.get(item.name) != item.status]
        if changed:
            logger.info("Changes since previous run:")
            for line in changed:
                logger.info(f"- {line}")

    logger.status(overall, f"Overall status: {overall}")


def main(args: argparse.Namespace) -> int:
    interval = max(1, int(args.interval))

    if not args.watch:
        checks, overall = run_checks()
        _print_report(checks, overall)
        return 1 if overall == "FAIL" else 0

    previous_map: dict[str, str] | None = None
    logger.info(f"Doctor watch mode enabled (interval={interval}s). Press Ctrl+C to stop.")

    try:
        while True:
            checks, overall = run_checks()
            _print_report(checks, overall, previous_map)
            previous_map = {item.name: item.status for item in checks}
            time.sleep(interval)
    except KeyboardInterrupt:
        logger.info("Watch stopped by user")
        return 0
