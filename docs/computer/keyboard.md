# hlvm.keyboard

Keyboard automation and input simulation.

## Functions

### type(text, options)

Type text with optional delay.

```javascript
await hlvm.keyboard.type("Hello World");

// With delay between keystrokes
await hlvm.keyboard.type("Slow typing", { delay: 100 });
```

**Parameters:**
- `text` (string) - Text to type
- `options` (object) - Optional settings
  - `delay` (number) - Milliseconds between keystrokes

**Returns:** Promise<void>

---

### press(key, modifiers)

Press key or key combination.

```javascript
// Single key
await hlvm.keyboard.press("enter");

// With modifiers
await hlvm.keyboard.press("c", ["cmd"]);        // Cmd+C
await hlvm.keyboard.press("v", ["cmd", "shift"]); // Cmd+Shift+V
```

**Parameters:**
- `key` (string) - Key to press
- `modifiers` (string[]) - Modifier keys: "cmd", "ctrl", "alt", "shift"

**Returns:** Promise<void>

## Key Names

Common keys:
- `enter`, `return`
- `tab`
- `delete`, `backspace`
- `escape`, `esc`
- `space`
- `up`, `down`, `left`, `right`
- `home`, `end`
- `pageup`, `pagedown`
- `f1` - `f12`
- `a` - `z`
- `0` - `9`

## Examples

### Basic Typing

```javascript
await hlvm.keyboard.type("Hello World");
await hlvm.keyboard.press("enter");
```

### Copy and Paste

```javascript
// Select all and copy
await hlvm.keyboard.press("a", ["cmd"]);
await hlvm.keyboard.press("c", ["cmd"]);

// Paste
await hlvm.keyboard.press("v", ["cmd"]);
```

### Form Filling

```javascript
async function fillForm(data) {
  await hlvm.keyboard.type(data.name);
  await hlvm.keyboard.press("tab");
  
  await hlvm.keyboard.type(data.email);
  await hlvm.keyboard.press("tab");
  
  await hlvm.keyboard.type(data.message);
  
  // Submit
  await hlvm.keyboard.press("enter");
}
```

### Navigation

```javascript
// Go to beginning of line
await hlvm.keyboard.press("home");

// Select to end of line
await hlvm.keyboard.press("end", ["shift"]);

// Delete selection
await hlvm.keyboard.press("delete");
```

### Automation Module

```javascript
await hlvm.app.spotlight.modules.add('auto-type', `
  export default async function() {
    const text = await hlvm.ui.notification.prompt("Text to type:");
    if (!text) return;
    
    await hlvm.ui.notification.notify(
      "Click where you want to type. Starting in 3 seconds...",
      "Auto Type"
    );
    
    await hlvm.system.sleep(3000);
    
    await hlvm.keyboard.type(text, { delay: 50 });
  }
`);
```

### Keyboard Shortcuts

```javascript
// Save
await hlvm.keyboard.press("s", ["cmd"]);

// Undo
await hlvm.keyboard.press("z", ["cmd"]);

// Redo
await hlvm.keyboard.press("z", ["cmd", "shift"]);

// Find
await hlvm.keyboard.press("f", ["cmd"]);

// New tab
await hlvm.keyboard.press("t", ["cmd"]);

// Close tab
await hlvm.keyboard.press("w", ["cmd"]);
```

### Text Manipulation

```javascript
async function replaceText(newText) {
  // Select all
  await hlvm.keyboard.press("a", ["cmd"]);
  
  // Type new text (replaces selection)
  await hlvm.keyboard.type(newText);
}
```

### Multi-line Input

```javascript
async function typeMultiline(lines) {
  for (let i = 0; i < lines.length; i++) {
    await hlvm.keyboard.type(lines[i]);
    if (i < lines.length - 1) {
      await hlvm.keyboard.press("enter");
    }
  }
}

// Usage
await typeMultiline([
  "Line 1",
  "Line 2",
  "Line 3"
]);
```

## Platform Notes

- **macOS**: Uses CGEventPost for native events
- **Windows**: Uses SendInput API
- **Linux**: Requires xdotool or similar

## Best Practices

1. Add delays for UI responsiveness
2. Use `sleep()` before automation starts
3. Test with different keyboard layouts
4. Handle special characters carefully
5. Consider clipboard for large text instead of typing