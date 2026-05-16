from __future__ import annotations

import argparse
import os
import shutil
import zipfile
from pathlib import Path

from tools import logger
from tools.tauri import common, paths


def main(args: argparse.Namespace) -> int:
    dry_run = bool(getattr(args, "dry_run", False))
    host = common.host_os()
    if host not in {"windows", "linux"}:
        logger.fail("Windows portable build requires a Windows or Linux host.")
        return 1

    build_env: dict[str, str] | None = None
    runner: str | None = None
    if host == "linux":
        code, runner, build_env = _ensure_cargo_xwin(dry_run=dry_run)
        if code != 0:
            return code

    command = _build_command(host, runner=runner)
    common.print_build_plan("windows-portable", command, dry_run=dry_run, bundles="disabled")
    result = common.run_command(command, cwd=paths.ROOT, dry_run=dry_run, env=build_env)
    code = common.print_result(result, "Windows portable Tauri build completed", "Windows portable Tauri build failed")
    if code != 0:
        return code
    code = _zip_portable_binary(dry_run=dry_run)
    if code == 0 and dry_run:
        logger.info("📁 Dry-run finished; no new artifacts were created.")
    elif code == 0:
        common.print_build_artifacts()
    return code


def _ensure_cargo_xwin(*, dry_run: bool) -> tuple[int, str, dict[str, str]]:
    env = _env_with_cargo_bin()
    cargo_xwin = _find_cargo_xwin(env)
    if cargo_xwin is not None:
        logger.ok("cargo-xwin found")
        return 0, cargo_xwin, env

    cargo = shutil.which("cargo", path=env.get("PATH")) or ("cargo" if dry_run else None)
    if cargo is None:
        logger.fail("cargo not found. Action: install Rust before building Windows portable on Linux.")
        return 1, "cargo-xwin", env

    logger.info("cargo-xwin not found; installing it for the Windows portable build.")
    result = common.run_command([cargo, "install", "cargo-xwin"], dry_run=dry_run, env=env)
    code = common.print_result(result, "cargo-xwin ready", "cargo-xwin install failed")
    if code != 0:
        return code, "cargo-xwin", env

    if dry_run:
        return 0, str(_cargo_xwin_path()), env

    cargo_xwin = _find_cargo_xwin(env)
    if cargo_xwin is None:
        logger.fail(f"cargo-xwin install completed, but cargo-xwin was not found at {_cargo_xwin_path()}.")
        return 1, "cargo-xwin", env
    return 0, cargo_xwin, env


def _env_with_cargo_bin() -> dict[str, str]:
    env = os.environ.copy()
    cargo_bin = str(_cargo_bin_dir())
    env["PATH"] = f"{cargo_bin}{os.pathsep}{env.get('PATH', '')}"
    return env


def _find_cargo_xwin(env: dict[str, str]) -> str | None:
    return shutil.which("cargo-xwin", path=env.get("PATH"))


def _cargo_xwin_path() -> Path:
    suffix = ".exe" if os.name == "nt" else ""
    return _cargo_bin_dir() / f"cargo-xwin{suffix}"


def _cargo_bin_dir() -> Path:
    root = os.environ.get("CARGO_INSTALL_ROOT") or os.environ.get("CARGO_HOME")
    return (Path(root) if root else Path.home() / ".cargo") / "bin"


def _build_command(host: str, *, runner: str | None = None) -> list[str]:
    if host == "linux":
        return common.tauri_cli_command(
            "build",
            "--runner",
            runner or "cargo-xwin",
            "--target",
            "x86_64-pc-windows-msvc",
            "--no-bundle",
        )
    return common.tauri_cli_command("build", "--target", "x86_64-pc-windows-msvc", "--no-bundle")


def _zip_portable_binary(*, dry_run: bool) -> int:
    release_dir = paths.TAURI_DIR / "target" / "x86_64-pc-windows-msvc" / "release"
    zip_path = paths.DIST_DIR / f"{paths.APP_NAME}-windows-portable.zip"

    if dry_run:
        logger.info(f"DRY-RUN create portable ZIP {zip_path}")
        return 0

    candidates = _portable_exe_candidates(release_dir)
    if not candidates:
        logger.fail(f"No Windows executable found in {release_dir}")
        return 1

    paths.DIST_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for candidate in candidates:
            archive.write(candidate, arcname=candidate.name)
        archive.writestr(
            "README_PORTABLE.txt",
            "PORTABLE BUILD\n\n"
            f"- Run: {candidates[0].name}\n"
            "- This ZIP is provided without an installer.\n"
            "- Depending on the target machine, Microsoft Edge WebView2 Runtime may be required.\n",
        )
    logger.ok(f"Windows portable ZIP created at {zip_path.relative_to(paths.ROOT)}")
    return 0


def _portable_exe_candidates(release_dir: Path) -> list[Path]:
    candidates: list[Path] = []
    for candidate in sorted(path for path in release_dir.glob("*.exe") if path.is_file()):
        name = candidate.name.lower()
        if name.endswith("-setup.exe") or name.endswith("setup.exe"):
            continue
        if "uninstall" in name:
            continue
        candidates.append(candidate)
    return candidates
