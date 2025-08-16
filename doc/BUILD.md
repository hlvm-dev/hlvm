# Building HLVM Binary

## Quick Build

```bash
./scripts/build.sh
```

This creates the `hlvm` binary in the root directory.

## Manual Build

```bash
# Compile TypeScript to single binary
./resources/deno compile \
  --allow-all \
  --no-check \
  --output hlvm \
  --target x86_64-apple-darwin \
  src/hlvm-repl.ts

# Optional: Sign for macOS (prevents Gatekeeper issues)
codesign --force --sign - hlvm
```

## What's Included in Binary

The `hlvm` binary (70MB) contains:
- Deno JavaScript runtime (embedded)
- HLVM REPL implementation
- All stdlib modules (platform, system, app, clipboard, etc.)
- Eval-proxy server code

## Required External Files

The binary still needs these in `resources/`:
- `deno` - For spawning eval-proxy server
- `ollama` - For LLM inference

## Running

```bash
./hlvm
```

This starts:
1. Ollama service (port 11434)
2. Eval-proxy server (port 11437)
3. JavaScript REPL with SICP-style banner