# HLVM Context Module

The Context module provides instant access to the current state of your system - what's selected and what's on screen. It's designed for developer productivity, making it trivial to capture and pass context to other operations.

## Overview

The Context module (`hlvm.computer.context`) provides two essential properties that capture the developer's current working state:

- **selection** - Text currently selected (if available)
- **screen** - Visual context from the display

Note: For clipboard operations, use `hlvm.computer.clipboard.read()` and `hlvm.computer.clipboard.write()`

## API Reference

### `hlvm.computer.context.selection`

Returns the currently selected text, or `null` if no selection is available.

**Type:** `Promise<string | null>`

**Example:**
```javascript
// Get currently selected text
const selected = await hlvm.computer.context.selection;
if (selected) {
  console.log("Selected:", selected);
}
```

---

### `hlvm.computer.context.screen`

Provides access to screen content.

#### `hlvm.computer.context.screen.image`

Returns the current screen as binary image data (PNG).

**Type:** `Uint8Array`

**Example:**
```javascript
// Capture current screen
const imageData = hlvm.computer.context.screen.image;
console.log(`Screen captured: ${imageData.length} bytes`);

// Save to file
await hlvm.computer.fs.writeBytes('/tmp/screen.png', imageData);
```

#### `hlvm.computer.context.screen.text`

Returns text extracted from the screen via OCR.

**Type:** `string`

**Note:** OCR is not yet implemented, returns placeholder text.

**Example:**
```javascript
// Get text from screen (when implemented)
const screenText = hlvm.computer.context.screen.text;
console.log(screenText);
```

---

## Use Cases

### Quick Capture

```javascript
// Capture current working state
const state = {
  clipboard: await hlvm.computer.clipboard.read(), // Use clipboard module
  selection: await hlvm.computer.context.selection,
  screen: hlvm.computer.context.screen.image
};
```

### Text Enhancement

```javascript
// Improve selected text
const selected = await hlvm.computer.context.selection;
if (selected) {
  const improved = await hlvm.ai.ollama.chat(
    `Improve this text: ${selected}`
  );
  await hlvm.computer.clipboard.write(improved);
}
```

### Error Detection

```javascript
// Check if selected text contains error
const selected = await hlvm.computer.context.selection;
if (selected && selected.includes('Error')) {
  const fix = await hlvm.ai.ollama.chat(
    `Fix this error: ${selected}`
  );
  await hlvm.computer.clipboard.write(fix);
}
```

### Visual Context

```javascript
// Capture screen for documentation
const screen = hlvm.computer.context.screen.image;
await hlvm.computer.fs.writeBytes(`/tmp/screenshot-${Date.now()}.png`, screen);
```

## Examples

### Auto-Document Code

```javascript
// Document code from clipboard
async function documentCode() {
  const code = await hlvm.computer.clipboard.read();
  
  const docs = await hlvm.ai.ollama.generate({
    model: 'codellama',
    prompt: `Document this code:\n${code}`
  });
  
  await hlvm.ui.notification.notify("Documentation ready!", "HLVM");
  return docs;
}
```

### Context-Aware Assistant

```javascript
// Use all available context
async function assist() {
  const selected = await hlvm.computer.context.selection;
  const clipboard = await hlvm.computer.clipboard.read();
  
  if (selected) {
    // Work with selection
    console.log("Working with selection:", selected);
  } else if (clipboard) {
    // Fall back to clipboard
    console.log("Working with clipboard:", clipboard);
  }
}
```

## Implementation Notes

- **Selection** attempts multiple strategies, falls back to null
- **Screen** captures primary monitor by default
- All operations are synchronous except selection

## Platform Support

| Feature | macOS | Linux | Windows |
|---------|-------|-------|---------|
| selection | ✅ | ⚠️ | ❌ |
| screen.image | ✅ | ✅ | ✅ |
| screen.text | 🚧 | 🚧 | 🚧 |

Legend:
- ✅ Full support
- ⚠️ Requires external tools
- ❌ Not supported
- 🚧 In development

## Best Practices

1. **Check for null** - Selection may return null
2. **Handle large data** - Screen captures can be several MB
3. **Use appropriate context** - Don't capture screen if text will do

## See Also

- [Clipboard Module](./computer/clipboard.md) - Direct clipboard operations
- [Screen Module](./computer/screen.md) - Advanced screen capture
- [AI Module](./ai/ollama.md) - AI integrations for context processing