from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from tools import logger

ROOT = Path(__file__).resolve().parents[2]


@dataclass(slots=True)
class StepResult:
    name: str
    status: str
    message: str


def _run(cmd: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, check=False)


def _tail(text: str, limit: int = 8) -> str:
    lines = [line for line in text.strip().splitlines() if line.strip()]
    if not lines:
        return "(no output)"
    return " | ".join(lines[-limit:])


def _ensure_env_file() -> StepResult:
    env = ROOT / ".env"
    example = ROOT / ".env.example"

    if env.exists():
        return StepResult("env", "OK", ".env already exists (not modified)")

    if example.exists():
        shutil.copy2(example, env)
        return StepResult("env", "OK", "created .env from .env.example")

    env.write_text("FRONTEND_PORT=5173\nBACKEND_PORT=8000\nBACKEND_HOST=127.0.0.1\n", encoding="utf-8")
    return StepResult("env", "WARN", "created .env with fallback defaults (.env.example was missing)")


def _install_frontend() -> StepResult:
    frontend_dir = ROOT / "frontend"
    if not (frontend_dir / "package.json").exists():
        return StepResult("frontend", "FAIL", "missing frontend/package.json")

    npm = shutil.which("npm")
    if npm is None:
        return StepResult("frontend", "FAIL", "npm not found. Action: install Node.js and npm.")

    logger.info("Running frontend dependency installation (npm install --no-audit --no-fund)")
    started = time.monotonic()
    completed = _run([npm, "install", "--no-audit", "--no-fund"], cwd=frontend_dir)
    elapsed = time.monotonic() - started
    if completed.returncode == 0:
        return StepResult("frontend", "OK", f"npm install completed ({elapsed:.1f}s)")

    details = _tail((completed.stdout or "") + "\n" + (completed.stderr or ""))
    return StepResult("frontend", "FAIL", f"npm install failed after {elapsed:.1f}s: {details}")


def _ensure_backend_venv_with_uv(backend_dir: Path) -> subprocess.CompletedProcess[str]:
    return _run(["uv", "venv", str(backend_dir / ".venv")], cwd=ROOT)


def _install_backend_with_uv(backend_dir: Path) -> subprocess.CompletedProcess[str]:
    python_bin = backend_dir / ".venv" / "bin" / "python"
    return _run(["uv", "pip", "install", "--python", str(python_bin), "-r", str(backend_dir / "requirements.txt")], cwd=ROOT)


def _select_venv_seed_python() -> str:
    python3 = shutil.which("python3")
    if python3:
        return python3
    return sys.executable


def _create_backend_venv(venv_dir: Path, clear: bool) -> tuple[bool, str]:
    seed_python = _select_venv_seed_python()
    cmd = [seed_python, "-m", "venv"]
    if clear:
        cmd.append("--clear")
    cmd.append(str(venv_dir))

    started = time.monotonic()
    completed = _run(cmd, cwd=ROOT)
    elapsed = time.monotonic() - started
    if completed.returncode != 0:
        details = _tail((completed.stdout or "") + "\n" + (completed.stderr or ""))
        action = "venv rebuild" if clear else "venv creation"
        return False, f"{action} failed after {elapsed:.1f}s: {details}"

    if clear:
        logger.info(f"Backend virtualenv rebuilt in {elapsed:.1f}s (seed={seed_python})")
    else:
        logger.info(f"Backend virtualenv created in {elapsed:.1f}s (seed={seed_python})")
    return True, "venv ready"


def _read_venv_version(venv_dir: Path) -> str | None:
    cfg_path = venv_dir / "pyvenv.cfg"
    if not cfg_path.exists():
        return None

    try:
        text = cfg_path.read_text(encoding="utf-8")
    except OSError:
        return None

    for line in text.splitlines():
        if line.strip().startswith("version"):
            parts = line.split("=", 1)
            if len(parts) == 2:
                return parts[1].strip()
    return None


def _inspect_backend_venv(py: Path, venv_dir: Path) -> tuple[bool, str]:
    probe = (
        "import importlib.util, json, site, sys; "
        "payload={'runtime': f'{sys.version_info.major}.{sys.version_info.minor}', "
        "'site_packages': site.getsitepackages(), "
        "'has_pip': importlib.util.find_spec('pip') is not None}; "
        "print(json.dumps(payload))"
    )
    completed = _run([str(py), "-c", probe], cwd=ROOT)
    if completed.returncode != 0:
        details = _tail((completed.stdout or "") + "\n" + (completed.stderr or ""))
        return False, f"venv probe failed: {details}"

    try:
        state = json.loads(completed.stdout.strip().splitlines()[-1])
    except (IndexError, json.JSONDecodeError) as exc:
        return False, f"venv probe output could not be parsed: {exc}"

    runtime = str(state.get("runtime", ""))
    site_packages = [str(item) for item in state.get("site_packages", [])]
    has_pip = bool(state.get("has_pip"))

    if not runtime:
        return False, "venv probe did not return runtime version"

    configured_version = _read_venv_version(venv_dir)
    if configured_version and not configured_version.startswith(f"{runtime}."):
        return False, (
            f"venv interpreter mismatch: pyvenv.cfg version={configured_version}, "
            f"runtime={runtime}"
        )

    expected_token = f"python{runtime}"
    if not any(expected_token in path for path in site_packages):
        return False, (
            "venv site-packages mismatch: "
            f"runtime={runtime}, site_packages={site_packages or ['(none)']}"
        )

    if not has_pip:
        return False, "pip is missing in backend virtualenv"

    return True, "venv runtime is consistent"


def _rebuild_backend_venv(venv_dir: Path, reason: str) -> tuple[bool, str]:
    logger.info(f"Rebuilding backend virtualenv with --clear because {reason}")
    rebuilt, rebuild_msg = _create_backend_venv(venv_dir, clear=True)
    if not rebuilt:
        return False, rebuild_msg

    return True, "venv rebuilt"


def _ensure_backend_venv_consistency(py: Path, venv_dir: Path) -> tuple[bool, str]:
    logger.info("Checking backend virtualenv consistency")
    consistent, reason = _inspect_backend_venv(py, venv_dir)
    if consistent:
        return True, "venv is consistent"

    if "error while loading shared libraries" in reason:
        logger.warn("venv python shared library resolution failed; attempting rebuild with system python3")
        rebuilt, rebuild_msg = _rebuild_backend_venv(venv_dir, reason)
        if not rebuilt:
            return False, rebuild_msg
        consistent_after, reason_after = _inspect_backend_venv(py, venv_dir)
        if not consistent_after:
            return False, f"venv still inconsistent after rebuild: {reason_after}"
        logger.info("backend virtualenv repaired after shared library failure")
        return True, "venv repaired after shared library failure"

    if "pip is missing" in reason:
        logger.warn("pip is missing in backend virtualenv; attempting ensurepip repair")
        ensurepip = _run([str(py), "-m", "ensurepip", "--upgrade"], cwd=ROOT)
        if ensurepip.returncode == 0:
            consistent, repaired_reason = _inspect_backend_venv(py, venv_dir)
            if consistent:
                logger.info("pip successfully repaired in backend virtualenv")
                return True, "pip repaired via ensurepip"
            reason = repaired_reason
        else:
            details = _tail((ensurepip.stdout or "") + "\n" + (ensurepip.stderr or ""))
            reason = f"ensurepip repair failed: {details}"

    logger.warn(f"{reason}; attempting automatic rebuild repair")
    rebuilt, rebuild_msg = _rebuild_backend_venv(venv_dir, reason)
    if not rebuilt:
        return False, rebuild_msg

    consistent_after, reason_after = _inspect_backend_venv(py, venv_dir)
    if not consistent_after:
        return False, f"venv still inconsistent after rebuild: {reason_after}"

    logger.info("backend virtualenv consistency repaired")
    return True, "venv repaired"


def _install_backend_with_pip(backend_dir: Path) -> tuple[bool, str]:
    venv_dir = backend_dir / ".venv"
    if not venv_dir.exists():
        logger.info("Creating backend virtualenv")
        created, create_msg = _create_backend_venv(venv_dir, clear=False)
        if not created:
            return False, create_msg

    py = venv_dir / "bin" / "python"
    if not py.exists():
        return False, f"venv python not found at {py}"

    consistent, consistency_msg = _ensure_backend_venv_consistency(py, venv_dir)
    if not consistent:
        return False, consistency_msg

    logger.info("Upgrading pip in backend virtualenv")
    started = time.monotonic()
    pip_upgrade = _run([str(py), "-m", "pip", "install", "--upgrade", "pip"], cwd=ROOT)
    elapsed = time.monotonic() - started
    if pip_upgrade.returncode != 0:
        return False, f"pip upgrade failed after {elapsed:.1f}s: {_tail((pip_upgrade.stdout or '') + (pip_upgrade.stderr or ''))}"
    logger.info(f"pip upgrade completed in {elapsed:.1f}s")

    logger.info("Installing backend requirements")
    started = time.monotonic()
    pip_install = _run([str(py), "-m", "pip", "install", "-r", str(backend_dir / "requirements.txt")], cwd=ROOT)
    elapsed = time.monotonic() - started
    if pip_install.returncode != 0:
        return False, f"pip install failed after {elapsed:.1f}s: {_tail((pip_install.stdout or '') + (pip_install.stderr or ''))}"
    logger.info(f"Backend requirements installed in {elapsed:.1f}s")

    return True, "pip/venv backend install completed"


def _install_backend() -> StepResult:
    backend_dir = ROOT / "backend"
    requirements = backend_dir / "requirements.txt"

    if not requirements.exists():
        return StepResult("backend", "FAIL", "missing backend/requirements.txt")

    uv = shutil.which("uv")
    if uv is not None:
        logger.info("Trying backend installation via uv")
        uv_venv = _ensure_backend_venv_with_uv(backend_dir)
        if uv_venv.returncode == 0:
            logger.info("Installing backend requirements with uv")
            uv_install = _install_backend_with_uv(backend_dir)
            if uv_install.returncode == 0:
                return StepResult("backend", "OK", "installed dependencies with uv")

        logger.warn("uv path failed, switching to pip/venv fallback")
        pip_ok, pip_msg = _install_backend_with_pip(backend_dir)
        if pip_ok:
            return StepResult("backend", "WARN", "uv failed; pip fallback succeeded")
        uv_details = _tail((uv_venv.stdout or "") + "\n" + (uv_venv.stderr or ""))
        return StepResult("backend", "FAIL", f"uv path failed ({uv_details}); fallback failed: {pip_msg}")

    logger.info("uv not found; using pip/venv fallback for backend installation")
    pip_ok, pip_msg = _install_backend_with_pip(backend_dir)
    if pip_ok:
        return StepResult("backend", "WARN", "uv not found; used pip/venv fallback")
    return StepResult("backend", "FAIL", f"backend install failed without uv: {pip_msg}")


def _install_playwright() -> StepResult:
    frontend_dir = ROOT / "frontend"
    if not (frontend_dir / "package.json").exists():
        return StepResult("playwright", "FAIL", "missing frontend/package.json")

    npx = shutil.which("npx")
    if npx is None:
        return StepResult("playwright", "FAIL", "npx not found. Action: install Node.js and npm.")

    logger.info("Installing Playwright Chromium browser")
    started = time.monotonic()
    completed = _run([npx, "playwright", "install", "chromium"], cwd=frontend_dir)
    elapsed = time.monotonic() - started
    if completed.returncode == 0:
        return StepResult("playwright", "OK", f"Chromium installation completed ({elapsed:.1f}s)")

    details = _tail((completed.stdout or "") + "\n" + (completed.stderr or ""))
    return StepResult("playwright", "FAIL", f"playwright install failed after {elapsed:.1f}s: {details}")


def _print_summary(results: list[StepResult]) -> str:
    overall = "OK"
    for item in results:
        logger.status(item.status, f"{item.name:<12} {item.message}")
        if item.status == "FAIL":
            overall = "FAIL"
        elif item.status == "WARN" and overall != "FAIL":
            overall = "WARN"

    logger.status(overall, f"Overall status: {overall}")
    return overall


def main(args: argparse.Namespace) -> int:
    results: list[StepResult] = [_ensure_env_file()]

    if args.skip_frontend:
        results.append(StepResult("frontend", "OK", "skipped by flag"))
    else:
        results.append(_install_frontend())

    if args.skip_backend:
        results.append(StepResult("backend", "OK", "skipped by flag"))
    else:
        results.append(_install_backend())

    if args.skip_playwright:
        results.append(StepResult("playwright", "OK", "skipped by flag"))
    else:
        # Only attempt playwright setup if frontend install did not fail hard.
        frontend_failed = any(item.name == "frontend" and item.status == "FAIL" for item in results)
        if frontend_failed:
            results.append(StepResult("playwright", "WARN", "skipped because frontend install failed"))
        else:
            results.append(_install_playwright())

    overall = _print_summary(results)
    return 1 if overall == "FAIL" else 0
