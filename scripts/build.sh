#!/bin/bash

# Build HLVM binary
cd "$(dirname "$0")/.."

echo "Building HLVM binary..."

# Remove old binary if exists
rm -f hlvm

# Compile
./resources/deno compile \
  --allow-all \
  --no-check \
  --output hlvm \
  --target x86_64-apple-darwin \
  src/hlvm-repl.ts

# Sign for macOS
codesign --force --sign - hlvm 2>/dev/null

echo "Build complete: hlvm ($(ls -lh hlvm | awk '{print $5}'))"