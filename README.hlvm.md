# HLVM - High-Level Virtual Machine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/hlvm-dev/hlvm)](https://github.com/hlvm-dev/hlvm/releases)
[![Platforms](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue.svg)](https://github.com/hlvm-dev/hlvm/releases)

**HLVM** is a high-level virtual machine that provides a unified interface for system automation, AI services, and cross-platform development. Built with Deno and designed for productivity.

## Features

- 🚀 **Cross-Platform**: Works on macOS, Linux, and Windows
- 🤖 **AI Integration**: Built-in Ollama support for local AI models
- 💻 **System Automation**: Keyboard, mouse, screen, and file system control
- 🔧 **Extensible**: Plugin system with persistent storage
- 📱 **Modern UI**: Native notifications and user interface controls
- 🎯 **Developer Friendly**: REPL interface with hot reloading

## Quick Start

### Install

#### macOS
```bash
# Using Homebrew
brew install hlvm-dev/hlvm/hlvm

# Or download binary directly
curl -L https://github.com/hlvm-dev/hlvm/releases/latest/download/hlvm-macos-x64 -o hlvm
chmod +x hlvm
sudo mv hlvm /usr/local/bin/
```

#### Linux
```bash
# Download binary
curl -L https://github.com/hlvm-dev/hlvm/releases/latest/download/hlvm-linux-x64 -o hlvm
chmod +x hlvm
sudo mv hlvm /usr/local/bin/
```

#### Windows
```powershell
# Download binary
Invoke-WebRequest -Uri "https://github.com/hlvm-dev/hlvm/releases/latest/download/hlvm-windows-x64.exe" -OutFile "hlvm.exe"
# Move to PATH directory
Move-Item hlvm.exe C:\Windows\System32\
```

### Run

```bash
# Start interactive REPL
hlvm

# Run a script
hlvm script.js

# Execute one-liner
hlvm -e "console.log(hlvm.core.system.os)"
```

## Examples

### File Operations
```javascript
// Read and write files
await hlvm.core.io.fs.write('/tmp/hello.txt', 'Hello, World!');
const content = await hlvm.core.io.fs.read('/tmp/hello.txt');

// File management
await hlvm.core.io.fs.mkdir('/tmp/myproject');
await hlvm.core.io.fs.copy('/tmp/hello.txt', '/tmp/myproject/');
```

### System Automation
```javascript
// Screen capture
await hlvm.core.computer.screen.capture('/tmp/screenshot.png');

// Keyboard input
await hlvm.core.computer.keyboard.type('Hello, World!');

// Mouse control
await hlvm.core.computer.mouse.click(100, 100);
```

### AI Services
```javascript
// Chat with local AI model
const response = await hlvm.core.ai.ollama.chat({
  model: 'llama3',
  prompt: 'Explain quantum computing in simple terms'
});

// List available models
const models = await hlvm.core.ai.ollama.list();
```

### Notifications
```javascript
// Show notification
await hlvm.core.ui.notification.notify('Task completed!', 'HLVM');

// Get user input
const name = await hlvm.core.ui.notification.prompt('Enter your name:');
```

## Architecture

HLVM is built with a layered architecture:

- **Layer 1: Core Primitives** - System, storage, I/O, automation, AI, events
- **Layer 2: App Control** - User interface and application management
- **Layer 3: Standard Library** - High-level functions and utilities

```
hlvm/
├── core/           # Core primitives
│   ├── system/     # OS and environment
│   ├── storage/    # Persistence and modules
│   ├── io/         # File system and clipboard
│   ├── computer/   # Automation (keyboard, mouse, screen)
│   ├── ui/         # User interface
│   ├── ai/         # AI services
│   └── event/      # Observation system
├── app/            # Application control
└── stdlib/         # Standard library
```

## Development

### Prerequisites
- [Deno](https://deno.land/) 1.40+
- Node.js 18+ (for some build tools)

### Build from Source
```bash
git clone https://github.com/hlvm-dev/hlvm.git
cd hlvm
make build
```

### Run Tests
```bash
make test
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Community

- 📖 [Documentation](https://github.com/hlvm-dev/hlvm/tree/main/docs)
- 🐛 [Issues](https://github.com/hlvm-dev/hlvm/issues)
- 💬 [Discussions](https://github.com/hlvm-dev/hlvm/discussions)
- 📝 [Changelog](CHANGELOG.md)

## Acknowledgments

- Built with [Deno](https://deno.land/)
- AI integration powered by [Ollama](https://ollama.ai/)
- Cross-platform automation using native APIs

---

**HLVM** - Empowering developers with high-level system control and AI integration.
