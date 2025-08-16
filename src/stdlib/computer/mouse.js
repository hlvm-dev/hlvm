// Mouse module - Cross-platform mouse automation

import * as platform from "../core/platform.js";

export async function move(x, y) {
  if (platform.isDarwin) {
    // macOS: Try cliclick first, fallback to Python
    try {
      await new Deno.Command("cliclick", {
        args: [`m:${x},${y}`]
      }).output();
    } catch {
      // Fallback to Python (built-in on macOS)
      const script = `
import Quartz
Quartz.CGWarpMouseCursorPosition((${x}, ${y}))
      `;
      await new Deno.Command("python3", {
        args: ["-c", script]
      }).output();
    }
    
  } else if (platform.isWindows) {
    // Windows: PowerShell (built-in)
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
    `;
    await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    
  } else {
    // Linux: Try xdotool or ydotool
    try {
      await new Deno.Command("xdotool", {
        args: ["mousemove", String(x), String(y)]
      }).output();
    } catch {
      try {
        await new Deno.Command("ydotool", {
          args: ["mousemove", String(x), String(y)]
        }).output();
      } catch {
        throw new Error(
          "Mouse move failed. Install xdotool (X11) or ydotool (Wayland)"
        );
      }
    }
  }
}

export async function click(x = null, y = null, button = "left") {
  // Move to position if specified
  if (x !== null && y !== null) {
    await move(x, y);
  }
  
  if (platform.isDarwin) {
    // macOS: Try cliclick first, fallback to Python
    try {
      const clickType = button === "right" ? "rc" : button === "middle" ? "mc" : "c";
      const args = x !== null && y !== null 
        ? [`${clickType}:${x},${y}`]
        : [clickType];
      
      await new Deno.Command("cliclick", { args }).output();
    } catch {
      // Fallback to Python
      const buttonMap = {
        "left": "Quartz.kCGMouseButtonLeft",
        "right": "Quartz.kCGMouseButtonRight",
        "middle": "Quartz.kCGMouseButtonCenter"
      };
      
      const script = `
import Quartz
import time

# Get current position if not specified
${x === null ? `
pos = Quartz.NSEvent.mouseLocation()
x, y = pos.x, pos.y
` : `x, y = ${x}, ${y}`}

# Create mouse events
event = Quartz.CGEventCreateMouseEvent(
    None,
    Quartz.kCGEventLeftMouseDown if "${button}" == "left" else 
    Quartz.kCGEventRightMouseDown if "${button}" == "right" else
    Quartz.kCGEventOtherMouseDown,
    (x, y),
    ${buttonMap[button] || buttonMap.left}
)
Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)

event = Quartz.CGEventCreateMouseEvent(
    None,
    Quartz.kCGEventLeftMouseUp if "${button}" == "left" else
    Quartz.kCGEventRightMouseUp if "${button}" == "right" else
    Quartz.kCGEventOtherMouseUp,
    (x, y),
    ${buttonMap[button] || buttonMap.left}
)
Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)
      `;
      
      await new Deno.Command("python3", {
        args: ["-c", script]
      }).output();
    }
    
  } else if (platform.isWindows) {
    // Windows: PowerShell with mouse_event
    const buttonFlags = {
      left: { down: "0x0002", up: "0x0004" },
      right: { down: "0x0008", up: "0x0010" },
      middle: { down: "0x0020", up: "0x0040" }
    };
    
    const flags = buttonFlags[button] || buttonFlags.left;
    
    const script = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Mouse {
          [DllImport("user32.dll")]
          public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
        }
"@
      
      ${x !== null && y !== null ? `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
      ` : ""}
      
      [Mouse]::mouse_event(${flags.down}, 0, 0, 0, 0)
      [Mouse]::mouse_event(${flags.up}, 0, 0, 0, 0)
    `;
    
    await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    
  } else {
    // Linux: xdotool or ydotool
    const buttonMap = {
      "left": "1",
      "middle": "2",
      "right": "3"
    };
    
    try {
      if (x !== null && y !== null) {
        await new Deno.Command("xdotool", {
          args: ["mousemove", String(x), String(y), "click", buttonMap[button] || "1"]
        }).output();
      } else {
        await new Deno.Command("xdotool", {
          args: ["click", buttonMap[button] || "1"]
        }).output();
      }
    } catch {
      try {
        if (x !== null && y !== null) {
          await new Deno.Command("ydotool", {
            args: ["mousemove", String(x), String(y)]
          }).output();
        }
        await new Deno.Command("ydotool", {
          args: ["click", buttonMap[button] || "1"]
        }).output();
      } catch {
        throw new Error(
          "Mouse click failed. Install xdotool (X11) or ydotool (Wayland)"
        );
      }
    }
  }
}

export async function position() {
  if (platform.isDarwin) {
    // macOS: Try cliclick first, fallback to Python
    try {
      const { stdout } = await new Deno.Command("cliclick", {
        args: ["p"]
      }).output();
      const pos = new TextDecoder().decode(stdout).trim();
      const [x, y] = pos.split(",").map(n => parseInt(n));
      return { x, y };
    } catch {
      // Fallback to Python
      const script = `
import Quartz
pos = Quartz.NSEvent.mouseLocation()
print(f"{int(pos.x)},{int(pos.y)}")
      `;
      const { stdout } = await new Deno.Command("python3", {
        args: ["-c", script]
      }).output();
      const [x, y] = new TextDecoder().decode(stdout).trim().split(",").map(n => parseInt(n));
      return { x, y };
    }
    
  } else if (platform.isWindows) {
    // Windows: PowerShell
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $pos = [System.Windows.Forms.Cursor]::Position
      Write-Host "$($pos.X),$($pos.Y)"
    `;
    const { stdout } = await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    const [x, y] = new TextDecoder().decode(stdout).trim().split(",").map(n => parseInt(n));
    return { x, y };
    
  } else {
    // Linux: xdotool or ydotool
    try {
      const { stdout } = await new Deno.Command("xdotool", {
        args: ["getmouselocation"]
      }).output();
      const output = new TextDecoder().decode(stdout);
      const x = parseInt(output.match(/x:(\d+)/)?.[1] || "0");
      const y = parseInt(output.match(/y:(\d+)/)?.[1] || "0");
      return { x, y };
    } catch {
      try {
        const { stdout } = await new Deno.Command("ydotool", {
          args: ["mousemove", "--get"]
        }).output();
        const [x, y] = new TextDecoder().decode(stdout).trim().split(" ").map(n => parseInt(n));
        return { x, y };
      } catch {
        throw new Error(
          "Mouse position failed. Install xdotool (X11) or ydotool (Wayland)"
        );
      }
    }
  }
}

// Double click
export async function doubleClick(x = null, y = null) {
  await click(x, y);
  await new Promise(r => setTimeout(r, 50)); // Small delay
  await click(x, y);
}

// Drag from one position to another
export async function drag(fromX, fromY, toX, toY) {
  if (platform.isDarwin) {
    try {
      await new Deno.Command("cliclick", {
        args: [`dd:${fromX},${fromY}`, `du:${toX},${toY}`]
      }).output();
    } catch {
      // Manual drag with Python
      await move(fromX, fromY);
      await click(fromX, fromY);
      await move(toX, toY);
      await click(toX, toY);
    }
    
  } else if (platform.isWindows) {
    // Windows: Mouse down, move, mouse up
    const script = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Mouse {
          [DllImport("user32.dll")]
          public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
        }
"@
      Add-Type -AssemblyName System.Windows.Forms
      
      # Move to start position
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${fromX}, ${fromY})
      # Mouse down
      [Mouse]::mouse_event(0x0002, 0, 0, 0, 0)
      # Move to end position
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${toX}, ${toY})
      # Mouse up
      [Mouse]::mouse_event(0x0004, 0, 0, 0, 0)
    `;
    await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    
  } else {
    // Linux: xdotool drag
    try {
      await new Deno.Command("xdotool", {
        args: ["mousemove", String(fromX), String(fromY), "mousedown", "1",
               "mousemove", String(toX), String(toY), "mouseup", "1"]
      }).output();
    } catch {
      // Manual drag
      await move(fromX, fromY);
      await click(fromX, fromY);
      await move(toX, toY);
      await click(toX, toY);
    }
  }
}