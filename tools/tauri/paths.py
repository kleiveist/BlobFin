from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "ImoCalc"
APP_ID = "de.kleiveist.imocalc"

ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = ROOT / "frontend"
TAURI_DIR = ROOT / "src-tauri"
DIST_DIR = ROOT / ".dist" / "desktop"

FRONTEND_PACKAGE_JSON = FRONTEND_DIR / "package.json"
FRONTEND_PACKAGE_LOCK = FRONTEND_DIR / "package-lock.json"
FRONTEND_PNPM_LOCK = FRONTEND_DIR / "pnpm-lock.yaml"
TAURI_CONFIG = TAURI_DIR / "tauri.conf.json"


def local_tauri_binary() -> Path:
    binary_name = "tauri.cmd" if os.name == "nt" else "tauri"
    return FRONTEND_DIR / "node_modules" / ".bin" / binary_name


def bundle_roots() -> list[Path]:
    roots = [TAURI_DIR / "target" / "release" / "bundle"]
    target_root = TAURI_DIR / "target"
    if target_root.exists():
        roots.extend(sorted(target_root.glob("*/release/bundle")))
    return roots
