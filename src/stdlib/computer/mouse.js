// Mouse module - Cross-platform mouse automation

import { platformExecutor, appleScript, powerShell, linuxTools } from "../core/command.js";
import * as platform from "../core/platform.js";

/**
 * Move mouse cursor to specified position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Promise<void>}
 */
export async function move(x, y) {
  if (platform.isDarwin) {
    try {
      await platformExecutor.executeText("cliclick", [`m:${x},${y}`]);
    } catch {
      // Fallback to Python/Quartz
      const script = `
import Quartz
Quartz.CGWarpMouseCursorPosition((${x}, ${y}))`;
      await platformExecutor.executeText("python3", ["-c", script]);
    }
  } else if (platform.isWindows) {
    await powerShell.run(`
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
    `, ['forms', 'drawing']);
  } else {
    // Linux
    await linuxTools.tryTools([
      { cmd: "xdotool", args: ["mousemove", String(x), String(y)] },
      { cmd: "ydotool", args: ["mousemove", String(x), String(y)] }
    ]);
  }
}

/**
 * Click mouse button at position
 * @param {number|null} x - X coordinate (null for current position)
 * @param {number|null} y - Y coordinate (null for current position)
 * @param {string} button - Button to click (left|right|middle)
 * @returns {Promise<void>}
 */
export async function click(x = null, y = null, button = "left") {
  // Move to position if specified
  if (x !== null && y !== null) {
    await move(x, y);
  }
  
  if (platform.isDarwin) {
    const buttonMap = { "left": "c", "right": "rc", "middle": "mc" };
    const args = x !== null && y !== null 
      ? [`${buttonMap[button]}:${x},${y}`]
      : [buttonMap[button]];
    
    try {
      await platformExecutor.executeText("cliclick", args);
    } catch {
      // Fallback to Python/Quartz
      await clickWithQuartz(x, y, button);
    }
  } else if (platform.isWindows) {
    await clickWithWindows(x, y, button);
  } else {
    // Linux
    const buttonMap = { "left": "1", "middle": "2", "right": "3" };
    const buttonNum = buttonMap[button] || "1";
    
    if (x !== null && y !== null) {
      await linuxTools.tryTools([
        { cmd: "xdotool", args: ["mousemove", String(x), String(y), "click", buttonNum] },
        { cmd: "ydotool", args: ["mousemove", String(x), String(y), "click", buttonNum] }
      ]);
    } else {
      await linuxTools.tryTools([
        { cmd: "xdotool", args: ["click", buttonNum] },
        { cmd: "ydotool", args: ["click", buttonNum] }
      ]);
    }
  }
}

/**
 * Get current mouse position
 * @returns {Promise<{x: number, y: number}>} Current position
 */
export async function position() {
  let result;
  
  if (platform.isDarwin) {
    try {
      result = await platformExecutor.executeText("cliclick", ["p"]);
    } catch {
      // Fallback to Python/Quartz
      const script = `
import Quartz
pos = Quartz.NSEvent.mouseLocation()
print(f"{int(pos.x)},{int(pos.y)}")`;
      result = await platformExecutor.executeText("python3", ["-c", script]);
    }
  } else if (platform.isWindows) {
    result = await powerShell.run(`
$pos = [System.Windows.Forms.Cursor]::Position
Write-Host "$($pos.X),$($pos.Y)"
    `, ['forms']);
  } else {
    // Linux
    result = await linuxTools.tryTools([
      { cmd: "xdotool", args: ["getmouselocation"] },
      { cmd: "ydotool", args: ["mousemove", "--get"] }
    ]);
  }
  
  // Parse position from result
  const output = result.trim();
  
  // Linux xdotool format: "x:123 y:456 ..."
  if (output.includes("x:") && output.includes("y:")) {
    const x = parseInt(output.match(/x:(\d+)/)?.[1] || "0");
    const y = parseInt(output.match(/y:(\d+)/)?.[1] || "0");
    return { x, y };
  }
  
  // Common format: "123,456"
  if (output.includes(",")) {
    const [x, y] = output.split(",").map(n => parseInt(n));
    return { x, y };
  }
  
  // ydotool format: "123 456"
  const parts = output.split(/\s+/).map(n => parseInt(n));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { x: parts[0], y: parts[1] };
  }
  
  throw new Error("Failed to parse mouse position");
}

/**
 * Double click at position
 * @param {number|null} x - X coordinate
 * @param {number|null} y - Y coordinate
 * @returns {Promise<void>}
 */
export async function doubleClick(x = null, y = null) {
  await click(x, y);
  await new Promise(r => setTimeout(r, 50));
  await click(x, y);
}

/**
 * Drag from one position to another
 * @param {number} fromX - Start X coordinate
 * @param {number} fromY - Start Y coordinate
 * @param {number} toX - End X coordinate
 * @param {number} toY - End Y coordinate
 * @returns {Promise<void>}
 */
export async function drag(fromX, fromY, toX, toY) {
  if (platform.isDarwin) {
    try {
      await platformExecutor.executeText("cliclick", [`dd:${fromX},${fromY}`, `du:${toX},${toY}`]);
    } catch {
      // Fallback to basic move and click
      await move(fromX, fromY);
      await click(fromX, fromY);
      await move(toX, toY);
      await click(toX, toY);
    }
  } else if (platform.isWindows) {
    await powerShell.run(`
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Mouse {
    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
  }
"@

# Move to start position
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${fromX}, ${fromY})
# Mouse down
[Mouse]::mouse_event(0x0002, 0, 0, 0, 0)
# Move to end position
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${toX}, ${toY})
# Mouse up
[Mouse]::mouse_event(0x0004, 0, 0, 0, 0)
    `, ['forms', 'drawing']);
  } else {
    // Linux
    await linuxTools.tryTools([
      { 
        cmd: "xdotool", 
        args: ["mousemove", String(fromX), String(fromY), "mousedown", "1",
                "mousemove", String(toX), String(toY), "mouseup", "1"]
      },
      { 
        cmd: "ydotool", 
        args: ["mousemove", String(fromX), String(fromY), "mousedown", "1",
                "mousemove", String(toX), String(toY), "mouseup", "1"]
      }
    ]);
  }
}

// Helper functions for complex operations
async function clickWithQuartz(x, y, button) {
  const script = `
import Quartz

# Get current position if not specified
${x === null ? `
pos = Quartz.NSEvent.mouseLocation()
x, y = pos.x, pos.y
` : `x, y = ${x}, ${y}`}

button_map = {
  "left": Quartz.kCGMouseButtonLeft,
  "right": Quartz.kCGMouseButtonRight,
  "middle": Quartz.kCGMouseButtonCenter
}

event_down = {
  "left": Quartz.kCGEventLeftMouseDown,
  "right": Quartz.kCGEventRightMouseDown,
  "middle": Quartz.kCGEventOtherMouseDown
}

event_up = {
  "left": Quartz.kCGEventLeftMouseUp,
  "right": Quartz.kCGEventRightMouseUp,
  "middle": Quartz.kCGEventOtherMouseUp
}

button_type = button_map.get("${button}", button_map["left"])
down_type = event_down.get("${button}", event_down["left"])
up_type = event_up.get("${button}", event_up["left"])

event = Quartz.CGEventCreateMouseEvent(None, down_type, (x, y), button_type)
Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)

event = Quartz.CGEventCreateMouseEvent(None, up_type, (x, y), button_type)
Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)`;
  
  await platformExecutor.executeText("python3", ["-c", script]);
}

async function clickWithWindows(x, y, button) {
  const moveScript = x !== null && y !== null ? `
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
  ` : "";
  
  await powerShell.run(`
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Mouse {
    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
  }
"@

${moveScript}

$flags = @{
  left = @{ down = 0x0002; up = 0x0004 }
  right = @{ down = 0x0008; up = 0x0010 }
  middle = @{ down = 0x0020; up = 0x0040 }
}

$buttonFlags = $flags["${button}"]
if (-not $buttonFlags) { $buttonFlags = $flags.left }

[Mouse]::mouse_event($buttonFlags.down, 0, 0, 0, 0)
[Mouse]::mouse_event($buttonFlags.up, 0, 0, 0, 0)
  `, ['forms']);
}