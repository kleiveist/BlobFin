from __future__ import annotations

import argparse
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

    if host == "linux":
        code = _ensure_cargo_xwin(dry_run=dry_run)
        if code != 0:
            return code

    command = _build_command(host)
    common.print_build_plan("windows-portable", command, dry_run=dry_run, bundles="none")
    result = common.run_command(command, cwd=paths.ROOT, dry_run=dry_run)
    code = common.print_result(result, "Windows portable Tauri build completed", "Windows portable Tauri build failed")
    if code != 0:
        return code
    code = _zip_portable_binary(dry_run=dry_run)
    if code == 0 and dry_run:
        logger.info("📁 Dry-run finished; no new artifacts were created.")
    elif code == 0:
        common.print_build_artifacts()
    return code


def _ensure_cargo_xwin(*, dry_run: bool) -> int:
    if shutil.which("cargo-xwin") is not None:
        logger.ok("cargo-xwin found")
        return 0

    cargo = shutil.which("cargo") or ("cargo" if dry_run else None)
    if cargo is None:
        logger.fail("cargo not found. Action: install Rust before building Windows portable on Linux.")
        return 1

    logger.info("cargo-xwin not found; installing it for the Windows portable build.")
    result = common.run_command([cargo, "install", "cargo-xwin"], dry_run=dry_run)
    return common.print_result(result, "cargo-xwin ready", "cargo-xwin install failed")


def _build_command(host: str) -> list[str]:
    if host == "linux":
        return common.tauri_cli_command(
            "build",
            "--runner",
            "cargo-xwin",
            "--target",
            "x86_64-pc-windows-msvc",
            "--bundles",
            "none",
        )
    return common.tauri_cli_command("build", "--target", "x86_64-pc-windows-msvc", "--bundles", "none")


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
