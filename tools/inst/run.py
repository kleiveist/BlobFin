from __future__ import annotations

import argparse
import json
import os
import queue
import shutil
import signal
import socket
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from tools import logger

ROOT = Path(__file__).resolve().parents[2]
RUNTIME_DIR = ROOT / "tools" / ".runtime"
LOG_DIR = RUNTIME_DIR / "logs"
STATE_FILE = RUNTIME_DIR / "run_state.json"


@dataclass(slots=True)
class ServiceDef:
    name: str
    command: list[str]
    cwd: Path
    port: int


def _port_is_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def _is_process_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _read_state() -> dict | None:
    if not STATE_FILE.exists():
        return None
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _write_state(payload: dict) -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _clear_state() -> None:
    try:
        STATE_FILE.unlink(missing_ok=True)
    except OSError:
        pass


def _build_service_defs(frontend_port: int, backend_port: int) -> tuple[list[ServiceDef], list[str]]:
    errors: list[str] = []
    services: list[ServiceDef] = []

    frontend_dir = ROOT / "frontend"
    backend_dir = ROOT / "backend"

    if not (frontend_dir / "package.json").exists():
        errors.append("Missing frontend/package.json")
    if not (backend_dir / "app" / "main.py").exists():
        errors.append("Missing backend/app/main.py")

    npm = shutil.which("npm")
    if npm is None:
        errors.append("npm not found. Action: install Node.js and npm.")

    backend_python = backend_dir / ".venv" / "bin" / "python"
    if not backend_python.exists():
        backend_python = Path(shutil.which("python3") or shutil.which("python") or "")
    if not backend_python.exists():
        errors.append("Python executable not found for backend service.")
    else:
        probe = subprocess.run(
            [str(backend_python), "-c", "import uvicorn"],
            capture_output=True,
            text=True,
            check=False,
        )
        if probe.returncode != 0:
            details = ((probe.stderr or "") + "\n" + (probe.stdout or "")).strip()
            if not details:
                details = f"exit code {probe.returncode}"
            errors.append(
                "Backend runtime is not executable. Action: run "
                "'python tools/control.py install --skip-frontend --skip-playwright'. "
                f"Details: {details}"
            )

    if errors:
        return services, errors

    services.append(
        ServiceDef(
            name="frontend",
            command=[npm, "run", "dev", "--", "--host", "127.0.0.1", "--port", str(frontend_port)],
            cwd=frontend_dir,
            port=frontend_port,
        )
    )

    services.append(
        ServiceDef(
            name="backend",
            command=[str(backend_python), "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(backend_port)],
            cwd=backend_dir,
            port=backend_port,
        )
    )

    return services, errors


def _terminate_pid(pid: int, timeout_seconds: int = 8) -> bool:
    if not _is_process_alive(pid):
        return True

    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        return True

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if not _is_process_alive(pid):
            return True
        time.sleep(0.2)

    try:
        os.kill(pid, signal.SIGKILL)
    except OSError:
        return True

    return not _is_process_alive(pid)


def _stop_from_state(print_output: bool = True) -> int:
    state = _read_state()
    if not state or "services" not in state:
        if print_output:
            logger.ok("No tracked services are running")
        _clear_state()
        return 0

    failures = 0
    for service in state.get("services", []):
        pid = int(service.get("pid", -1))
        name = str(service.get("name", "unknown"))
        if pid <= 0:
            continue
        ok = _terminate_pid(pid)
        if print_output:
            status = "OK" if ok else "FAIL"
            logger.status(status, f"stop:{name:<10} pid={pid}")
        if not ok:
            failures += 1

    _clear_state()
    return 1 if failures else 0


def _state_has_live_processes() -> bool:
    state = _read_state()
    if not state:
        return False

    for service in state.get("services", []):
        pid = int(service.get("pid", -1))
        if pid > 0 and _is_process_alive(pid):
            return True

    _clear_state()
    return False


def _preflight(frontend_port: int, backend_port: int) -> list[str]:
    errors: list[str] = []

    if _state_has_live_processes():
        errors.append("Tracked services are already running. Use 'python tools/control.py stop' first.")

    for port in (frontend_port, backend_port):
        if not _port_is_free(port):
            errors.append(f"Port {port} is already occupied.")

    return errors


def _start_detached(services: list[ServiceDef]) -> tuple[list[subprocess.Popen], dict]:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    payload = {"created_at": int(time.time()), "services": []}
    processes: list[subprocess.Popen] = []

    for service in services:
        log_path = LOG_DIR / f"{service.name}.log"
        log_file = log_path.open("a", encoding="utf-8")
        process = subprocess.Popen(
            service.command,
            cwd=service.cwd,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
            start_new_session=True,
        )
        log_file.close()
        processes.append(process)
        payload["services"].append(
            {
                "name": service.name,
                "pid": process.pid,
                "port": service.port,
                "command": service.command,
                "log_file": str(log_path.relative_to(ROOT)),
            }
        )

    _write_state(payload)
    return processes, payload


def _start_foreground(services: list[ServiceDef]) -> tuple[list[subprocess.Popen], dict]:
    payload = {"created_at": int(time.time()), "services": []}
    processes: list[subprocess.Popen] = []

    for service in services:
        process = subprocess.Popen(
            service.command,
            cwd=service.cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            start_new_session=True,
        )
        processes.append(process)
        payload["services"].append(
            {
                "name": service.name,
                "pid": process.pid,
                "port": service.port,
                "command": service.command,
                "log_file": None,
            }
        )

    _write_state(payload)
    return processes, payload


def _stream_foreground(payload: dict, processes: list[subprocess.Popen]) -> int:
    q: queue.Queue[tuple[str, str]] = queue.Queue()

    def reader(name: str, process: subprocess.Popen) -> None:
        assert process.stdout is not None
        for line in process.stdout:
            q.put((name, line.rstrip()))

    threads = []
    for item, process in zip(payload["services"], processes):
        t = threading.Thread(target=reader, args=(item["name"], process), daemon=True)
        t.start()
        threads.append(t)

    logger.info("Services started. Press Ctrl+C to stop.")

    while True:
        try:
            name, line = q.get(timeout=0.2)
            logger.info(f"{name}: {line}")
        except queue.Empty:
            pass

        for item, process in zip(payload["services"], processes):
            code = process.poll()
            if code is not None:
                if code == 0:
                    logger.warn(f"Service exited: {item['name']} (code={code})")
                else:
                    logger.fail(f"Service crashed: {item['name']} (code={code})")
                return 1


def run_command(args: argparse.Namespace) -> int:
    frontend_port = int(args.frontend_port)
    backend_port = int(args.backend_port)

    preflight_errors = _preflight(frontend_port, backend_port)
    if preflight_errors:
        for err in preflight_errors:
            logger.fail(err)
        return 1

    services, errors = _build_service_defs(frontend_port, backend_port)
    if errors:
        for err in errors:
            logger.fail(err)
        return 1

    if args.detach:
        processes, payload = _start_detached(services)
        time.sleep(2)

        for item, process in zip(payload["services"], processes):
            code = process.poll()
            if code is not None:
                logger.fail(f"Service failed early: {item['name']} (code={code})")
                _stop_from_state(print_output=False)
                return 1

        logger.ok("Services started in detached mode")
        for item in payload["services"]:
            logger.ok(
                f"service:{item['name']:<9} pid={item['pid']} port={item['port']} log={item['log_file']}"
            )
        return 0

    processes, payload = _start_foreground(services)
    try:
        return _stream_foreground(payload, processes)
    except KeyboardInterrupt:
        logger.warn("Interrupted by user")
        return 0
    finally:
        _stop_from_state(print_output=True)


def stop_command(args: argparse.Namespace) -> int:
    _ = args
    return _stop_from_state(print_output=True)
