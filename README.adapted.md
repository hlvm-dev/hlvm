# HLVM

Get up and running with HLVM — a high-level virtual machine for cross‑platform automation and local AI integration.

- **Website**: Coming soon
- **Docs**: `docs/`
- **Releases**: See GitHub Releases

## Install

### macOS

- Homebrew (recommended)
```bash
brew tap hlvm-dev/hlvm
brew install hlvm
```

- Direct download
```bash
curl -L https://github.com/hlvm-dev/hlvm/releases/latest/download/hlvm-macos-$(uname -m | sed 's/arm64/arm64/; s/x86_64/x64/') -o hlvm
chmod +x hlvm && sudo mv hlvm /usr/local/bin/
```

### Linux
```bash
curl -L https://github.com/hlvm-dev/hlvm/releases/latest/download/hlvm-linux-x64 -o hlvm
chmod +x hlvm && sudo mv hlvm /usr/local/bin/
```

### Windows
```powershell
Invoke-WebRequest -Uri "https://github.com/hlvm-dev/hlvm/releases/latest/download/hlvm-windows-x64.exe" -OutFile hlvm.exe
Move-Item hlvm.exe $env:WINDIR\System32
```

## Quickstart

### Start the REPL
```bash
hlvm
```

### One‑liners
```bash
hlvm -e "console.log(hlvm.core.system.os)"
```

### Run a script
```bash
hlvm path/to/script.js
```

## Use HLVM

### Filesystem
```javascript
await hlvm.core.io.fs.write('/tmp/hello.txt', 'Hello');
const text = await hlvm.core.io.fs.read('/tmp/hello.txt');
```

### Automation
```javascript
await hlvm.core.computer.screen.capture('/tmp/screenshot.png');
await hlvm.core.computer.keyboard.type('Hello');
await hlvm.core.computer.mouse.click(100, 100);
```

### Notifications
```javascript
await hlvm.core.ui.notification.notify('Done!', 'HLVM');
const name = await hlvm.core.ui.notification.prompt('Name?');
```

### AI (local Ollama)
```javascript
const reply = await hlvm.core.ai.ollama.chat({ model: 'llama3', prompt: 'Hello' });
```

## Documentation

See `docs/` for: API reference, guides, examples, and advanced topics.

- Core: `hlvm.core.system`, `storage`, `io`, `computer`, `ui`, `ai`, `event`
- App: `hlvm.app` (UI controls)
- Stdlib: `hlvm.stdlib.*`

## CLI

- `hlvm` — start interactive shell
- `hlvm -e "<expr>"` — evaluate an expression
- `hlvm <file>` — run a script file

## Build from source

Prerequisites: Deno 1.40+, Make

```bash
git clone https://github.com/hlvm-dev/hlvm.git
cd hlvm
make build
```

Artifacts are placed at `./hlvm` and per‑target builds via `make build-all`.

## Binaries & checksums

Every release attaches platform binaries and SHA256 checksum files.

- macOS: `hlvm-macos-x64`, `hlvm-macos-arm64`
- Linux: `hlvm-linux-x64`
- Windows: `hlvm-windows-x64.exe`

## Package managers

- Homebrew tap: `hlvm-dev/hlvm`

## Community

- Issues: `https://github.com/hlvm-dev/hlvm/issues`
- Discussions: `https://github.com/hlvm-dev/hlvm/discussions`

## Contributing

See `CONTRIBUTING.md`. We use Conventional Commits and Semantic Versioning.

## License

MIT — © 2025 Seoksoon Jang and HLVM contributors

## Acknowledgments

- Built on Deno
- Local AI via Ollama
