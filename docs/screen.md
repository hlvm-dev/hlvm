# hlvm.screen

Screen capture functionality.

## Functions

### capture(outputPath, options)

Capture screenshot to file.

```javascript
// Full screen capture
await hlvm.screen.capture('/tmp/screenshot.png');

// Interactive selection
await hlvm.screen.capture('/tmp/selection.png', {
  interactive: true
});
```

**Parameters:**
- `outputPath` (string) - Path to save screenshot
- `options` (object) - Optional settings
  - `interactive` (boolean) - Let user select area
  - `showCursor` (boolean) - Include mouse cursor
  - `windowId` (number) - Specific window ID

**Returns:** Promise<void>

## Examples

### Basic Screenshot

```javascript
await hlvm.screen.capture('/tmp/screen.png');
await hlvm.notification.notify("Screenshot saved", "Success");
```

### Interactive Capture

```javascript
// User selects area
await hlvm.screen.capture('/tmp/selection.png', {
  interactive: true
});
```

### Screenshot to Clipboard

```javascript
const path = '/tmp/screenshot.png';
await hlvm.screen.capture(path);
await hlvm.clipboard.writeImage(path);
await hlvm.notification.notify("Screenshot copied!", "Success");
```

### Timestamped Screenshots

```javascript
async function takeScreenshot() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const path = `/tmp/screenshot-${timestamp}.png`;
  
  await hlvm.screen.capture(path);
  
  return path;
}
```

### Screenshot Module

```javascript
await hlvm.app.spotlight.modules.add('screenshot', `
  export default async function() {
    const choice = await hlvm.notification.confirm(
      "Full screen?",
      "Screenshot"
    );
    
    const path = \`/tmp/screen-\${Date.now()}.png\`;
    
    if (choice) {
      await hlvm.screen.capture(path);
    } else {
      await hlvm.screen.capture(path, { interactive: true });
    }
    
    await hlvm.clipboard.writeImage(path);
    await hlvm.notification.notify("Screenshot copied!", "Done");
  }
`);
```

### OCR with Screenshot

```javascript
async function captureAndReadText() {
  const path = '/tmp/ocr-capture.png';
  
  // Capture area
  await hlvm.screen.capture(path, { interactive: true });
  
  // Use AI to extract text
  const text = await hlvm.ollama.chat(
    "Extract all text from this image",
    { image: path }
  );
  
  // Copy to clipboard
  await hlvm.clipboard.write(text);
  
  return text;
}
```

### Screen Recording Simulator

```javascript
async function recordScreen(duration, fps = 1) {
  const frames = [];
  const interval = 1000 / fps;
  const count = duration * fps;
  
  for (let i = 0; i < count; i++) {
    const path = `/tmp/frame-${i}.png`;
    await hlvm.screen.capture(path);
    frames.push(path);
    await hlvm.system.sleep(interval);
  }
  
  await hlvm.notification.notify(
    `Captured ${frames.length} frames`,
    "Recording Complete"
  );
  
  return frames;
}

// Record 5 seconds at 1 fps
await recordScreen(5, 1);
```

## Platform Notes

- **macOS**: Uses native `screencapture` command
- **Windows**: Uses Windows screenshot API
- **Linux**: Requires screenshot utility

## Options Details

### interactive
When `true`, allows user to:
- Click and drag to select area
- Press Space to switch to window selection
- Press Escape to cancel

### showCursor
Includes the mouse cursor in the screenshot.

### windowId
Captures specific window by ID (platform-specific).