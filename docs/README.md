# HLVM Documentation

HLVM (High-Level Virtual Machine) is a JavaScript runtime with embedded Deno and Ollama, providing system integration for macOS Spotlight and automation.

## Quick Start

```javascript
// Start REPL
./hlvm

// Create a module (available in Spotlight)
await hlvm.modules.save('hello', `
  export default function() {
    return hlvm.notification.alert("Hello from HLVM!");
  }
`);

// Load and execute
const hello = await hlvm.modules.load('hello');
await hello();

// Or find in Spotlight: Cmd+Space, type "hello", click to run
```

## API Reference

Each `hlvm.*` namespace has its own documentation:

- [**hlvm.modules**](modules.md) - Module management
- [**hlvm.ui**](ui.md) - UI control (GUI, Spotlight, chat, etc.)
- [**hlvm.clipboard**](clipboard.md) - Clipboard operations
- [**hlvm.db**](db.md) - Database access and module loading
- [**hlvm.fs**](fs.md) - File system operations
- [**hlvm.keyboard**](keyboard.md) - Keyboard automation
- [**hlvm.mouse**](mouse.md) - Mouse control
- [**hlvm.notification**](notification.md) - Alerts and notifications
- [**hlvm.ollama**](ollama.md) - AI/LLM integration
- [**hlvm.platform**](platform.md) - Platform information
- [**hlvm.screen**](screen.md) - Screen capture
- [**hlvm.system**](system.md) - System utilities

## Module Patterns

### Direct Execution
```javascript
// Runs immediately when loaded
await hlvm.notification.notify("Hello!", "HLVM");
console.log("Module loaded");
```

### Export Default Function
```javascript
// Runs when function is called
export default async function() {
  const name = await hlvm.notification.prompt("Name?");
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
    const note = await hlvm.notification.prompt("Note:");
    await hlvm.fs.write(\`/tmp/note-\${Date.now()}.txt\`, note);
    await hlvm.notification.notify("Saved!", "Note");
  }
`);
```

### Screenshot Tool
```javascript
await hlvm.modules.save('screenshot', `
  export default async function() {
    const path = \`/tmp/screenshot-\${Date.now()}.png\`;
    await hlvm.screen.capture(path, { interactive: true });
    await hlvm.clipboard.writeImage(path);
    await hlvm.notification.notify("Copied!", "Screenshot");
  }
`);
```

### AI Assistant
```javascript
await hlvm.modules.save('ai', `
  export default async function() {
    const q = await hlvm.notification.prompt("Ask AI:");
    const a = await hlvm.ollama.chat(q);
    await hlvm.clipboard.write(a);
    await hlvm.notification.alert(a, "AI");
  }
`);
```

## REPL Commands

```javascript
hlvm.help()    // Show help
hlvm.status()  // System status
context        // Current clipboard
pprint(obj)    // Pretty print JSON
```

## Platform Support

| Feature | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Spotlight | ✅ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ✅ |
| File System | ✅ | ✅ | ✅ |
| Clipboard | ✅ | ✅ | ✅ |
| Screen Capture | ✅ | ✅ | ✅ |
| Automation | ✅ | ✅ | ✅ |
| Ollama | ✅ | ✅ | ✅ |