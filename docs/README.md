# HLVM Documentation

HLVM (High-Level Virtual Machine) is a JavaScript runtime with embedded Deno and Ollama, providing system integration for macOS Spotlight and automation.

## Quick Start

```javascript
// Start interactive shell
./hlvm

// Create a module (available in Spotlight)
await hlvm.modules.save('hello', `
  export default function() {
    return hlvm.ui.notification.alert("Hello from HLVM!");
  }
`);

// Load and execute
const hello = await hlvm.modules.load('hello');
await hello();

// Or find in Spotlight (macOS): Cmd+Space, type "hello", click to run
```

## API Structure

```
hlvm
├── modules         # Module management & shortcuts
├── platform        # Platform information
├── system          # System utilities
├── computer        # Computer control
│   ├── mouse       # Mouse automation
│   ├── keyboard    # Keyboard automation
│   ├── screen      # Screen capture
│   ├── clipboard   # Clipboard read/write
│   ├── notification # System notifications
│   ├── context     # Selection & screen context
│   └── fs          # File system operations
├── ui              # User interface
│   └── notification # UI dialogs (alert, confirm, prompt)
├── ai              # AI services
│   └── ollama      # Ollama LLM integration
└── app             # macOS GUI app control
```

## API Reference

### 📚 [Complete API Reference](api-reference.md)
Comprehensive documentation of all HLVM modules with examples.

### Core Modules
- [**hlvm.modules**](modules.md) - Module management & shortcuts
- [**hlvm.platform**](platform.md) - Platform information
- [**hlvm.system**](system.md) - System utilities
- [**hlvm.fs**](fs.md) - File system operations

### Computer Control
- [**hlvm.computer.clipboard**](computer/clipboard.md) - Clipboard operations
- [**hlvm.computer.keyboard**](computer/keyboard.md) - Keyboard automation
- [**hlvm.computer.mouse**](computer/mouse.md) - Mouse control
- [**hlvm.computer.screen**](computer/screen.md) - Screen capture
- [**hlvm.computer.context**](context.md) - System context and selection

### User Interface
- [**hlvm.ui.notification**](ui/notification.md) - Alerts and notifications

### AI Services
- [**hlvm.ai.ollama**](ai/ollama.md) - AI/LLM integration

### App Control
- [**hlvm.app**](app.md) - GUI app control (Spotlight, chat, etc.)

### Additional Features
- [**Shortcuts**](shortcuts.md) - Create permanent global shortcuts
- [**Custom Properties**](persistence.md) - Persistent data storage (`hlvm.myData = ...`)
- [**Database Access**](db.md) - Direct SQLite database access

## Module Patterns

### Direct Execution
```javascript
// Runs immediately when loaded
await hlvm.ui.notification.notify("Hello!", "HLVM");
console.log("Module loaded");
```

### Export Default Function
```javascript
// Runs when function is called
export default async function() {
  const name = await hlvm.ui.notification.prompt("Name?");
  return `Hello ${name}`;
}
```

### Mixed Pattern
```javascript
// Setup runs on load
console.log("Initializing...");
const config = { version: "1.0" };

// Function runs when called
export default async function() {
  return config;
}
```

## Persistence

### Custom Properties
```javascript
// Save data (persists across sessions)
hlvm.myData = { name: "John", settings: {...} };

// Access in new session
console.log(hlvm.myData);

// Delete
hlvm.myData = null;
```

### Module Storage
- **macOS**: `~/Library/Application Support/HLVM/`
- **Windows**: `%APPDATA%\HLVM\`
- **Linux**: `~/.local/share/HLVM/`

## Examples

### Quick Note
```javascript
await hlvm.modules.save('note', `
  export default async function() {
    const note = await hlvm.ui.notification.prompt("Note:");
    await hlvm.computer.fs.write(\`/tmp/note-\${Date.now()}.txt\`, note);
    await hlvm.ui.notification.notify("Saved!", "Note");
  }
`);
```

### Screenshot Tool
```javascript
await hlvm.modules.save('screenshot', `
  export default async function() {
    const path = \`/tmp/screenshot-\${Date.now()}.png\`;
    await hlvm.computer.screen.capture(path, { interactive: true });
    await hlvm.computer.clipboard.writeImage(path);
    await hlvm.ui.notification.notify("Copied!", "Screenshot");
  }
`);
```

### AI Assistant
```javascript
await hlvm.modules.save('ai', `
  export default async function() {
    const q = await hlvm.ui.notification.prompt("Ask AI:");
    const a = await hlvm.ai.ollama.chat(q);
    await hlvm.computer.clipboard.write(a);
    await hlvm.ui.notification.alert(a, "AI");
  }
`);
```

## Interactive Commands

```javascript
hlvm.help()    // Show help
hlvm.status()  // System status
context        // Current clipboard
pprint(obj)    // Pretty print JSON
```

## Platform Support

| Feature | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Spotlight Integration | ✅ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ✅ |
| File System | ✅ | ✅ | ✅ |
| Clipboard | ✅ | ✅ | ✅ |
| Screen Capture | ✅ | ✅ | ✅ |
| Keyboard/Mouse | ✅ | ✅ | ✅ |
| AI (Ollama) | ✅ | ✅ | ✅ |