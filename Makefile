# HLVM Build System - Cross-platform deployment

# Version from source
VERSION := $(shell grep 'HLVM_VERSION' src/version.ts | cut -d'"' -f2)
BINARY_NAME := hlvm

# Build targets for different platforms
TARGETS := \
	x86_64-unknown-linux-gnu \
	x86_64-apple-darwin \
	x86_64-pc-windows-msvc \
	aarch64-apple-darwin

# Default: build, deploy, test everything
all: build deploy test-all

# Fast: build and deploy only (skip tests for rapid iteration)
fast: build deploy
	@echo "⚡ Fast build complete (tests skipped)"

# Generate embedded stdlib and compile binary for current platform
build:
	@echo "🔨 Building HLVM for current platform..."
	@./src/embed-stdlib.ts
	@echo "⏳ Compiling binary..."
	@./resources/deno compile \
		--allow-all \
		--no-check \
		--output $(BINARY_NAME) \
		--include resources/deno \
		--include resources/ollama \
		src/hlvm-repl.ts
	@echo "✅ Binary compiled (with Deno + Ollama embedded)"
	@echo "📦 Binary size: $$(ls -lh $(BINARY_NAME) | awk '{print $$5}')"

# Build for all platforms (release build)
build-all: clean
	@echo "🚀 Building HLVM for all platforms..."
	@./src/embed-stdlib.ts
	@for target in $(TARGETS); do \
		echo "Building for $$target..."; \
		./resources/deno compile \
			--allow-all \
			--no-check \
			--output $(BINARY_NAME)-$$target \
			--target $$target \
			--include resources/deno \
			--include resources/ollama \
			src/hlvm-repl.ts; \
	done
	@echo "✅ All platform binaries built"
	@ls -lh $(BINARY_NAME)-*

# Build for specific platform
build-%:
	@echo "🔨 Building HLVM for $*..."
	@./src/embed-stdlib.ts
	@./resources/deno compile \
		--allow-all \
		--no-check \
		--output $(BINARY_NAME)-$* \
		--target $* \
		--include resources/deno \
		--include resources/ollama \
		src/hlvm-repl.ts
	@echo "✅ Binary built for $*"

# Create release packages
release: build-all
	@echo "📦 Creating release packages..."
	@mkdir -p release
	@for target in $(TARGETS); do \
		if [ "$$target" = "x86_64-pc-windows-msvc" ]; then \
			cp $(BINARY_NAME)-$$target release/$(BINARY_NAME)-windows-x64.exe; \
			sha256sum $(BINARY_NAME)-$$target > release/$(BINARY_NAME)-windows-x64.sha256; \
		elif [ "$$target" = "x86_64-apple-darwin" ]; then \
			cp $(BINARY_NAME)-$$target release/$(BINARY_NAME)-macos-x64; \
			sha256sum $(BINARY_NAME)-$$target > release/$(BINARY_NAME)-macos-x64.sha256; \
		elif [ "$$target" = "aarch64-apple-darwin" ]; then \
			cp $(BINARY_NAME)-$$target release/$(BINARY_NAME)-macos-arm64; \
			sha256sum $(BINARY_NAME)-$$target > release/$(BINARY_NAME)-macos-arm64.sha256; \
		else \
			cp $(BINARY_NAME)-$$target release/$(BINARY_NAME)-linux-x64; \
			sha256sum $(BINARY_NAME)-$$target > release/$(BINARY_NAME)-linux-x64.sha256; \
		fi; \
	done
	@echo "✅ Release packages created in release/ directory"
	@ls -lh release/

# Deploy to macOS project (requires build)
deploy:
	@echo "🚀 Deploying to macOS project..."
	@# Create Resources directory if it doesn't exist
	@mkdir -p /Users/seoksoonjang/dev/HLVM/HLVM/Resources
	@# Copy new binary with force to ensure replacement
	@cp -f $(BINARY_NAME) /Users/seoksoonjang/dev/HLVM/HLVM/Resources/$(BINARY_NAME)
	@echo "✅ Deployed new binary"
	@# Show binary size
	@ls -lh /Users/seoksoonjang/dev/HLVM/HLVM/Resources/$(BINARY_NAME) | awk '{print "📦 Binary size: " $$5}'
	@echo "✅ Deployment complete"

# Quick verification test
verify:
	@echo "🔍 Verifying binary..."
	@MODULES=$$(echo "Object.keys(hlvm).length" | ./$(BINARY_NAME) 2>/dev/null | tail -1); \
	if [ -n "$$MODULES" ]; then \
		echo "✅ Binary works: $$MODULES stdlib modules available"; \
	else \
		echo "❌ Binary verification failed"; \
		exit 1; \
	fi

# Run full test suite (82+ tests)
test-all:
	@echo "🧪 Running full test suite..."
	@./test/test.sh

# Run quick smoke test
test-quick:
	@echo "🚀 Quick test..."
	@echo "hlvm.core.system.os" | ./$(BINARY_NAME) 2>/dev/null | tail -1

# Run tests for all platforms
test-all-platforms: build-all
	@echo "🧪 Testing all platform binaries..."
	@for target in $(TARGETS); do \
		echo "Testing $$target..."; \
		if [ "$$target" = "x86_64-pc-windows-msvc" ]; then \
			echo "Skipping Windows binary test (requires Windows environment)"; \
		else \
			./$(BINARY_NAME)-$$target --version > /dev/null 2>&1 && echo "✅ $$target works" || echo "❌ $$target failed"; \
		fi; \
	done

# Clean build artifacts
clean:
	@rm -f $(BINARY_NAME) $(BINARY_NAME)-* src/embedded-stdlib.ts
	@rm -rf release/
	@echo "✅ Cleaned build artifacts"

# Run HLVM REPL
run:
	@./hlvm

# Install to system (requires sudo)
install: build
	@echo "📦 Installing HLVM to system..."
	@sudo cp $(BINARY_NAME) /usr/local/bin/
	@echo "✅ HLVM installed to /usr/local/bin/$(BINARY_NAME)"
	@echo "🚀 You can now run 'hlvm' from anywhere"

# Uninstall from system
uninstall:
	@echo "🗑️ Uninstalling HLVM from system..."
	@sudo rm -f /usr/local/bin/$(BINARY_NAME)
	@echo "✅ HLVM uninstalled"

# Show version info
version:
	@echo "HLVM Version: $(VERSION)"
	@echo "Available targets: $(TARGETS)"

# Show help
help:
	@echo "HLVM Build System Commands:"
	@echo "  make                    - Build, deploy, test everything, and run REPL"
	@echo "  make fast               - Fast build and deploy (skip tests)"
	@echo "  make build              - Build HLVM binary for current platform"
	@echo "  make build-all          - Build for all platforms (release build)"
	@echo "  make build-<target>     - Build for specific platform"
	@echo "  make release            - Create release packages for all platforms"
	@echo "  make deploy             - Deploy binary to macOS project"
	@echo "  make verify             - Quick verification that binary works"
	@echo "  make test               - Run full test suite (82+ tests)"
	@echo "  make test-quick         - Run quick smoke test"
	@echo "  make test-all-platforms - Test all platform binaries"
	@echo "  make run                - Start HLVM REPL"
	@echo "  make clean              - Remove build artifacts"
	@echo "  make install            - Install to system (/usr/local/bin/)"
	@echo "  make uninstall          - Uninstall from system"
	@echo "  make version            - Show version information"
	@echo "  make help               - Show this help message"
	@echo ""
	@echo "Platform Targets:"
	@for target in $(TARGETS); do \
		echo "  - $$target"; \
	done

.PHONY: all fast build build-all build-% release deploy verify test-all test-quick test-all-platforms clean run install uninstall version help