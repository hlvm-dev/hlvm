#!/bin/bash
# HLVM Model Bundling Script
# Bundles the embedded model for inclusion in the binary

set -e

# Get the model name from version.ts
MODEL=$(./resources/deno eval "import { EMBEDDED_MODEL } from './src/version.ts'; console.log(EMBEDDED_MODEL)")

echo "🤖 Bundling model: $MODEL"

# Check if model exists, pull if needed
if ./resources/ollama list | grep -q "$MODEL"; then
    echo "✅ Model $MODEL already exists"
else
    echo "📥 Downloading $MODEL..."
    ./resources/ollama pull "$MODEL"
fi

# Wait for model to be fully available
sleep 2

# Find model files
echo "📦 Packaging model files..."
OLLAMA_DIR="$HOME/.ollama"
cd "$OLLAMA_DIR"

# Create a clean bundle directory
rm -rf /tmp/hlvm-model-bundle
mkdir -p /tmp/hlvm-model-bundle/models

# Copy manifests for our model
MANIFEST_DIR="models/manifests/registry.ollama.ai/library"
MODEL_NAME=$(echo $MODEL | cut -d: -f1)
MODEL_TAG=$(echo $MODEL | cut -d: -f2)

if [ -d "$MANIFEST_DIR/$MODEL_NAME" ]; then
    mkdir -p "/tmp/hlvm-model-bundle/$MANIFEST_DIR/$MODEL_NAME"
    cp "$MANIFEST_DIR/$MODEL_NAME/$MODEL_TAG" "/tmp/hlvm-model-bundle/$MANIFEST_DIR/$MODEL_NAME/"
    echo "  Added manifest: $MODEL_NAME:$MODEL_TAG"
    
    # Extract blob references from manifest
    cat "$MANIFEST_DIR/$MODEL_NAME/$MODEL_TAG" | grep -o 'sha256:[a-f0-9]*' | while read sha; do
        blob="models/blobs/${sha//:/-}"
        if [ -f "$blob" ]; then
            mkdir -p "/tmp/hlvm-model-bundle/models/blobs"
            cp "$blob" "/tmp/hlvm-model-bundle/$blob"
            echo "  Added blob: $(basename "$blob") ($(du -h "$blob" | cut -f1))"
        fi
    done
fi

# Create the bundle
PROJECT_DIR="/Users/seoksoonjang/Desktop/hlvm"
cd /tmp/hlvm-model-bundle
BUNDLE_PATH="$PROJECT_DIR/resources/model-bundle.tar.gz"
tar -czf "$BUNDLE_PATH" models/
SIZE=$(du -h "$BUNDLE_PATH" | cut -f1)

echo "✅ Model bundled: resources/model-bundle.tar.gz ($SIZE)"
echo "📊 Bundle contains:"
tar -tzf "$BUNDLE_PATH" | wc -l | xargs echo "  Files:"
echo "  Size: $SIZE"

# Clean up
rm -rf /tmp/hlvm-model-bundle

echo "🎉 Model $MODEL ready for embedding!"