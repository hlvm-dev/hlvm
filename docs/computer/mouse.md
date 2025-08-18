# hlvm.mouse

Mouse control and automation.

## Functions

### position()

Get current mouse position.

```javascript
const pos = await hlvm.mouse.position();
console.log(`Mouse at: ${pos.x}, ${pos.y}`);
```

**Returns:** Promise<{x: number, y: number}>

---

### move(x, y)

Move mouse to position.

```javascript
await hlvm.mouse.move(100, 200);
```

**Parameters:**
- `x` (number) - X coordinate
- `y` (number) - Y coordinate

**Returns:** Promise<void>

---

### click(x, y, options)

Click at position.

```javascript
// Left click
await hlvm.mouse.click(100, 200);

// Right click
await hlvm.mouse.click(100, 200, { button: "right" });

// Double click
await hlvm.mouse.click(100, 200, { clickCount: 2 });
```

**Parameters:**
- `x` (number) - X coordinate
- `y` (number) - Y coordinate
- `options` (object) - Optional settings
  - `button` (string) - "left", "right", or "middle"
  - `clickCount` (number) - Number of clicks (2 for double-click)

**Returns:** Promise<void>

---

### drag(fromX, fromY, toX, toY)

Drag from one position to another.

```javascript
await hlvm.mouse.drag(100, 100, 300, 300);
```

**Parameters:**
- `fromX` (number) - Starting X
- `fromY` (number) - Starting Y
- `toX` (number) - Ending X
- `toY` (number) - Ending Y

**Returns:** Promise<void>

---

### scroll(deltaX, deltaY)

Scroll by delta amount.

```javascript
// Scroll down
await hlvm.mouse.scroll(0, -100);

// Scroll up
await hlvm.mouse.scroll(0, 100);
```

**Parameters:**
- `deltaX` (number) - Horizontal scroll
- `deltaY` (number) - Vertical scroll

**Returns:** Promise<void>

## Examples

### Basic Click

```javascript
await hlvm.mouse.click(500, 300);
```

### Right Click Menu

```javascript
await hlvm.mouse.click(400, 200, { button: "right" });
```

### Double Click to Open

```javascript
await hlvm.mouse.click(100, 100, { clickCount: 2 });
```

### Drag and Drop

```javascript
// Drag file from one location to another
await hlvm.mouse.drag(100, 100, 500, 400);
```

### Mouse Position Tracker

```javascript
async function trackMouse() {
  const positions = [];
  
  for (let i = 0; i < 10; i++) {
    const pos = await hlvm.mouse.position();
    positions.push(pos);
    console.log(`Position ${i}: ${pos.x}, ${pos.y}`);
    await hlvm.system.sleep(1000);
  }
  
  return positions;
}
```

### Click at Current Position

```javascript
const pos = await hlvm.mouse.position();
await hlvm.mouse.click(pos.x, pos.y);
```

### Draw Square

```javascript
async function drawSquare(x, y, size) {
  await hlvm.mouse.move(x, y);
  await hlvm.mouse.drag(x, y, x + size, y);
  await hlvm.mouse.drag(x + size, y, x + size, y + size);
  await hlvm.mouse.drag(x + size, y + size, x, y + size);
  await hlvm.mouse.drag(x, y + size, x, y);
}

await drawSquare(100, 100, 200);
```

### Auto Clicker Module

```javascript
await hlvm.app.spotlight.modules.add('auto-clicker', `
  export default async function() {
    const count = await hlvm.notification.prompt(
      "Number of clicks:",
      "10"
    );
    
    if (!count) return;
    
    await hlvm.notification.notify(
      "Position mouse and wait 3 seconds...",
      "Auto Clicker"
    );
    
    await hlvm.system.sleep(3000);
    
    const pos = await hlvm.mouse.position();
    
    for (let i = 0; i < parseInt(count); i++) {
      await hlvm.mouse.click(pos.x, pos.y);
      await hlvm.system.sleep(100);
    }
    
    await hlvm.notification.notify("Done!", "Auto Clicker");
  }
`);
```

### Smooth Movement

```javascript
async function smoothMove(toX, toY, steps = 10) {
  const from = await hlvm.mouse.position();
  const deltaX = (toX - from.x) / steps;
  const deltaY = (toY - from.y) / steps;
  
  for (let i = 1; i <= steps; i++) {
    await hlvm.mouse.move(
      Math.round(from.x + deltaX * i),
      Math.round(from.y + deltaY * i)
    );
    await hlvm.system.sleep(50);
  }
}

// Smooth move to position
await smoothMove(500, 500);
```

### Selection Rectangle

```javascript
async function selectArea(x1, y1, x2, y2) {
  await hlvm.mouse.move(x1, y1);
  await hlvm.system.sleep(100);
  await hlvm.mouse.drag(x1, y1, x2, y2);
}

// Select area from (100,100) to (400,300)
await selectArea(100, 100, 400, 300);
```

## Platform Notes

- **macOS**: Uses Core Graphics for mouse events
- **Windows**: Uses Windows Input API
- **Linux**: Requires X11 libraries

## Coordinate System

- Origin (0,0) is top-left of primary screen
- X increases to the right
- Y increases downward
- Multi-monitor setups may have negative coordinates