<!-- AUTO-GENERATED:backlink START -->
[← Back](tauri.md)
<!-- AUTO-GENERATED:backlink END -->
# Tauri Debug Guide

## Purpose
Use this page when `python tools/control.py tauri run` appears to hang, exits without opening a window, or prints a Tauri/npm/Rust error.

`tauri run` starts the desktop app in development mode. It is not the same as `tauri test`.

## Fast Debug Start
Run the app and watch the log:

```bash
python tools/control.py tauri run
```

This is the default behavior. The command starts Tauri in the background and streams `tools/.runtime/logs/tauri.log` in the same terminal.
Press Ctrl+C to stop Tauri and its child processes.

The explicit detached form is still accepted:

```bash
python tools/control.py tauri run --detach
```

To start in the background without following the log:

```bash
python tools/control.py tauri run --no-follow
tail -f tools/.runtime/logs/tauri.log
```

## Foreground Start
Use foreground mode when you want the command to own the terminal:

```bash
python tools/control.py tauri run --foreground
```

Expected behavior:
- npm starts the Vite frontend.
- Cargo compiles the Tauri Rust shell.
- A desktop window opens when the dev build is ready.

The first run can take several minutes because Rust dependencies are compiled.
Later runs are usually much faster.

## Check Environment First
Before debugging a runtime issue, run:

```bash
python tools/control.py tauri doctor
python tools/control.py tauri test --all
```

Use JSON output when you want machine-readable diagnostics:

```bash
python tools/control.py tauri doctor --json
```

## Detached Runtime Files
Detached mode writes:

```text
tools/.runtime/logs/tauri.log
tools/.runtime/tauri_run_state.json
```

Show the tracked detached process:

```bash
cat tools/.runtime/tauri_run_state.json
```

When `tauri run` is following logs, Ctrl+C stops the tracked Tauri process group.

Stop a `--no-follow` process manually if needed:

```bash
kill <pid>
```

Replace `<pid>` with the value from `tools/.runtime/tauri_run_state.json`.

## Port Conflicts
Default frontend port:

```text
5173
```

If the port is already occupied, start Tauri with another frontend port:

```bash
python tools/control.py tauri run --frontend-port 5174
```

In detached mode:

```bash
python tools/control.py tauri run --frontend-port 5174
```

## Common Error Patterns

### npm cannot find frontend/package.json
Example:

```text
frontend/frontend/package.json
```

This means the Tauri dev command is running from the wrong working directory or using an outdated `beforeDevCommand`.
The expected command inside Tauri config is:

```bash
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```

### npm could not determine executable to run
The fallback must use the Tauri CLI package explicitly:

```bash
npm exec --yes --package @tauri-apps/cli@2.10.1 -- tauri dev
```

If this fails, run:

```bash
python tools/control.py tauri install
```

### Rust compile takes a long time
This is normal on the first run.
Generated Rust build output is written under:

```text
src-tauri/target/
```

Do not commit this directory.

### Tauri generated files appear
Tauri can generate local build/runtime files under:

```text
src-tauri/gen/
src-tauri/target/
```

These are local artifacts and should remain ignored by Git.
`src-tauri/Cargo.lock` is different: it should stay tracked for reproducible desktop builds.

### WebKitGTK or AppIndicator missing
On Linux, run:

```bash
python tools/control.py tauri doctor
python tools/control.py tauri install --dry-run
python tools/control.py tauri install
```

If your distribution is not detected automatically, install the package families listed by `tauri doctor` manually.

### Linux AppImage bundling fails at linuxdeploy
Default Linux builds create Debian, RPM and AppImage bundles:

```bash
python tools/control.py tauri build --target linux
```

This maps to:

```bash
tauri build --bundles deb,rpm,appimage
```

Use Debian/RPM only when you want to avoid AppImage bundling:

```bash
python tools/control.py tauri build --target linux --bundles deb,rpm
```

Build AppImage explicitly only when `linuxdeploy` works on the host:

```bash
python tools/control.py tauri build --target linux --bundles appimage
```

Build and install the AppImage into the local desktop environment:

```bash
python tools/control.py tauri build --appimage
```

If the command reports missing AppImage prerequisites, install the host packages first. On Arch/CachyOS:

```bash
sudo pacman -S --needed patchelf squashfs-tools desktop-file-utils fuse2 file
```

On Debian/Ubuntu:

```bash
sudo apt-get install -y patchelf squashfs-tools desktop-file-utils file libfuse2
```

When running from VS Code Flatpak, the tool checks both the sandbox and host paths under `/run/host`.
If your host uses a custom AppImage setup and you want to try the build anyway:

```bash
python tools/control.py tauri build --appimage --skip-appimage-preflight
```

If Tauri leaves a `BlobFin.AppDir` behind but no final `.AppImage`, the tooling can repair the AppDir icon name and package the existing AppDir with the cached AppImage plugin.

This installs:

```text
~/Applications/BlobFin.AppImage
~/.local/share/applications/blobfin.desktop
```

Install an already-built AppImage without rebuilding:

```bash
python tools/control.py tauri install-appimage
python tools/control.py tauri install-appimage --dry-run
```

This command only installs the latest AppImage from `src-tauri/target/release/bundle/appimage/`.
It does not rebuild the app. If only `BlobFin.AppDir` exists, it packages that existing AppDir first and then installs the resulting AppImage.

If AppImage fails but deb/rpm were already created, collect available artifacts with:

```bash
python tools/control.py tauri copy
```

## What tauri test Does
This command checks tooling and project structure:

```bash
python tools/control.py tauri test
```

It does not open the desktop app.

For the desktop app window, use:

```bash
python tools/control.py tauri run
```

For a dry-run build check:

```bash
python tools/control.py tauri test --build-dry-run
```

## Useful Debug Bundle
When reporting a Tauri issue, collect:

```bash
python tools/control.py tauri doctor
python tools/control.py tauri test --all
tail -n 120 tools/.runtime/logs/tauri.log
```

Also include:
- the exact command you ran
- whether the desktop window opened
- the first visible error line
- your operating system and package manager
