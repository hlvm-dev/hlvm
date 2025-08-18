# HLVM API Reference

## Overview

HLVM provides a structured API with three main layers:

1. **`hlvm.core.*`** - Core primitives (building blocks)
2. **`hlvm.app.*`** - Application control (GUI functions)  
3. **`hlvm.stdlib.*`** - High-level functions (coming soon)

## Core API (`hlvm.core.*`)

### System Module (`hlvm.core.system`)

Operating system and environment operations.

#### Properties

- `os: string` - Operating system ("darwin", "linux", "windows")
- `arch: string` - Architecture ("x86_64", "aarch64", "arm64")
- `version: string` - OS version
- `isDarwin: boolean` - True if macOS
- `isWindows: boolean` - True if Windows
- `isLinux: boolean` - True if Linux
- `pathSep: string` - Path separator ("/" or "\\")
- `exeExt: string` - Executable extension ("" or ".exe")
- `PS: object` - PowerShell constants
- `ERRORS: object` - Error message constants

#### Functions

- `hostname(): Promise<string>` - Get hostname
- `pid(): number` - Get process ID
- `homeDir(): string` - Get home directory path
- `tempDir(): string` - Get temp directory path
- `cwd(): string` - Get current working directory
- `chdir(path: string): void` - Change directory
- `env(key: string, value?: string): string | void` - Get/set environment variable
- `exit(code?: number): void` - Exit process
- `exec(cmd: string): Promise<{stdout: string, stderr: string}>` - Execute command
- `shell(): string[]` - Get shell command array
- `powershell(script: string): Promise<Output>` - Run PowerShell script
- `escapeShell(str: string): string` - Escape string for shell
- `escapeKeyboard(text: string): string` - Escape text for keyboard input
- `decode(buffer: Uint8Array): string` - Decode buffer to string
- `linuxTool(xdotoolArgs, ydotoolArgs, errorMsg): Promise<Output>` - Linux tool helper

### Storage Module (`hlvm.core.storage`)

Data persistence and module management.

#### Database (`hlvm.core.storage.db`)

- `path: string` - Database file path
- `exec(sql: string): void` - Execute SQL
- `prepare(sql: string): Statement` - Prepare statement
- `load(name: string): Promise<any>` - Load from database
- `getSource(name: string): Promise<string>` - Get source code

#### Modules (`hlvm.core.storage.modules`)

- `save(name: string, code: string): Promise<boolean>` - Save module
- `load(name: string): Promise<any>` - Load and execute module
- `remove(name?: string): Promise<boolean>` - Remove module(s)
- `list(): Array<Module>` - List all modules
- `get(name: string): Promise<string>` - Get module source
- `has(name: string): Promise<boolean>` - Check if module exists
- `shortcut(name: string, path: string): Promise<boolean>` - Create global shortcut
- `shortcuts(): Array<Shortcut>` - List shortcuts
- `removeShortcut(name: string): boolean` - Remove shortcut
- `updateShortcut(name: string, path: string): boolean` - Update shortcut

### I/O Module (`hlvm.core.io`)

Input/output operations.

#### File System (`hlvm.core.io.fs`)

- `read(path: string): Promise<string>` - Read text file
- `write(path: string, content: string): Promise<void>` - Write text file
- `readBytes(path: string): Promise<Uint8Array>` - Read binary file
- `writeBytes(path: string, data: Uint8Array): Promise<void>` - Write binary file
- `exists(path: string): Promise<boolean>` - Check if path exists
- `stat(path: string): Promise<FileInfo>` - Get file stats
- `remove(path: string): Promise<void>` - Delete file/directory
- `copy(src: string, dest: string): Promise<void>` - Copy file/directory
- `move(src: string, dest: string): Promise<void>` - Move file/directory
- `mkdir(path: string): Promise<void>` - Create directory
- `readdir(path: string): AsyncIterable<DirEntry>` - Read directory
- `join(...paths: string[]): string` - Join paths
- `dirname(path: string): string` - Get directory name
- `basename(path: string): string` - Get base name
- `extname(path: string): string` - Get extension

#### Clipboard (`hlvm.core.io.clipboard`)

- `read(): Promise<string>` - Read clipboard text
- `write(text: string): Promise<void>` - Write clipboard text
- `isAvailable(): Promise<boolean>` - Check clipboard availability

### Computer Module (`hlvm.core.computer`)

Computer automation and control.

#### Keyboard (`hlvm.core.computer.keyboard`)

- `type(text: string): Promise<void>` - Type text
- `press(key: string, modifiers?: object): Promise<void>` - Press key(s)
- `shortcut(keys: string): Promise<void>` - Execute keyboard shortcut

#### Mouse (`hlvm.core.computer.mouse`)

- `move(x: number, y: number): Promise<void>` - Move mouse
- `click(x?: number, y?: number, button?: string): Promise<void>` - Click mouse
- `doubleClick(x?: number, y?: number): Promise<void>` - Double click
- `drag(fromX: number, fromY: number, toX: number, toY: number): Promise<void>` - Drag mouse
- `position(): Promise<{x: number, y: number}>` - Get mouse position

#### Screen (`hlvm.core.computer.screen`)

- `capture(output?: string, options?: object): Promise<string>` - Capture screenshot
- `getScreenSize(): Promise<{width: number, height: number}>` - Get screen size

#### Context (`hlvm.core.computer.context`)

- `selection: string | null` - Current text selection (getter)
- `screen.image: string` - Screenshot as base64 (getter)
- `screen.text: string` - OCR text from screen (getter)

### UI Module (`hlvm.core.ui`)

User interface functions.

#### Notification (`hlvm.core.ui.notification`)

- `alert(message: string, title?: string): Promise<void>` - Show alert dialog
- `confirm(message: string, title?: string): Promise<boolean>` - Show confirm dialog
- `prompt(message: string, defaultValue?: string, title?: string): Promise<string>` - Show input dialog
- `notify(message: string, title?: string, subtitle?: string): Promise<void>` - Show notification

### AI Module (`hlvm.core.ai`)

AI service integrations.

#### Ollama (`hlvm.core.ai.ollama`)

Complete Ollama API implementation.

- `generate(request: GenerateRequest): Promise<GenerateResponse | AsyncIterable>` - Generate completion
- `chat(request: ChatRequest): Promise<ChatResponse | AsyncIterable>` - Chat completion
- `list(): Promise<{models: Model[]}>` - List available models
- `show(request: {name: string}): Promise<ModelInfo>` - Show model info
- `pull(request: PullRequest): Promise<PullResponse | AsyncIterable>` - Pull model
- `push(request: PushRequest): Promise<PushResponse | AsyncIterable>` - Push model
- `create(request: CreateRequest): Promise<CreateResponse | AsyncIterable>` - Create model
- `copy(request: {source: string, destination: string}): Promise<boolean>` - Copy model
- `deleteModel(request: {name: string}): Promise<boolean>` - Delete model
- `embeddings(request: EmbeddingsRequest): Promise<EmbeddingsResponse>` - Generate embeddings
- `ps(): Promise<{models: RunningModel[]}>` - List running models
- `isRunning(): Promise<boolean>` - Check if Ollama is running

## App Control API (`hlvm.app.*`)

Application GUI control functions.

### Main Functions

- `connect(): Promise<void>` - Connect to app
- `disconnect(): void` - Disconnect from app
- `isConnected(): boolean` - Check connection status
- `request(method: string, params?: any): Promise<any>` - Send request
- `notify(message: string): void` - Show notification
- `preferences(): void` - Open preferences
- `settings(): void` - Open settings
- `textEditor(): void` - Open text editor
- `minimize(): void` - Minimize window
- `quit(): void` - Quit application
- `escape(): void` - Trigger escape
- `eval(code: string): any` - Evaluate code

### Spotlight (`hlvm.app.spotlight`)

- `toggle(): void` - Toggle spotlight
- `show(): void` - Show spotlight
- `hide(): void` - Hide spotlight
- `navigateIn(): void` - Navigate into
- `navigateOut(): void` - Navigate out
- `search(query: string): void` - Search

### Chat (`hlvm.app.chat`)

- `toggle(): void` - Toggle chat
- `stop(): void` - Stop chat
- `cancel(): void` - Cancel chat
- `createRoom(): void` - Create room
- `send(message: string): void` - Send message
- `list(): Array` - List rooms
- `selectRoom(id: string): void` - Select room
- `ask(question: string): Promise<string>` - Ask AI

### Playground (`hlvm.app.playground`)

- `toggle(): void` - Toggle playground
- `eval(code: string): any` - Evaluate code
- `increaseFont(): void` - Increase font size
- `decreaseFont(): void` - Decrease font size
- `setCode(code: string): void` - Set code

### Screenshot (`hlvm.app.screenshot`)

- `capture(): void` - Capture screenshot
- `captureScreen(): void` - Capture full screen
- `captureEntire(): void` - Capture entire desktop
- `captureSelection(): void` - Capture selection

### Code (`hlvm.app.code`)

- `paste(): void` - Paste code
- `copy(): void` - Copy code

### REPL (`hlvm.app.repl`)

- `toggle(): void` - Toggle REPL
- `clear(): void` - Clear REPL
- `execute(code: string): void` - Execute in REPL

### AI (`hlvm.app.ai`)

- `write(prompt: string): void` - AI write assistance

## Standard Library API (`hlvm.stdlib.*`)

High-level abstractions and utilities. (Coming soon)

## Helper Functions

### Global

- `hlvm.help(): void` - Show help information
- `hlvm.status(): void` - Show system status
- `hlvm.context: object` - Get current context (alias for `hlvm.core.computer.context`)

### Context

- `context: object` - Global alias for `hlvm.context`

## Custom Properties

Users can add custom properties directly to the `hlvm` object. These are automatically persisted to the database.

```javascript
// Add custom property
hlvm.myData = { name: "test", value: 123 };

// Access custom property
console.log(hlvm.myData.name); // "test"

// Remove custom property
hlvm.myData = null;
// or
delete hlvm.myData;
```

## Examples

### File Operations

```javascript
// Write a file
await hlvm.core.io.fs.write('/tmp/test.txt', 'Hello World');

// Read a file
const content = await hlvm.core.io.fs.read('/tmp/test.txt');

// Check if file exists
if (await hlvm.core.io.fs.exists('/tmp/test.txt')) {
  console.log('File exists');
}
```

### Computer Automation

```javascript
// Type text
await hlvm.core.computer.keyboard.type('Hello World');

// Click at position
await hlvm.core.computer.mouse.click(100, 200);

// Take screenshot
await hlvm.core.computer.screen.capture('/tmp/screenshot.png');
```

### AI Integration

```javascript
// Chat with AI
const response = await hlvm.core.ai.ollama.chat({
  model: 'llama3',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

// Generate text
const result = await hlvm.core.ai.ollama.generate({
  model: 'llama3',
  prompt: 'Write a poem about coding'
});
```

### Module Management

```javascript
// Save a module
await hlvm.core.storage.modules.save('greet', `
  export default function(name) {
    return 'Hello ' + name;
  }
`);

// Load and use module
const greet = await hlvm.core.storage.modules.load('greet');
console.log(greet('World')); // "Hello World"

// List modules
const modules = hlvm.core.storage.modules.list();
```

### App Control

```javascript
// Show spotlight
hlvm.app.spotlight.show();

// Send chat message
hlvm.app.chat.send('Hello AI!');

// Execute in playground
hlvm.app.playground.eval('2 + 2');
```

## Migration from Old Structure

The API has been restructured for better organization. Here's how to migrate:

| Old Path | New Path |
|----------|----------|
| `hlvm.platform.*` | `hlvm.core.system.*` |
| `hlvm.system.*` | `hlvm.core.system.*` |
| `hlvm.fs.*` | `hlvm.core.io.fs.*` |
| `hlvm.clipboard.*` | `hlvm.core.io.clipboard.*` |
| `hlvm.computer.keyboard.*` | `hlvm.core.computer.keyboard.*` |
| `hlvm.computer.mouse.*` | `hlvm.core.computer.mouse.*` |
| `hlvm.computer.screen.*` | `hlvm.core.computer.screen.*` |
| `hlvm.computer.notification.*` | `hlvm.core.ui.notification.*` |
| `hlvm.ai.ollama.*` | `hlvm.core.ai.ollama.*` |
| `hlvm.modules.*` | `hlvm.core.storage.modules.*` |
| `hlvm.db.*` | `hlvm.core.storage.db.*` |

Note: The old paths are no longer supported. Please update your code to use the new structure.