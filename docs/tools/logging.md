<!-- AUTO-GENERATED:backlink START -->
[← Back](tools.md)
<!-- AUTO-GENERATED:backlink END -->
# Tool Logging and Output Semantics

Tooling output is centralized through `tools/logger.py`.
The logger normalizes status output and renders emoji-prefixed lines.

## Output Functions
- `logger.ok(message)` -> `✅ <message>`
- `logger.warn(message)` -> `⚠️ <message>`
- `logger.fail(message)` -> `❌ <message>`
- `logger.info(message)` -> `ℹ️ <message>`
- `logger.status(status, message)` -> mapped output (`OK/WARN/FAIL`, fallback INFO)

## Why This Matters
- Consistent CLI UX across all commands
- Faster scanability in long install/run/test sessions
- Uniform handling for scripts and manual usage

## Current Behavior Notes
- Parser errors in `control.py` return exit code `1` and produce emoji-formatted usage/error lines.
- Non-status lines (context, headings, progress) intentionally use `ℹ️`.
- Summary lines still respect internal status logic while rendered as emojis.

## Interpretation Guide
- `✅` means a step passed.
- `⚠️` means non-fatal deviation (for example fallback path used).
- `❌` means a blocking failure.
- `ℹ️` means progress or context, not success/failure by itself.
