# HLVM Context Module

The Context module provides instant access to the current state of your system - what's copied, what's selected, and what's on screen. It's designed for developer productivity, making it trivial to capture and pass context to other operations.

## Overview

The Context module (`hlvm.computer.context`) provides three essential properties that capture the developer's current working state:

- **clipboard** - Text currently in the system clipboard
- **selection** - Text currently selected (if available)
- **screen** - Visual context from the display

## API Reference

### `hlvm.computer.context.clipboard`

Returns the current clipboard content as a string.

**Type:** `string`

**Example:**
```javascript
// Get what's currently copied
const copied = hlvm.computer.context.clipboard;
console.log(copied);

// Use with AI operations
const improved = await hlvm.ai.ollama.improve(
  hlvm.computer.context.clipboard
);
```

### `hlvm.computer.context.selection`

Returns the currently selected text from any application. This is an async property that attempts multiple strategies to capture selection.

**Type:** `Promise<string | null>`

**Returns:** 
- Selected text as string if available
- `null` if no selection or unable to capture

**Platform Notes:**
- **macOS**: Uses accessibility APIs or AppleScript
- **Linux**: Reads from primary selection (requires xclip/xsel)
- **Windows**: Limited support, may return null

**Example:**
```javascript
// Get selected text
const selected = await hlvm.computer.context.selection;
if (selected) {
  console.log("Selected:", selected);
} else {
  console.log("No text selected");
}

// Explain selected code
const explanation = await hlvm.ai.ollama.explain(
  await hlvm.computer.context.selection
);
```

### `hlvm.computer.context.screen`

An object providing access to visual screen content.

#### `hlvm.computer.context.screen.image`

Returns a screenshot of the current display as binary image data.

**Type:** `Uint8Array`

**Example:**
```javascript
// Capture current screen
const screenshot = hlvm.computer.context.screen.image;

// Save screenshot
await hlvm.fs.writeBytes('/tmp/screen.png', screenshot);

// Send to vision AI
const analysis = await hlvm.ai.vision.analyze(
  hlvm.computer.context.screen.image
);
```

#### `hlvm.computer.context.screen.text`

Extracts text from the current screen using OCR (Optical Character Recognition).

**Type:** `string`

**Platform Notes:**
- **macOS**: Uses Vision framework (experimental)
- **Linux**: Requires Tesseract installation
- **Windows**: OCR support pending

**Example:**
```javascript
// Extract text from what's visible
const screenText = hlvm.computer.context.screen.text;

// Find errors in visible text
if (screenText.includes("Error")) {
  const fix = await hlvm.ai.ollama.fix(screenText);
}
```

## Usage Patterns

### Basic Context Capture

```javascript
// Quick access to all contexts
const ctx = {
  clipboard: hlvm.computer.context.clipboard,
  selection: await hlvm.computer.context.selection,
  screen: hlvm.computer.context.screen.image
};
```

### AI-Powered Workflows

```javascript
// Improve copied code
const improved = await hlvm.ai.ollama.generate({
  model: 'codellama',
  prompt: `Improve this code: ${hlvm.computer.context.clipboard}`
});

// Explain what's on screen
const explanation = await hlvm.ai.ollama.vision({
  model: 'llava',
  image: hlvm.computer.context.screen.image,
  prompt: 'What error is shown in this screenshot?'
});

// Fix selected error
const selected = await hlvm.computer.context.selection;
if (selected && selected.includes('Error')) {
  const fix = await hlvm.ai.ollama.fix(selected);
  await hlvm.computer.clipboard.write(fix);
}
```

### Context-Aware Automation

```javascript
// Auto-document copied function
async function documentCode() {
  const code = hlvm.computer.context.clipboard;
  
  const docs = await hlvm.ai.ollama.generate({
    model: 'codellama',
    prompt: `Generate JSDoc for: ${code}`
  });
  
  return docs;
}

// Screenshot and explain UI bug
async function debugUI() {
  const screen = hlvm.computer.context.screen.image;
  const analysis = await hlvm.ai.vision.analyze(screen);
  
  await hlvm.fs.write('/tmp/bug-report.md', `
# UI Bug Report
${new Date().toISOString()}

## Visual Analysis
${analysis}

## Screenshot
![Screenshot](/tmp/screenshot.png)
  `);
  
  await hlvm.fs.writeBytes('/tmp/screenshot.png', screen);
}
```

## Design Philosophy

The Context module follows these principles:

1. **Zero Configuration** - Works immediately without setup
2. **Synchronous Where Possible** - Clipboard and screen are instant
3. **Graceful Degradation** - Returns sensible defaults when context unavailable
4. **Type Preservation** - Maintains data types (text as string, images as bytes)
5. **Composable** - Contexts flow naturally into other operations

## Implementation Notes

- **Clipboard** reads from system clipboard using OS-native commands
- **Selection** attempts multiple strategies, falls back to null
- **Screen** captures primary monitor by default
- **OCR** is experimental and platform-dependent

## Platform Compatibility

| Feature | macOS | Linux | Windows |
|---------|-------|-------|---------|
| clipboard | ✅ | ✅ | ✅ |
| selection | ✅ | ⚠️ | ❌ |
| screen.image | ✅ | ✅ | ✅ |
| screen.text | ⚠️ | ⚠️ | ❌ |

Legend:
- ✅ Full support
- ⚠️ Partial support / requires additional tools
- ❌ Not yet implemented

## Examples

### Quick Productivity Scripts

```javascript
// Copy improved version back to clipboard
await hlvm.computer.clipboard.write(
  await hlvm.ai.ollama.improve(hlvm.computer.context.clipboard)
);

// Explain error on screen
console.log(
  await hlvm.ai.ollama.explain(hlvm.computer.context.screen.text)
);

// Translate selected text
const translated = await hlvm.ai.ollama.translate(
  await hlvm.computer.context.selection,
  { to: 'spanish' }
);
```

## See Also

- [Clipboard Module](./clipboard.md) - Direct clipboard operations
- [Screen Module](./screen.md) - Advanced screen capture
- [AI Module](./ai.md) - AI integrations for context processing