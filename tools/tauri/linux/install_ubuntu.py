from __future__ import annotations

from tools.tauri.linux import install_debian


def install(*, dry_run: bool) -> int:
    return install_debian.install(dry_run=dry_run)
