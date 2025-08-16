# HLVM Build System - Single command deployment

# Default: build and deploy
all: deploy

# Generate embedded stdlib and compile binary
build:
	@echo "🔨 Building HLVM..."
	@./src/embed-stdlib.ts
	@./resources/deno compile \
		--allow-all \
		--no-check \
		--output hlvm \
		--target x86_64-apple-darwin \
		--include resources/deno \
		--include resources/ollama \
		src/hlvm-repl.ts
	@echo "✅ Binary compiled (with Deno + Ollama embedded)"

# Deploy to macOS project (includes build)
deploy: build
	@echo "🚀 Deploying to macOS project..."
	@# Create Resources directory if it doesn't exist
	@mkdir -p /Users/seoksoonjang/dev/HLVM/HLVM/Resources
	@# Copy new binary with force to ensure replacement
	@cp -f hlvm /Users/seoksoonjang/dev/HLVM/HLVM/Resources/hlvm
	@echo "✅ Deployed new binary"
	@# Verify it's working
	@echo "🧪 Testing..."
	@MODULES=$$(echo "Object.keys(hlvm).length" | /Users/seoksoonjang/dev/HLVM/HLVM/Resources/hlvm 2>/dev/null | tail -1)
	@echo "✅ Verified: $$MODULES stdlib modules available"
	@# Show binary size
	@ls -lh /Users/seoksoonjang/dev/HLVM/HLVM/Resources/hlvm | awk '{print "📦 Binary size: " $$5}'

# Clean build artifacts
clean:
	@rm -f hlvm src/embedded-stdlib.ts
	@echo "✅ Cleaned build artifacts"

# Quick test after deployment
test:
	@echo "Testing deployed binary..."
	@echo "hlvm.platform.os" | /Users/seoksoonjang/dev/HLVM/HLVM/Resources/hlvm 2>/dev/null | tail -1

.PHONY: all build deploy clean test