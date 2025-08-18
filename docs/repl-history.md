# HLVM REPL History Module

The `hlvm.repl` module provides command history functionality for the HLVM REPL, similar to shell history in terminals like bash or zsh.

## Overview

The REPL history module automatically saves commands to a SQLite database, providing persistent history across sessions. History is stored in the same database as HLVM modules at:
- macOS: `~/Library/Application Support/HLVM/HLVM.sqlite`
- Linux: `~/.local/share/HLVM/HLVM.sqlite`
- Windows: `%APPDATA%\HLVM\HLVM.sqlite`

## API Reference

### `hlvm.repl.get(limit?)`

Get command history entries.

**Parameters:**
- `limit` (optional): Number of most recent commands to return

**Returns:** Array of command strings

**Examples:**
```javascript
// Get all history
hlvm.repl.get()
// ["let x = 100", "hlvm.fs.write('/tmp/test.txt', 'hello')", ...]

// Get last 10 commands
hlvm.repl.get(10)
// Returns array of last 10 commands
```

### `hlvm.repl.search(pattern)`

Search history for commands containing the specified pattern.

**Parameters:**
- `pattern`: String to search for (case-sensitive)

**Returns:** Array of matching command strings

**Example:**
```javascript
// Find all commands containing "fs"
hlvm.repl.search("fs")
// ["hlvm.fs.write('/tmp/test.txt', 'data')", "hlvm.fs.read('/tmp/test.txt')"]
```

### `hlvm.repl.clear()`

Clear all command history.

**Returns:** `true`

**Example:**
```javascript
hlvm.repl.clear()
// true - all history removed
```

### `hlvm.repl.size()`

Get the total number of commands in history.

**Returns:** Number of history entries

**Example:**
```javascript
hlvm.repl.size()
// 142
```

### `hlvm.repl.last()`

Get the most recent command from history.

**Returns:** String of last command, or `null` if history is empty

**Example:**
```javascript
hlvm.repl.last()
// "hlvm.fs.read('/tmp/data.json')"
```

### `hlvm.repl._add(command)` (Internal)

Manually add a command to history. This is primarily for internal use or testing.

**Parameters:**
- `command`: String command to add

**Returns:** `true` if added, `false` if duplicate of last command

**Example:**
```javascript
hlvm.repl._add("custom command")
// true
```

## How It Works

1. **Automatic Capture**: In development mode (running from source), the REPL attempts to hook into Deno's evaluation mechanism to automatically capture commands.

2. **Manual Addition**: In compiled binaries, automatic capture may not work due to limitations in Deno's compiled REPL. Commands can still be manually added using `_add()`.

3. **Persistence**: All history is saved to SQLite immediately, ensuring commands are preserved across sessions.

4. **Duplicate Prevention**: Consecutive duplicate commands are not saved to avoid cluttering history.

## Database Schema

History is stored in the `repl_history` table:

```sql
CREATE TABLE repl_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command TEXT NOT NULL,
  timestamp INTEGER NOT NULL
)
```

## Usage Tips

1. **Cross-Session History**: History persists across REPL sessions, so you can access commands from previous sessions.

2. **Search Before Re-typing**: Use `hlvm.repl.search()` to quickly find and reference previous commands.

3. **Privacy**: Be cautious about sensitive data in commands. Use `hlvm.repl.clear()` to remove history if needed.

4. **Integration with GUI**: The same history is shared between CLI REPL and the HLVM GUI playground when both use the same database.

## Limitations

- **Compiled Binaries**: Automatic command capture may not work in compiled HLVM binaries due to Deno's REPL implementation. Manual addition via `_add()` still works.

- **No Multi-line Support**: Each command is stored as a single line. Multi-line commands may not be captured correctly.

- **No Deduplication Settings**: Currently, only consecutive duplicates are prevented. Global deduplication is not implemented.

## Examples

### View Recent Activity
```javascript
// See what you've been working on
hlvm.repl.get(20).forEach(cmd => console.log(cmd))
```

### Find Specific Work
```javascript
// Find all database operations
hlvm.repl.search("modules.save")
```

### Clean Slate
```javascript
// Start fresh
hlvm.repl.clear()
console.log(`History cleared. Count: ${hlvm.repl.size()}`)
// History cleared. Count: 0
```

### History Statistics
```javascript
const size = hlvm.repl.size();
const recent = hlvm.repl.get(10);
console.log(`Total commands: ${size}`);
console.log(`Recent focus: ${recent.filter(c => c.includes('fs')).length} filesystem ops`);
```