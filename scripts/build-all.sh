#!/bin/bash

# Build HLVM for all platforms
cd "$(dirname "$0")/.."

echo "Building HLVM binaries for all platforms..."

# Define targets
TARGETS=(
  "x86_64-apple-darwin"
  "aarch64-apple-darwin"
  "x86_64-pc-windows-msvc"
  "x86_64-unknown-linux-gnu"
  "aarch64-unknown-linux-gnu"
)

# Build for each target
for TARGET in "${TARGETS[@]}"; do
  echo "Building for $TARGET..."
  
  # Determine output name
  OUTPUT="hlvm-${TARGET}"
  if [[ "$TARGET" == *"windows"* ]]; then
    OUTPUT="${OUTPUT}.exe"
  fi
  
  # Compile
  ./resources/deno compile \
    --allow-all \
    --no-check \
    --include resources/deno \
    --include resources/ollama \
    --include src/eval-proxy-server.ts \
    --include src/hlvm-stdlib.ts \
    --include src/modules \
    --output "dist/${OUTPUT}" \
    --target "${TARGET}" \
    src/hlvm-repl.ts
  
  if [ $? -eq 0 ]; then
    echo "✓ Built: dist/${OUTPUT} ($(ls -lh "dist/${OUTPUT}" 2>/dev/null | awk '{print $5}'))"
  else
    echo "✗ Failed to build for ${TARGET}"
  fi
done

echo "Build complete!"
ls -lh dist/