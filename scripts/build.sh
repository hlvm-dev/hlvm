#!/bin/bash

# Build HLVM binary
cd "$(dirname "$0")/.."

echo "Building HLVM binary with embedded Deno and Ollama..."

# Remove old binary if exists
rm -f hlvm

# Compile with embedded binaries
./resources/deno compile \
  --allow-all \
  --no-check \
  --include resources/deno \
  --include resources/ollama \
  --include src/eval-proxy-server.ts \
  --include src/hlvm-stdlib.ts \
  --include src/modules \
  --output hlvm \
  --target x86_64-apple-darwin \
  src/hlvm-repl.ts

# Sign for macOS
codesign --force --sign - hlvm 2>/dev/null

echo "Build complete: hlvm ($(ls -lh hlvm | awk '{print $5}'))"