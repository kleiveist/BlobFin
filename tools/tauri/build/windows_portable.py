from __future__ import annotations

import argparse
import zipfile

from tools import logger
from tools.tauri import common, paths


def main(args: argparse.Namespace) -> int:
    dry_run = bool(getattr(args, "dry_run", False))
    if common.host_os() != "windows" and not dry_run:
        logger.fail("Windows portable build requires a Windows host. Use windows-cross-linux on Linux.")
        return 1
    command = common.tauri_cli_command("build", "--target", "x86_64-pc-windows-msvc", "--bundles", "none")
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


def _zip_portable_binary(*, dry_run: bool) -> int:
    release_dir = paths.TAURI_DIR / "target" / "x86_64-pc-windows-msvc" / "release"
    zip_path = paths.DIST_DIR / f"{paths.APP_NAME}-windows-portable.zip"

    if dry_run:
        logger.info(f"DRY-RUN create portable ZIP {zip_path}")
        return 0

    candidates = sorted(path for path in release_dir.glob("*.exe") if path.is_file())
    if not candidates:
        logger.fail(f"No Windows executable found in {release_dir}")
        return 1

    paths.DIST_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for candidate in candidates:
            archive.write(candidate, arcname=candidate.name)
    logger.ok(f"Windows portable ZIP created at {zip_path.relative_to(paths.ROOT)}")
    return 0
