<div align="center">
  <a href="https://github.com/hlvm-dev/hlvm">
    <img alt="HLVM" width="240" src="resources/image/hlvm.png">
  </a>
</div>

# HLVM

Get up and running with a high‑level virtual machine for local automation and AI.

### macOS

Homebrew (recommended):

```shell
brew tap hlvm-dev/hlvm
brew install hlvm
```

Direct download:

```shell
curl -fsSL https://github.com/hlvm-dev/hlvm/releases/latest/download/hlvm-macos-$(uname -m | sed 's/x86_64/x64/; s/arm64/arm64/') -o hlvm
chmod +x hlvm && sudo mv hlvm /usr/local/bin/
```

### Windows

Coming soon. (Prebuilt `.exe` will be available on Releases.)

### Linux

Coming soon. (Static builds and manual install instructions will be available.)

### Docker

Coming soon. (Container image for running HLVM scripts in CI.)

### Libraries

- JavaScript/TypeScript standard library is built‑in under `hlvm.core.*` and `hlvm.stdlib.*`.

### Community

- Issues: https://github.com/hlvm-dev/hlvm/issues
- Discussions: https://github.com/hlvm-dev/hlvm/discussions

## Quickstart

Run the interactive shell:

```shell
hlvm
```

Evaluate an expression:

```shell
hlvm -e "console.log(hlvm.core.system.os)"
```

Run a script file:

```shell
hlvm ./examples/hello.js
```

## Standard library

HLVM ships with a cross‑platform standard library:

| Area       | Namespace                     | Examples |
| ---------- | ----------------------------- | -------- |
| System     | `hlvm.core.system`            | `exec`, `env`, `cwd`, `os`, `arch` |
| Storage    | `hlvm.core.storage`           | `db`, `modules.save/list/load`, aliases |
| File I/O   | `hlvm.core.io.fs`             | `read`, `write`, `copy`, `move`, `mkdir`, `readdir` |
| Clipboard  | `hlvm.core.io.clipboard`      | `read`, `write` |
| Automation | `hlvm.core.computer.*`        | `keyboard.type`, `mouse.click`, `screen.capture` |
| UI         | `hlvm.core.ui.notification`   | `alert`, `confirm`, `prompt`, `notify` |
| AI         | `hlvm.core.ai.*`              | `ollama.chat`, `ollama.list` (optional) |
| Events     | `hlvm.core.event`             | `observe`, `unobserve`, `listObservers` |

> Note: AI features connect to a local/remote server if available (e.g., Ollama). Set `OLLAMA_HOST` to configure.

## Create a module

Create a reusable module and run it from the shell:

```javascript
// hello.js
export default async function() {
  await hlvm.core.ui.notification.notify('Hello from HLVM!', 'HLVM');
}
```

```shell
hlvm ./hello.js
```

Or persist a module with the storage API:

```javascript
await hlvm.core.storage.modules.save('hello', `
  export default async function() {
    await hlvm.core.ui.notification.alert('Hello!', 'HLVM');
  }
`);

const hello = await hlvm.core.storage.modules.load('hello');
await hello();
```

## CLI Reference

### Evaluate code

```shell
hlvm -e "await hlvm.core.io.fs.write('/tmp/a.txt','hi')"
```

### Run a file

```shell
hlvm path/to/script.js
```

### Start interactive shell

```shell
hlvm
```

## Building

See the developer guide in `docs/`.

### Running local builds (macOS)

```shell
make build
./hlvm -e "console.log(hlvm.core.system.os)"
```

## JavaScript API

The full API is documented in `docs/`:

- Core: system, storage, io, computer, ui, ai, event
- App: `hlvm.app`
- Stdlib: `hlvm.stdlib.*`

## Examples

- Basic scripts: files, clipboard, notifications
- Automation: keyboard/mouse/screen
- AI: chat and embeddings via optional local server

---

HLVM is MIT‑licensed. © 2025 Seoksoon Jang and HLVM contributors.
