from __future__ import annotations

import argparse

from tools import logger
from tools.tauri import build, copy, doctor, install, run, test
from tools.tauri.build import installappimage


def configure_parser(parser: argparse.ArgumentParser) -> None:
    parser.set_defaults(tauri_parser=parser)
    tauri_subparsers = parser.add_subparsers(dest="tauri_command", required=False)

    doctor_parser = tauri_subparsers.add_parser("doctor", help="Run Tauri diagnostics")
    doctor_parser.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    doctor_parser.add_argument("--watch", action="store_true", help="Run checks continuously")
    doctor_parser.add_argument("--interval", type=int, default=5, help="Seconds between checks in watch mode")

    install_parser = tauri_subparsers.add_parser("install", help="Install Tauri desktop dependencies")
    install_parser.add_argument("--dry-run", action="store_true", help="Print actions without running installers")
    install_parser.add_argument("--skip-system-deps", action="store_true", help="Skip OS package installation")
    install_parser.add_argument("--skip-rust", action="store_true", help="Skip Rust toolchain preparation")
    install_parser.add_argument("--skip-node", action="store_true", help="Skip Node/npm checks")
    install_parser.add_argument("--skip-frontend", action="store_true", help="Skip frontend dependency installation")

    install_appimage_parser = tauri_subparsers.add_parser(
        "install-appimage",
        help="Install the latest built AppImage locally",
    )
    install_appimage_parser.add_argument("--dry-run", action="store_true", help="Print install actions without writing files")

    run_parser = tauri_subparsers.add_parser("run", help="Start Tauri dev mode")
    run_parser.add_argument("--detach", action="store_true", help="Run in background and follow logs (default)")
    run_parser.add_argument("--foreground", action="store_true", help="Run in the current terminal")
    run_parser.add_argument("--no-follow", action="store_true", help="Return immediately after background start")
    run_parser.add_argument("--frontend-port", type=int, default=5173, help="Frontend dev server port")

    build_parser = tauri_subparsers.add_parser("build", help="Build Tauri desktop artifacts")
    build_parser.add_argument(
        "--target",
        choices=["linux", "windows", "windows-portable", "windows-cross-linux", "macos"],
        default="linux",
        help="Desktop build target",
    )
    build_parser.add_argument("--dry-run", action="store_true", help="Print build command without running it")
    build_parser.add_argument("--no-clean", action="store_true", help="Do not clean previous Tauri build output")
    build_parser.add_argument(
        "--bundles",
        help="Bundle types for Linux builds, e.g. deb,rpm or appimage. Default: deb,rpm,appimage",
    )
    build_parser.add_argument(
        "--appimage",
        action="store_true",
        help="Build the Linux AppImage and install it into the local desktop environment",
    )
    build_parser.add_argument(
        "--skip-appimage-preflight",
        action="store_true",
        help="Skip AppImage host-tool checks before running linuxdeploy",
    )

    test_parser = tauri_subparsers.add_parser("test", help="Run Tauri tooling checks")
    test_parser.add_argument("--doctor", action="store_true", help="Include doctor checks")
    test_parser.add_argument("--build-dry-run", action="store_true", help="Include build dry-run")
    test_parser.add_argument("--all", action="store_true", help="Run all Tauri checks")

    copy_parser = tauri_subparsers.add_parser("copy", help="Collect Tauri build artifacts")
    copy_parser.add_argument("--dry-run", action="store_true", help="Print copy actions without writing files")
    copy_parser.add_argument("--target-dir", help="Destination directory for copied artifacts")

    _prefix_subcommand_help_labels(tauri_subparsers)


def _prefix_subcommand_help_labels(subparsers: argparse._SubParsersAction) -> None:
    for choice_action in subparsers._choices_actions:
        if not choice_action.dest.startswith("--"):
            choice_action.dest = f"--{choice_action.dest}"
        if choice_action.metavar and not choice_action.metavar.startswith("--"):
            choice_action.metavar = f"--{choice_action.metavar}"


def main(args: argparse.Namespace) -> int:
    if getattr(args, "tauri_command", None) is None:
        tauri_parser = getattr(args, "tauri_parser", None)
        if tauri_parser is not None:
            tauri_parser.print_help()
            return 0
        logger.info("Use 'python tools/control.py tauri --help' to list Tauri commands.")
        return 0

    handlers = {
        "doctor": doctor.main,
        "install": install.main,
        "run": run.main,
        "build": build.main,
        "install-appimage": installappimage.main,
        "test": test.main,
        "copy": copy.main,
    }
    handler = handlers.get(getattr(args, "tauri_command", None))
    if handler is None:
        logger.fail(f"Unknown Tauri command: {getattr(args, 'tauri_command', None)}")
        return 1
    return handler(args)
