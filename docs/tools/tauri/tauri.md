<!-- AUTO-GENERATED:backlink START -->
[← Back](../tools.md)
<!-- AUTO-GENERATED:backlink END -->
# Tauri Desktop Tooling

<!-- AUTO-GENERATED:docs-index START -->

## 📄 Pages
- 📝 [Tauri Debug Guide](Debug.md)

<!-- AUTO-GENERATED:docs-index END -->

## Purpose
The Tauri tooling adds a desktop shell around the existing BlobFin Vite/TypeScript frontend.
It does not create a second frontend. All desktop commands are routed through the existing control CLI.

## Important Syntax
Tauri commands are subcommands, not top-level `--tauri` aliases.

Use:
```bash
python tools/control.py tauri <command> [options]
```

Show the Tauri command overview:
```bash
python tools/control.py tauri
python tools/control.py tauri --help
```

Do not use:
```bash
python tools/control.py --tauri
python tools/control.py --tauri run
python tools/control.py --build
```

## Command Overview
```bash
python tools/control.py tauri doctor
python tools/control.py tauri --doctor
python tools/control.py tauri install
python tools/control.py tauri --install
python tools/control.py tauri install --dry-run
python tools/control.py tauri run
python tools/control.py tauri --run
python tools/control.py tauri run --detach
python tools/control.py tauri run --foreground
python tools/control.py tauri run --no-follow
python tools/control.py tauri build
python tools/control.py tauri --build
python tools/control.py tauri build --target linux
python tools/control.py tauri build --target linux --bundles deb,rpm
python tools/control.py tauri build --target linux --bundles appimage
python tools/control.py tauri build --appimage
python tools/control.py tauri install-appimage
python tools/control.py tauri build --target windows
python tools/control.py tauri build --target windows-portable
python tools/control.py tauri build --target windows-cross-linux
python tools/control.py tauri build --target macos
python tools/control.py tauri test
python tools/control.py tauri copy
```

## Legacy / Shorthand Mapping
These are the intended equivalents for older shorthand-style command names:

| Wanted action | Use this command |
| --- | --- |
| `--doctor` for desktop tooling | `python tools/control.py tauri doctor` |
| `--install` for desktop tooling | `python tools/control.py tauri install` |
| `--install --dry-run` for desktop tooling | `python tools/control.py tauri install --dry-run` |
| `--tauri` | `python tools/control.py tauri --help` |
| `--tauri run` | `python tools/control.py tauri run` |
| `--build` for desktop tooling | `python tools/control.py tauri build` |
| install already-built AppImage | `python tools/control.py tauri install-appimage` |
| copy build artifacts | `python tools/control.py tauri copy` |

Inside the `tauri` command, option-style aliases are accepted:
```bash
python tools/control.py tauri --doctor
python tools/control.py tauri --install
python tools/control.py tauri --run
python tools/control.py tauri --build
python tools/control.py tauri --install-appimage
python tools/control.py tauri --test
python tools/control.py tauri --copy
```

The existing web/API aliases still exist separately:
```bash
python tools/control.py --doctor
python tools/control.py --install
python tools/control.py --run
python tools/control.py --test
python tools/control.py --stop
```

## Tauri Doctor
```bash
python tools/control.py tauri doctor
python tools/control.py tauri doctor --json
python tools/control.py tauri doctor --watch
python tools/control.py tauri doctor --watch --interval 5
```

Checks include:
- Git and curl
- Node.js, npm, pnpm and Corepack
- Rustup, rustc, cargo and active Rust toolchain
- Local Tauri CLI
- `src-tauri/`
- `frontend/package.json`
- optional `frontend/dist`
- frontend dev port `5173`
- Linux desktop libraries where applicable
- Windows MSVC toolchain where applicable
- macOS Xcode command line tools where applicable

`--json` prints machine-readable JSON for tooling and tests.

## Tauri Install
```bash
python tools/control.py tauri install
python tools/control.py tauri install --dry-run
python tools/control.py tauri install --skip-system-deps
python tools/control.py tauri install --skip-rust
python tools/control.py tauri install --skip-node
python tools/control.py tauri install --skip-frontend
```

Install prepares:
- Linux system dependencies, when running on a supported Linux distribution
- Rust stable toolchain, when Rustup is available
- Node.js/npm presence
- frontend dependencies
- existing `src-tauri/` scaffold validation

Use this first when preparing desktop development:
```bash
python tools/control.py tauri install --dry-run
python tools/control.py tauri install
```

Install Tauri prerequisites only as a dry-run:
```bash
python tools/control.py tauri install --dry-run
```

Install Tauri prerequisites while skipping Linux system packages:
```bash
python tools/control.py tauri install --skip-system-deps
```

## Linux System Dependencies
The Linux installer detects Arch, Debian and Ubuntu style systems.
It installs or checks packages needed by Tauri WebView builds:
- WebKitGTK
- GTK3
- librsvg
- OpenSSL
- AppIndicator / Ayatana AppIndicator
- AppImage packaging tools: patchelf, squashfs-tools, desktop-file-utils, file and libfuse2/fuse2

For unsupported distributions, the command prints a warning and lists the required package families.

## Tauri Run / Dev Mode
```bash
python tools/control.py tauri run
python tools/control.py tauri run --detach
python tools/control.py tauri run --foreground
python tools/control.py tauri run --no-follow
python tools/control.py tauri run --frontend-port 5174
```

Behavior:
- Starts Tauri dev mode from the repository root.
- Uses the existing Vite frontend from `frontend/`.
- Uses `src-tauri/` as the desktop shell.
- `--frontend-port` overrides both the Tauri dev URL and the Vite dev-server port.
- Background mode with log streaming is the default.
- `--detach` is accepted for explicit background mode with log streaming.
- `--no-follow` starts in the background and returns immediately.
- `--foreground` runs Tauri in the current terminal.
- Press Ctrl+C in the default log stream to stop Tauri and its child processes.

For detached-mode log debugging, see [Debug.md](Debug.md).

## Tauri Build
```bash
python tools/control.py tauri build
python tools/control.py tauri build --dry-run
python tools/control.py tauri build --target linux
python tools/control.py tauri build --appimage
python tools/control.py tauri build --target windows
python tools/control.py tauri build --target windows-portable
python tools/control.py tauri build --target windows-cross-linux
python tools/control.py tauri build --target macos
```

Targets:
- `linux`: default Linux bundle build with `deb,rpm,appimage`
- `windows`: Windows installer build on Windows hosts
- `windows-portable`: Windows portable executable ZIP flow
- `windows-cross-linux`: optional Windows cross-build from Linux with `cargo-xwin`
- `macos`: macOS app or DMG build on macOS hosts

Linux bundle selection:
- Default: `--bundles deb,rpm,appimage`
- Debian/RPM only: `--bundles deb,rpm`
- AppImage only: `--bundles appimage`
- All Linux bundles: `--bundles deb,rpm,appimage`
- Build and locally install AppImage: `--appimage`

The default Linux target now includes AppImage. If you want the previous package-only behavior, run:

```bash
python tools/control.py tauri build --target linux --bundles deb,rpm
```

Use this command when you want to build the AppImage and immediately install it locally:

```bash
python tools/control.py tauri build --appimage
python tools/control.py tauri build --appimage --skip-appimage-preflight
```

Before starting the long AppImage build, the command checks for common `linuxdeploy` requirements:
- `patchelf`
- `mksquashfs` from `squashfs-tools`
- `desktop-file-validate` from `desktop-file-utils`
- `file`
- `libfuse.so.2` from `libfuse2` / `fuse2`

When running from VS Code Flatpak, the preflight also checks host paths such as `/run/host/usr/bin` and `/run/host/usr/lib`.

On Arch/CachyOS, install those packages with:

```bash
sudo pacman -S --needed patchelf squashfs-tools desktop-file-utils fuse2 file
```

On Debian/Ubuntu:

```bash
sudo apt-get install -y patchelf squashfs-tools desktop-file-utils file libfuse2
```

If you know the host has a non-standard AppImage setup, bypass only the preflight check with:

```bash
python tools/control.py tauri build --appimage --skip-appimage-preflight
```

If Tauri creates `BlobFin.AppDir` but `linuxdeploy` fails before writing the final `.AppImage`, the tooling repairs the AppDir icon name and packages the existing AppDir with the cached AppImage plugin. This handles the common mismatch where the desktop file expects `Icon=blobfin` but the generated file is named `BlobFin.png`.

The AppImage install step copies the newest generated AppImage to:

```text
~/Applications/BlobFin.AppImage
```

It also copies the best available icon to the local icon directory and writes:

```text
~/.local/share/applications/blobfin.desktop
```

## Tauri Install AppImage
```bash
python tools/control.py tauri install-appimage
python tools/control.py tauri install-appimage --dry-run
python tools/control.py tauri --install-appimage
python tools/control.py tauri --install-appimage --dry-run
```

Purpose:
- installs an already-built AppImage without rebuilding
- creates or updates the local desktop entry
- copies the best available BlobFin icon into the local icon directory
- marks the installed AppImage executable

Prerequisite:
An AppImage must already exist under:

```text
src-tauri/target/release/bundle/appimage/
```

Create one with one of these commands:

```bash
python tools/control.py tauri build --target linux
python tools/control.py tauri build --target linux --bundles appimage
python tools/control.py tauri build --appimage
```

Install target paths:

```text
~/Applications/BlobFin.AppImage
~/.local/share/icons/blobfin.png
~/.local/share/applications/blobfin.desktop
```

What it does not do:
- it does not run `tauri build`
- it does not call `linuxdeploy`
- it does not install system packages
- it does not copy `.deb` or `.rpm` artifacts

If the final `.AppImage` is missing but `BlobFin.AppDir` exists, the command packages that existing AppDir first and then installs the resulting AppImage. It still does not rebuild the app.

Use `--dry-run` to inspect the install actions:

```bash
python tools/control.py tauri install-appimage --dry-run
```

Build output includes a short plan before the command runs and an artifact list after a successful build:
- target and mode, for example `Build target: linux (build)`
- selected bundles, for example `Bundles: deb,rpm`
- resolved Tauri command
- working directory
- generated artifacts with file-type icons and sizes

Use `--dry-run` before running a real build:
```bash
python tools/control.py tauri build --target linux --dry-run
python tools/control.py tauri build --target linux --bundles deb,rpm --dry-run
python tools/control.py tauri build --target linux --bundles appimage --dry-run
python tools/control.py tauri build --appimage --dry-run
python tools/control.py tauri build --target windows-portable --dry-run
```

## Tauri Copy / Build Artifacts
```bash
python tools/control.py tauri copy
python tools/control.py tauri copy --dry-run
python tools/control.py tauri copy --target-dir .dist/desktop
```

Copy searches Tauri bundle output under:
```text
src-tauri/target/release/bundle/
src-tauri/target/<target>/release/bundle/
```

Default target directory:
```text
.dist/desktop/
```

The target can also be configured through:
```bash
IMOCALC_TAURI_ARTIFACT_DIR=/path/to/output python tools/control.py tauri copy
```

## Tauri Test
```bash
python tools/control.py tauri test
python tools/control.py tauri test --doctor
python tools/control.py tauri test --build-dry-run
python tools/control.py tauri test --all
```

Default checks:
- `frontend/package.json` exists
- `src-tauri/` exists
- `src-tauri/tauri.conf.json` exists and is valid JSON
- `src-tauri/Cargo.toml` exists
- `src-tauri/src/main.rs` exists

Optional checks:
- `--doctor`: also runs Tauri doctor checks
- `--build-dry-run`: also runs a Linux build dry-run
- `--all`: combines optional checks

## Recommended Workflows
First-time desktop setup:
```bash
python tools/control.py tauri doctor
python tools/control.py tauri install --dry-run
python tools/control.py tauri install
```

Desktop development:
```bash
python tools/control.py tauri run
```

Desktop development on another frontend port:
```bash
python tools/control.py tauri run --frontend-port 5174
```

Build and collect Linux artifacts:
```bash
python tools/control.py tauri build --target linux
python tools/control.py tauri copy
```

Create a Windows portable build:
```bash
python tools/control.py tauri build --target windows-portable
python tools/control.py tauri copy
```

Check tooling without modifying the system:
```bash
python tools/control.py tauri doctor --json
python tools/control.py tauri install --dry-run
python tools/control.py tauri build --dry-run
python tools/control.py tauri test --build-dry-run
```

## Files and Directories
- `src-tauri/`: Tauri Rust shell and desktop configuration
- `frontend/`: existing Vite/TypeScript app used by both web and desktop
- `tools/tauri/`: Python tooling for Tauri
- `.dist/desktop/`: default copied desktop artifact output
- `tools/.runtime/logs/tauri.log`: detached Tauri run log

## Package Manager Behavior
The repository currently uses npm through `frontend/package-lock.json`.
Therefore npm is the default package manager.

When `frontend/node_modules/.bin/tauri` exists, the control CLI uses that local binary.
If it is missing, the fallback is:
```bash
npm exec --yes --package @tauri-apps/cli@2.10.1 -- tauri <command>
```

pnpm is supported when:
- `frontend/pnpm-lock.yaml` exists
- pnpm is installed

## Common Problems
- `node` or `npm` missing: install Node.js LTS and rerun `tauri install`.
- `npm error could not determine executable to run`: rerun with the current tooling; the fallback must use `@tauri-apps/cli`, not the unrelated `tauri` npm package.
- `rustup`, `rustc` or `cargo` missing: install Rust from `https://rustup.rs/`.
- Linux WebKitGTK missing: install the distribution-specific WebKitGTK development package.
- `frontend/dist` missing: run `python tools/control.py tauri build` or `npm --prefix frontend run build`.
- No artifacts found during `tauri copy`: run a successful `tauri build` first.
