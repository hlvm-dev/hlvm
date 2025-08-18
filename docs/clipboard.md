# hlvm.clipboard

Clipboard read and write operations.

## Functions

### read()

Read text from clipboard.

```javascript
const text = await hlvm.clipboard.read();
console.log('Clipboard contains:', text);
```

**Returns:** Promise<string> - Clipboard text content

---

### write(text)

Write text to clipboard.

```javascript
await hlvm.clipboard.write("This text is now in clipboard");
```

**Parameters:**
- `text` (string) - Text to copy to clipboard

**Returns:** Promise<void>

---

### readImage()

Read image from clipboard as base64.

```javascript
const imageData = await hlvm.clipboard.readImage();
if (imageData) {
  // Save base64 image to file
  await hlvm.fs.write('/tmp/clipboard.png', imageData);
}
```

**Returns:** Promise<string|null> - Base64 encoded image or null

---

### writeImage(path)

Copy image file to clipboard.

```javascript
await hlvm.clipboard.writeImage('/path/to/image.png');
```

**Parameters:**
- `path` (string) - Path to image file

**Returns:** Promise<void>

## Global Shorthand

### context

Global property that returns current clipboard text.

```javascript
// Equivalent to await hlvm.clipboard.read()
console.log(context);
```

## Examples

### Copy File Content

```javascript
const content = await hlvm.fs.read('/tmp/data.txt');
await hlvm.clipboard.write(content);
await hlvm.notification.notify("File copied to clipboard", "Success");
```

### Paste and Process

```javascript
const data = await hlvm.clipboard.read();
const processed = data.toUpperCase();
await hlvm.clipboard.write(processed);
```

### Clipboard History

```javascript
// Store clipboard history
if (!hlvm.clipboardHistory) {
  hlvm.clipboardHistory = [];
}

const current = await hlvm.clipboard.read();
hlvm.clipboardHistory.push({
  content: current,
  timestamp: new Date().toISOString()
});

// Keep only last 10 items
hlvm.clipboardHistory = hlvm.clipboardHistory.slice(-10);
```

### Image Screenshot Workflow

```javascript
// Capture screenshot
await hlvm.screen.capture('/tmp/screenshot.png');

// Copy to clipboard
await hlvm.clipboard.writeImage('/tmp/screenshot.png');

// Notify user
await hlvm.notification.notify("Screenshot copied!", "Success");
```

### Transform Clipboard Content

```javascript
async function transformClipboard(transformer) {
  const text = await hlvm.clipboard.read();
  const transformed = transformer(text);
  await hlvm.clipboard.write(transformed);
  return transformed;
}

// Usage
await transformClipboard(text => text.toLowerCase());
await transformClipboard(text => JSON.stringify(JSON.parse(text), null, 2));
```

### Clipboard Monitor

```javascript
let lastClipboard = await hlvm.clipboard.read();

async function monitorClipboard() {
  const current = await hlvm.clipboard.read();
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
- Image clipboard support varies by platform
- Large content may have size limitations