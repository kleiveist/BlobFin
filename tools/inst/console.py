from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTROL = ROOT / "tools" / "control.py"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools import logger


def _run_control(args: list[str]) -> int:
    command = [sys.executable, str(CONTROL), *args]
    logger.info(f"Executing: {' '.join(command)}")
    try:
        completed = subprocess.run(command, cwd=ROOT, check=False)
        status = "OK" if completed.returncode == 0 else "FAIL"
        logger.status(status, f"Command finished with exit code {completed.returncode}")
        return completed.returncode
    except KeyboardInterrupt:
        logger.warn("Execution interrupted by user")
        return 1


def _print_menu() -> None:
    print()
    print("ImoCalc Console UI")
    print("1) Doctor check")
    print("2) Install dependencies")
    print("3) Run services")
    print("4) Stop services")
    print("5) Test all suites")
    print("6) Test one suite")
    print("7) Exit")


def _prompt_suite() -> str | None:
    value = input("Suite (schema/api/e2e/all): ").strip().lower()
    if value not in {"schema", "api", "e2e", "all"}:
        logger.warn("Invalid suite value")
        return None
    return value


def main() -> int:
    logger.info("Console UI ready. Choose an action from the menu.")

    while True:
        _print_menu()
        choice = input("Select option: ").strip()

        if choice == "1":
            _run_control(["doctor"])
        elif choice == "2":
            _run_control(["install"])
        elif choice == "3":
            _run_control(["run"])
        elif choice == "4":
            _run_control(["stop"])
        elif choice == "5":
            _run_control(["test", "--suite", "all"])
        elif choice == "6":
            suite = _prompt_suite()
            if suite:
                _run_control(["test", "--suite", suite])
        elif choice == "7":
            logger.ok("Console UI closed")
            return 0
        else:
            logger.warn("Unknown option")


if __name__ == "__main__":
    raise SystemExit(main())
