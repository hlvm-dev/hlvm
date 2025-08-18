// Mouse module - Cross-platform mouse automation

import { runPlatformCommand } from "../core/command.js";
import { PS } from "../core/platform.js";

export async function move(x, y) {
  await runPlatformCommand({
    mac: {
      cmd: "cliclick",
      args: [`m:${x},${y}`],
      fallback: {
        cmd: "python3",
        args: ["-c", `
import Quartz
Quartz.CGWarpMouseCursorPosition((${x}, ${y}))
        `]
      }
    },
    windows: {
      script: `
        ${PS.forms}
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
      `
    },
    linux: {
      xdotool: ["mousemove", String(x), String(y)],
      ydotool: ["mousemove", String(x), String(y)],
      errorMsg: "Mouse move failed. Install xdotool (X11) or ydotool (Wayland)"
    }
  });
}

export async function click(x = null, y = null, button = "left") {
  // Move to position if specified
  if (x !== null && y !== null) {
    await move(x, y);
  }
  
  const buttonMap = {
    linux: { "left": "1", "middle": "2", "right": "3" },
    mac: { "left": "c", "right": "rc", "middle": "mc" }
  };
  
  await runPlatformCommand({
    mac: {
      cmd: "cliclick",
      args: x !== null && y !== null 
        ? [`${buttonMap.mac[button]}:${x},${y}`]
        : [buttonMap.mac[button]],
      fallback: {
        cmd: "python3",
        args: ["-c", `
import Quartz
import time

# Get current position if not specified
${x === null ? `
pos = Quartz.NSEvent.mouseLocation()
x, y = pos.x, pos.y
` : `x, y = ${x}, ${y}`}

# Create mouse events
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
Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)
        `]
      }
    },
    windows: {
      script: `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class Mouse {
            [DllImport("user32.dll")]
            public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
          }
"@
        
        ${x !== null && y !== null ? `
        ${PS.forms}
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
        ` : ""}
        
        $flags = @{
          left = @{ down = 0x0002; up = 0x0004 }
          right = @{ down = 0x0008; up = 0x0010 }
          middle = @{ down = 0x0020; up = 0x0040 }
        }
        
        $buttonFlags = $flags["${button}"]
        if (-not $buttonFlags) { $buttonFlags = $flags.left }
        
        [Mouse]::mouse_event($buttonFlags.down, 0, 0, 0, 0)
        [Mouse]::mouse_event($buttonFlags.up, 0, 0, 0, 0)
      `
    },
    linux: {
      xdotool: x !== null && y !== null 
        ? ["mousemove", String(x), String(y), "click", buttonMap.linux[button] || "1"]
        : ["click", buttonMap.linux[button] || "1"],
      ydotool: x !== null && y !== null
        ? ["mousemove", String(x), String(y), "click", buttonMap.linux[button] || "1"]
        : ["click", buttonMap.linux[button] || "1"],
      errorMsg: "Mouse click failed. Install xdotool (X11) or ydotool (Wayland)"
    }
  });
}

export async function position() {
  const result = await runPlatformCommand({
    mac: {
      cmd: "cliclick",
      args: ["p"],
      fallback: {
        cmd: "python3",
        args: ["-c", `
import Quartz
pos = Quartz.NSEvent.mouseLocation()
print(f"{int(pos.x)},{int(pos.y)}")
        `]
      }
    },
    windows: {
      script: `
        ${PS.forms}
        $pos = [System.Windows.Forms.Cursor]::Position
        Write-Host "$($pos.X),$($pos.Y)"
      `
    },
    linux: {
      cmd: "xdotool",
      args: ["getmouselocation"],
      fallback: [
        { cmd: "ydotool", args: ["mousemove", "--get"] }
      ],
      errorMsg: "Mouse position failed. Install xdotool (X11) or ydotool (Wayland)"
    }
  });
  
  // Parse position from result
  if (typeof result === 'string') {
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
    const parts = output.split(" ").map(n => parseInt(n));
    if (parts.length >= 2) {
      return { x: parts[0], y: parts[1] };
    }
  }
  
  throw new Error("Failed to get mouse position");
}

// Double click
export async function doubleClick(x = null, y = null) {
  await click(x, y);
  await new Promise(r => setTimeout(r, 50)); // Small delay
  await click(x, y);
}

// Drag from one position to another
export async function drag(fromX, fromY, toX, toY) {
  await runPlatformCommand({
    mac: {
      cmd: "cliclick",
      args: [`dd:${fromX},${fromY}`, `du:${toX},${toY}`],
      fallback: async () => {
        await move(fromX, fromY);
        await click(fromX, fromY);
        await move(toX, toY);
        await click(toX, toY);
      }
    },
    windows: {
      script: `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class Mouse {
            [DllImport("user32.dll")]
            public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
          }
"@
        ${PS.forms}
        
        # Move to start position
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${fromX}, ${fromY})
        # Mouse down
        [Mouse]::mouse_event(0x0002, 0, 0, 0, 0)
        # Move to end position
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${toX}, ${toY})
        # Mouse up
        [Mouse]::mouse_event(0x0004, 0, 0, 0, 0)
      `
    },
    linux: {
      xdotool: ["mousemove", String(fromX), String(fromY), "mousedown", "1",
                "mousemove", String(toX), String(toY), "mouseup", "1"],
      ydotool: ["mousemove", String(fromX), String(fromY), "mousedown", "1",
                "mousemove", String(toX), String(toY), "mouseup", "1"],
      fallback: async () => {
        await move(fromX, fromY);
        await click(fromX, fromY);
        await move(toX, toY);
        await click(toX, toY);
      }
    }
  });
}