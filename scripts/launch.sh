#!/bin/bash

# HLVM - High-Level Virtual Machine
HLVM_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$HLVM_DIR"

# Run our custom REPL that doesn't show Deno banner
exec ./resources/deno run --allow-all --quiet src/hlvm-repl.ts