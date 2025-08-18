# hlvm.computer.clipboard

Clipboard read and write operations.

## Functions

### read()

Read text from clipboard.

```javascript
const text = await hlvm.computer.clipboard.read();
console.log('Clipboard contains:', text);
```

**Returns:** Promise<string> - Clipboard text content

---

### write(text)

Write text to clipboard.

```javascript
await hlvm.computer.clipboard.write("This text is now in clipboard");
```

**Parameters:**
- `text` (string) - Text to copy to clipboard

**Returns:** Promise<void>

---

### isAvailable()

Check if clipboard is available on the system.

```javascript
const available = await hlvm.computer.clipboard.isAvailable();
if (available) {
  console.log("Clipboard operations supported");
}
```

**Returns:** Promise<boolean> - Whether clipboard is available

## Global Shorthand

### context

Global property that returns current clipboard text.

```javascript
// Equivalent to await hlvm.computer.clipboard.read()
const text = await context;
console.log(text);
```

## Examples

### Copy File Content

```javascript
const content = await hlvm.fs.read('/tmp/data.txt');
await hlvm.computer.clipboard.write(content);
await hlvm.ui.notification.notify("File copied to clipboard", "Success");
```

### Paste and Process

```javascript
const data = await hlvm.computer.clipboard.read();
const processed = data.toUpperCase();
await hlvm.computer.clipboard.write(processed);
```

### Clipboard History

```javascript
// Store clipboard history
if (!hlvm.clipboardHistory) {
  hlvm.clipboardHistory = [];
}

const current = await hlvm.computer.clipboard.read();
hlvm.clipboardHistory.push({
  content: current,
  timestamp: new Date().toISOString()
});

// Keep only last 10 items
hlvm.clipboardHistory = hlvm.clipboardHistory.slice(-10);
```

### Screenshot Workflow

```javascript
// Capture screenshot
await hlvm.computer.screen.capture('/tmp/screenshot.png');

// Copy to clipboard (as text path for now)
await hlvm.computer.clipboard.write('/tmp/screenshot.png');

// Notify user
await hlvm.ui.notification.notify("Screenshot saved!", "Success");
```

### Transform Clipboard Content

```javascript
async function transformClipboard(transformer) {
  const text = await hlvm.computer.clipboard.read();
  const transformed = transformer(text);
  await hlvm.computer.clipboard.write(transformed);
  return transformed;
}

// Usage
await transformClipboard(text => text.toLowerCase());
await transformClipboard(text => JSON.stringify(JSON.parse(text), null, 2));
```

### Clipboard Monitor

```javascript
let lastClipboard = await hlvm.computer.clipboard.read();

async function monitorClipboard() {
  const current = await hlvm.computer.clipboard.read();
  if (current !== lastClipboard) {
    console.log('Clipboard changed:', current);
    lastClipboard = current;
  }
}

// Check every second
setInterval(monitorClipboard, 1000);
```

## Platform Notes

- Text clipboard works on all platforms
- Uses `pbcopy`/`pbpaste` on macOS
- Uses `clip`/`powershell` on Windows  
- Uses `xclip`/`xsel` on Linux (requires installation)
- Large content may have size limitations