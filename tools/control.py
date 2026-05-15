#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
import traceback
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.inst import build, doctor, install, run, run_test, stop
from tools import logger
from tools.tauri import control as tauri_control

Handler = Callable[[argparse.Namespace], int]


class ControlParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:  # type: ignore[override]
        if "required: command" in message:
            message = (
                "Please specify a command (e.g. --doctor, --install, --build, --run, --stop, or --test)."
            )
        usage_line = self.format_usage().strip()
        payload = [
            logger.format_message("INFO", usage_line),
            logger.format_message("FAIL", f"{self.prog}: {message}"),
        ]
        self.exit(1, "\n".join(payload) + "\n")


COMMAND_ALIASES: dict[str, str] = {
    "--doctor": "doctor",
    "--install": "install",
    "--build": "build",
    "--run": "run",
    "--stop": "stop",
    "--test": "test",
}

TAURI_COMMAND_ALIASES: dict[str, str] = {
    "--doctor": "doctor",
    "--install": "install",
    "--run": "run",
    "--build": "build",
    "--install-appimage": "install-appimage",
    "--test": "test",
    "--copy": "copy",
}


def _normalize_argv(argv: list[str] | None) -> list[str]:
    normalized = list(sys.argv[1:] if argv is None else argv)
    if not normalized:
        return normalized
    if len(normalized) >= 2 and normalized[0].lower() == "tauri":
        tauri_alias = TAURI_COMMAND_ALIASES.get(normalized[1].lower())
        if tauri_alias:
            normalized[1] = tauri_alias
            return normalized
    alias = COMMAND_ALIASES.get(normalized[0].lower())
    if alias:
        show_test_guide = normalized[0].lower() == "--test" and len(normalized) == 1
        normalized[0] = alias
        if show_test_guide:
            normalized.append("--suite-help")
    return normalized


def _build_parser() -> argparse.ArgumentParser:
    parser = ControlParser(
        prog="python tools/control.py",
        description="ImoCalc control CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    doctor_parser = subparsers.add_parser("doctor", help="Run system diagnostics")
    doctor_parser.add_argument("--watch", action="store_true", help="Run checks continuously")
    doctor_parser.add_argument(
        "--interval",
        type=int,
        default=5,
        help="Seconds between checks in watch mode",
    )

    install_parser = subparsers.add_parser("install", help="Install project dependencies")
    install_parser.add_argument("--skip-frontend", action="store_true", help="Skip frontend install")
    install_parser.add_argument("--skip-backend", action="store_true", help="Skip backend install")
    install_parser.add_argument("--skip-playwright", action="store_true", help="Skip Playwright setup")

    subparsers.add_parser("build", help="Build frontend web release")

    run_parser = subparsers.add_parser("run", help="Start frontend and backend services")
    run_parser.add_argument("--frontend-port", type=int, default=5173, help="Frontend port")
    run_parser.add_argument("--backend-port", type=int, default=8000, help="Backend port")
    run_parser.add_argument("--detach", action="store_true", help="Run in background")

    stop_parser = subparsers.add_parser("stop", help="Stop tracked services and stale listeners")
    stop_parser.add_argument("--frontend-port", type=int, default=5173, help="Frontend port cleanup target")
    stop_parser.add_argument("--backend-port", type=int, default=8000, help="Backend port cleanup target")
    stop_parser.add_argument(
        "--tracked-only",
        action="store_true",
        help="Only stop services recorded in tools/.runtime/run_state.json",
    )

    test_parser = subparsers.add_parser("test", help="Run test suites")
    test_parser.add_argument(
        "--suite",
        choices=["api", "schema", "frontend", "e2e", "all"],
        default="all",
        help="Test suite selection",
    )
    test_parser.add_argument(
        "--no-start",
        action="store_true",
        help="Do not start services automatically",
    )
    test_parser.add_argument(
        "--report",
        nargs="?",
        const="md",
        choices=["md", "markdown", "json", "all", "done"],
        help="Write a test report to .report, or use '--report done' to remove .report",
    )
    test_parser.add_argument(
        "--suite-help",
        action="store_true",
        help=argparse.SUPPRESS,
    )

    tauri_parser = subparsers.add_parser(
        "tauri",
        help="Manage Tauri desktop tooling",
        description="Manage Tauri desktop tooling",
    )
    tauri_control.configure_parser(tauri_parser)

    return parser


def _handlers() -> dict[str, Handler]:
    return {
        "doctor": doctor.main,
        "install": install.main,
        "build": build.main,
        "run": run.run_command,
        "stop": stop.main,
        "test": run_test.main,
        "tauri": tauri_control.main,
    }


def main(argv: list[str] | None = None) -> int:
    normalized_argv = _normalize_argv(argv)
    parser = _build_parser()
    args = parser.parse_args(normalized_argv)
    args.display_argv = list(sys.argv[1:] if argv is None else argv)

    handlers = _handlers()
    handler = handlers.get(args.command)
    if handler is None:
        logger.fail(f"Unknown command: {args.command}")
        return 1

    try:
        code = handler(args)
        return 0 if code is None else int(code)
    except KeyboardInterrupt:
        logger.warn("Interrupted by user")
        return 1
    except Exception as exc:  # pragma: no cover
        logger.fail(f"Unhandled error: {exc}")
        for line in traceback.format_exc().strip().splitlines():
            logger.info(line)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
