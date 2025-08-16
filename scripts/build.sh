#!/bin/bash

# Build HLVM binary
cd "$(dirname "$0")/.."

echo "Building HLVM binary with embedded Deno and Ollama..."

# Remove old binary if exists
rm -f hlvm

# Compile with embedded binaries - full self-contained
./resources/deno compile \
  --allow-all \
  --no-check \
  --include resources/deno \
  --include resources/ollama \
  --include src/hlvm-init.js \
  --include src/stdlib/core/platform.js \
  --include src/stdlib/core/system.js \
  --include src/stdlib/core/database.js \
  --include src/stdlib/fs/filesystem.js \
  --include src/stdlib/io/clipboard.js \
  --include src/stdlib/computer/notification.js \
  --include src/stdlib/computer/screen.js \
  --include src/stdlib/computer/keyboard.js \
  --include src/stdlib/computer/mouse.js \
  --include src/stdlib/ai/ollama.js \
  --include src/stdlib/app/control.js \
  --output hlvm \
  --target x86_64-apple-darwin \
  src/hlvm-repl.ts

# Sign for macOS
codesign --force --sign - hlvm 2>/dev/null

echo "Build complete: hlvm ($(ls -lh hlvm | awk '{print $5}'))"