from __future__ import annotations

from tools.tauri import common


def install(*, dry_run: bool) -> int:
    command = [
        "sudo",
        "apt-get",
        "install",
        "-y",
        "libwebkit2gtk-4.1-dev",
        "libgtk-3-dev",
        "librsvg2-dev",
        "libssl-dev",
        "libayatana-appindicator3-dev",
        "patchelf",
        "squashfs-tools",
        "desktop-file-utils",
        "file",
        "libfuse2",
    ]
    result = common.run_command(command, dry_run=dry_run)
    return common.print_result(result, "Debian Tauri system dependencies ready", "Debian system dependency install failed")
