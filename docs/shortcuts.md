# HLVM Shortcuts API

Create permanent global shortcuts to frequently used HLVM functions.

## Quick Start

```javascript
// Create a shortcut
await hlvm.modules.shortcut('toggle', 'hlvm.app.spotlight.toggle');

// Now you can use it directly
await toggle();  // Instead of hlvm.app.spotlight.toggle()
```

## API Reference

### hlvm.modules.shortcut(name, path)

Create or update a global shortcut.

**Parameters:**
- `name` (string) - Shortcut name (becomes global function)
- `path` (string) - Path to HLVM function

**Returns:** Promise<boolean>

**Example:**
```javascript
// Create shortcuts for common operations
await hlvm.modules.shortcut('clip', 'hlvm.computer.clipboard.read');
await hlvm.modules.shortcut('save', 'hlvm.fs.write');
await hlvm.modules.shortcut('notify', 'hlvm.computer.notification.notify');

// Use them
const text = await clip();
await save('/tmp/file.txt', 'content');
await notify('Done!', 'HLVM');
```

---

### hlvm.modules.shortcuts()

List all shortcuts.

**Returns:** Array of shortcut objects

**Example:**
```javascript
const shortcuts = hlvm.modules.shortcuts();
shortcuts.forEach(s => {
  console.log(`${s.name}() → ${s.path}`);
});
// Output:
// clip() → hlvm.computer.clipboard.read
// save() → hlvm.fs.write
// notify() → hlvm.computer.notification.notify
```

---

### hlvm.modules.removeShortcut(name)

Remove a shortcut.

**Parameters:**
- `name` (string) - Shortcut name to remove

**Returns:** boolean

**Example:**
```javascript
hlvm.modules.removeShortcut('save');
// save() is no longer available
```

---

### hlvm.modules.updateShortcut(name, path)

Update an existing shortcut (alias for shortcut()).

**Parameters:**
- `name` (string) - Shortcut name
- `path` (string) - New path

**Example:**
```javascript
// Change clip to write instead of read
await hlvm.modules.updateShortcut('clip', 'hlvm.computer.clipboard.write');
```

## Common Shortcuts

### Clipboard Operations
```javascript
await hlvm.modules.shortcut('clip', 'hlvm.computer.clipboard.read');
await hlvm.modules.shortcut('copy', 'hlvm.computer.clipboard.write');
```

### File Operations
```javascript
await hlvm.modules.shortcut('read', 'hlvm.fs.read');
await hlvm.modules.shortcut('write', 'hlvm.fs.write');
await hlvm.modules.shortcut('exists', 'hlvm.fs.exists');
```

### AI Operations
```javascript
await hlvm.modules.shortcut('chat', 'hlvm.ai.ollama.chat');
await hlvm.modules.shortcut('models', 'hlvm.ai.ollama.list');
await hlvm.modules.shortcut('generate', 'hlvm.ai.ollama.generate');
```

### App Control (macOS)
```javascript
await hlvm.modules.shortcut('toggle', 'hlvm.app.spotlight.toggle');
await hlvm.modules.shortcut('show', 'hlvm.app.spotlight.show');
await hlvm.modules.shortcut('hide', 'hlvm.app.spotlight.hide');
```

### UI Notifications
```javascript
await hlvm.modules.shortcut('notify', 'hlvm.ui.notification.notify');
await hlvm.modules.shortcut('alert', 'hlvm.ui.notification.alert');
await hlvm.modules.shortcut('prompt', 'hlvm.ui.notification.prompt');
```

## Persistence

Shortcuts are stored in the HLVM database and persist across sessions:
- **macOS**: `~/Library/Application Support/HLVM/HLVM.sqlite`
- **Windows**: `%APPDATA%\HLVM\HLVM.sqlite`
- **Linux**: `~/.local/share/HLVM/HLVM.sqlite`

## Reserved Names

The following names cannot be used as shortcuts:
- JavaScript built-ins: `Object`, `Array`, `String`, `Number`, `Boolean`, `Symbol`
- Global objects: `console`, `global`, `globalThis`, `window`, `document`
- HLVM core: `hlvm`, `Deno`
- Functions: `eval`, `alert`, `confirm`, `prompt`

## Examples

### Quick Actions Module
```javascript
// Create a set of productivity shortcuts
async function setupProductivityShortcuts() {
  await hlvm.modules.shortcut('todo', 'hlvm.modules.load');
  await hlvm.modules.shortcut('clip', 'hlvm.computer.clipboard.read');
  await hlvm.modules.shortcut('copy', 'hlvm.computer.clipboard.write');
  await hlvm.modules.shortcut('note', 'hlvm.fs.write');
  await hlvm.modules.shortcut('snap', 'hlvm.computer.screen.capture');
  
  console.log("Productivity shortcuts ready!");
}

await setupProductivityShortcuts();

// Now use them
const task = await prompt("What's your task?");
await note(`/tmp/todo-${Date.now()}.txt`, task);
await copy(`Task saved: ${task}`);
```

### Context-Aware Shortcuts
```javascript
// Create shortcuts that work with context
await hlvm.modules.shortcut('process', 'hlvm.modules.load');

// Load and run a text processor on clipboard
const text = await clip();
const processor = await process('text-formatter');
const result = await processor(text);
await copy(result);
```

### Development Shortcuts
```javascript
// Shortcuts for development workflow
await hlvm.modules.shortcut('test', 'hlvm.system.exec');
await hlvm.modules.shortcut('build', 'hlvm.system.exec');
await hlvm.modules.shortcut('run', 'hlvm.system.exec');

// Use them
await test('./test.sh');
await build('npm run build');
await run('npm start');
```

## Tips

1. **Name shortcuts intuitively** - Use short, memorable names
2. **Group related shortcuts** - Create setup functions for related shortcuts
3. **Document your shortcuts** - Keep a list of your custom shortcuts
4. **Avoid conflicts** - Check existing globals before creating shortcuts
5. **Use for frequent operations** - Shortcuts save typing for repetitive tasks

## Removing All Shortcuts

To remove all shortcuts at once:
```javascript
const shortcuts = hlvm.modules.shortcuts();
for (const s of shortcuts) {
  hlvm.modules.removeShortcut(s.name);
}
console.log("All shortcuts removed");
```