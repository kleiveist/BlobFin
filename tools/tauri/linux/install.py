from __future__ import annotations

from pathlib import Path

from tools import logger
from tools.tauri import common
from tools.tauri.linux import install_arch, install_debian, install_ubuntu


def install_system_dependencies(*, dry_run: bool) -> int:
    if common.host_os() != "linux":
        logger.info("System dependency install skipped on non-Linux host")
        return 0

    distro = _detect_distro()
    if distro in {"ubuntu"}:
        return install_ubuntu.install(dry_run=dry_run)
    if distro in {"debian"}:
        return install_debian.install(dry_run=dry_run)
    if distro in {"arch", "manjaro"}:
        return install_arch.install(dry_run=dry_run)

    logger.warn(f"Unsupported Linux distribution for automatic Tauri deps: {distro or 'unknown'}")
    logger.info("Install WebKitGTK, GTK3, librsvg, OpenSSL, AppIndicator, patchelf, squashfs-tools and fuse2 manually.")
    return 0


def appimage_install_hint() -> str:
    distro = _detect_distro()
    if distro in {"arch", "manjaro"}:
        return "sudo pacman -S --needed patchelf squashfs-tools desktop-file-utils fuse2 file"
    if distro == "ubuntu":
        return "sudo apt-get install -y patchelf squashfs-tools desktop-file-utils file libfuse2"
    if distro == "debian":
        return "sudo apt-get install -y patchelf squashfs-tools desktop-file-utils file libfuse2"
    return "Install patchelf, squashfs-tools, desktop-file-utils, file and libfuse2/fuse2 for your distribution."


def _detect_distro() -> str | None:
    for os_release in (Path("/run/host/etc/os-release"), Path("/etc/os-release")):
        if not os_release.exists():
            continue
        distro = _distro_from_os_release(os_release)
        if distro:
            return distro
    return None


def _distro_from_os_release(os_release: Path) -> str | None:
    values: dict[str, str] = {}
    for line in os_release.read_text(encoding="utf-8", errors="ignore").splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.lower()] = value.strip().strip('"').lower()
    distro_id = values.get("id")
    like = values.get("id_like", "")
    if distro_id in {"ubuntu", "debian", "arch", "manjaro"}:
        return distro_id
    if distro_id in {"cachyos", "endeavouros"} or "arch" in like:
        return "arch"
    if "ubuntu" in like:
        return "ubuntu"
    if "debian" in like:
        return "debian"
    if distro_id:
        return distro_id
    return None
