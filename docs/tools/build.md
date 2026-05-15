<!-- AUTO-GENERATED:backlink START -->
[← Back](tools.md)
<!-- AUTO-GENERATED:backlink END -->
# build Command

## Purpose
`build` creates the frontend web release artifact.

This command is for the website release only. It is separate from the Tauri desktop build.

## CLI Syntax
```bash
python tools/control.py --build
python tools/control.py build
```

## Execution Flow
1. Validate that `frontend/package.json` exists.
2. Resolve `npm`.
3. Run the frontend build:

```bash
cd frontend
npm run build
```

4. Verify that the web release artifact exists:

```text
frontend/dist/
```

5. Package the built website into a GitHub Release ZIP:

```text
.dist/web/imocalc-web.zip
```

## Web Release Artifact
The contents of `frontend/dist/` are the static website release output.

For a web release, upload `.dist/web/imocalc-web.zip` to GitHub Releases. On the server, download the ZIP, extract it into a versioned release directory, and point the web server at that extracted directory.

The ZIP contains the contents of `frontend/dist/` at archive root, without an extra `dist/` folder.

## Exit Behavior
- `0`: `npm run build` completed, `frontend/dist/` exists, and `.dist/web/imocalc-web.zip` was created.
- `1`: npm is missing, `frontend/package.json` is missing, the build failed, `frontend/dist/` was not created, or ZIP packaging failed.

## Typical Usage
```bash
python tools/control.py --build
```

## Common Failure Modes and Recovery
- `❌ npm not found`: install Node.js/npm.
- `❌ frontend/package.json missing`: verify the frontend scaffold.
- `❌ Web build failed`: inspect the stdout/stderr tail printed by the command.
- `❌ frontend/dist was not created`: inspect the frontend build configuration.
- `❌ release ZIP was not created`: verify that `frontend/dist/` contains build files and `.dist/web/` is writable.
