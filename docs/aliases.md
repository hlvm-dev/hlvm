# HLVM Aliases API

Create permanent global aliases to frequently used HLVM functions.

## Quick Start

```javascript
// Create an alias
await hlvm.modules.alias('toggle', 'hlvm.app.spotlight.toggle');

// Now you can use it directly
await toggle();  // Instead of hlvm.app.spotlight.toggle()
```

## API Reference

### hlvm.modules.alias(name, path)

Create or update a global alias.

**Parameters:**
- `name` (string) - Alias name (becomes global function)
- `path` (string) - Path to HLVM function

**Returns:** Promise<boolean>

**Example:**
```javascript
// Create aliases for common operations
await hlvm.modules.alias('clip', 'hlvm.computer.clipboard.read');
await hlvm.modules.alias('save', 'hlvm.computer.fs.write');
await hlvm.modules.alias('notify', 'hlvm.computer.notification.notify');

// Use them
const text = await clip();
await save('/tmp/file.txt', 'content');
await notify('Done!', 'HLVM');
```

---

### hlvm.modules.aliases()

List all aliases.

**Returns:** Array of alias objects

**Example:**
```javascript
const aliases = hlvm.modules.aliases();
aliases.forEach(a => {
  console.log(`${a.name}() → ${a.path}`);
});
// Output:
// clip() → hlvm.computer.clipboard.read
// save() → hlvm.computer.fs.write
// notify() → hlvm.computer.notification.notify
```

---

### hlvm.modules.removeAlias(name)

Remove an alias.

**Parameters:**
- `name` (string) - Alias name to remove

**Returns:** boolean

**Example:**
```javascript
hlvm.modules.removeAlias('save');
// save() is no longer available
```

---

### hlvm.modules.updateAlias(name, path)

Update an existing alias.

**Parameters:**
- `name` (string) - Alias name
- `path` (string) - New path

**Example:**
```javascript
// Change clip to write instead of read
await hlvm.modules.updateAlias('clip', 'hlvm.computer.clipboard.write');
```

## Common Aliases

### Clipboard Operations
```javascript
await hlvm.modules.alias('clip', 'hlvm.computer.clipboard.read');
await hlvm.modules.alias('copy', 'hlvm.computer.clipboard.write');
```

### File Operations
```javascript
await hlvm.modules.alias('read', 'hlvm.computer.fs.read');
await hlvm.modules.alias('write', 'hlvm.computer.fs.write');
await hlvm.modules.alias('exists', 'hlvm.computer.fs.exists');
```

### AI Operations
```javascript
await hlvm.modules.alias('chat', 'hlvm.ai.ollama.chat');
await hlvm.modules.alias('models', 'hlvm.ai.ollama.list');
await hlvm.modules.alias('generate', 'hlvm.ai.ollama.generate');
```

### App Control (macOS)
```javascript
await hlvm.modules.alias('toggle', 'hlvm.app.spotlight.toggle');
await hlvm.modules.alias('show', 'hlvm.app.spotlight.show');
await hlvm.modules.alias('hide', 'hlvm.app.spotlight.hide');
```

### UI Notifications
```javascript
await hlvm.modules.alias('notify', 'hlvm.ui.notification.notify');
await hlvm.modules.alias('alert', 'hlvm.ui.notification.alert');
await hlvm.modules.alias('prompt', 'hlvm.ui.notification.prompt');
```

## Persistence

Aliases are stored in the HLVM database and persist across sessions:
- **macOS**: `~/Library/Application Support/HLVM/HLVM.sqlite`
- **Windows**: `%APPDATA%\HLVM\HLVM.sqlite`
- **Linux**: `~/.local/share/HLVM/HLVM.sqlite`

## Reserved Names

The following names cannot be used as aliases:
- JavaScript built-ins: `Object`, `Array`, `String`, `Number`, `Boolean`, `Symbol`
- Global objects: `console`, `global`, `globalThis`, `window`, `document`
- HLVM core: `hlvm`, `Deno`
- Functions: `eval`, `alert`, `confirm`, `prompt`

## Examples

### Quick Actions Module
```javascript
// Create a set of productivity aliases
async function setupProductivityAliases() {
  await hlvm.modules.alias('todo', 'hlvm.modules.load');
  await hlvm.modules.alias('clip', 'hlvm.computer.clipboard.read');
  await hlvm.modules.alias('copy', 'hlvm.computer.clipboard.write');
  await hlvm.modules.alias('note', 'hlvm.computer.fs.write');
  await hlvm.modules.alias('snap', 'hlvm.computer.screen.capture');
  
  console.log("Productivity aliases ready!");
}

await setupProductivityAliases();

// Now use them
const task = await prompt("What's your task?");
await note(`/tmp/todo-${Date.now()}.txt`, task);
await copy(`Task saved: ${task}`);
```

### Context-Aware Aliases
```javascript
// Create aliases that work with context
await hlvm.modules.alias('process', 'hlvm.modules.load');

// Load and run a text processor on clipboard
const text = await clip();
const processor = await process('text-formatter');
const result = await processor(text);
await copy(result);
```

### Development Aliases
```javascript
// Aliases for development workflow
await hlvm.modules.alias('test', 'hlvm.system.exec');
await hlvm.modules.alias('build', 'hlvm.system.exec');
await hlvm.modules.alias('run', 'hlvm.system.exec');

// Use them
await test('./test.sh');
await build('npm run build');
await run('npm start');
```

## Tips

1. **Name aliases intuitively** - Use short, memorable names
2. **Group related aliases** - Create setup functions for related aliases
3. **Document your aliases** - Keep a list of your custom aliases
4. **Avoid conflicts** - Check existing globals before creating aliases
5. **Use for frequent operations** - Aliases save typing for repetitive tasks

## Removing All Aliases

To remove all aliases at once:
```javascript
const aliases = hlvm.modules.aliases();
for (const a of aliases) {
  hlvm.modules.removeAlias(a.name);
}
console.log("All aliases removed");
```