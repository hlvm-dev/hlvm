// Screen module - Cross-platform screen capture

import * as platform from "../core/platform.js";

export async function capture(output = null, options = {}) {
  // Use platform-specific temp file if no output specified
  if (!output) {
    const tempDir = platform.getTempDir();
    const timestamp = Date.now();
    output = `${tempDir}${platform.pathSep}screenshot-${timestamp}.png`;
  }
  
  if (platform.isDarwin) {
    // macOS: screencapture (built-in)
    const args = ["-x"]; // No sound
    
    if (options.interactive) {
      args.push("-i"); // Interactive mode (user selects window)
    }
    if (options.selection || options.select) {
      args.push("-s"); // Selection mode (user draws rectangle)
    }
    if (options.window) {
      args.push("-w"); // Window selection mode
    }
    if (options.delay) {
      args.push("-T", String(options.delay)); // Delay in seconds
    }
    
    args.push(output);
    
    const { success } = await new Deno.Command("screencapture", { args }).output();
    if (!success) throw new Error("Screenshot failed");
    
  } else if (platform.isWindows) {
    // Windows: PowerShell screenshot (built-in)
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bounds = $screen.Bounds
      $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
      $bitmap.Save("${output.replace(/\\/g, '\\\\')}")
      $graphics.Dispose()
      $bitmap.Dispose()
    `;
    
    const { success } = await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    if (!success) throw new Error("Screenshot failed");
    
  } else {
    // Linux: Try multiple screenshot tools
    const tools = [
      {
        cmd: "scrot",
        args: options.selection ? ["-s", output] : [output]
      },
      {
        cmd: "gnome-screenshot",
        args: options.selection 
          ? ["-a", "-f", output]
          : ["-f", output]
      },
      {
        cmd: "spectacle",
        args: options.selection
          ? ["-r", "-b", "-n", "-o", output]
          : ["-b", "-n", "-o", output]
      },
      {
        cmd: "import", // ImageMagick
        args: [output]
      }
    ];
    
    let captured = false;
    for (const tool of tools) {
      try {
        const { success } = await new Deno.Command(tool.cmd, {
          args: tool.args
        }).output();
        if (success) {
          captured = true;
          break;
        }
      } catch {
        // Try next tool
      }
    }
    
    if (!captured) {
      throw new Error(
        "Screenshot failed. Install one of: scrot, gnome-screenshot, spectacle, or imagemagick"
      );
    }
  }
  
  return output;
}

// Get screen dimensions (cross-platform)
export async function getScreenSize() {
  if (platform.isDarwin) {
    // macOS: Use system_profiler
    const { stdout } = await new Deno.Command("system_profiler", {
      args: ["SPDisplaysDataType", "-json"]
    }).output();
    
    try {
      const data = JSON.parse(new TextDecoder().decode(stdout));
      const display = data.SPDisplaysDataType[0].spdisplays_ndrvs[0];
      const resolution = display._spdisplays_resolution.match(/(\d+) x (\d+)/);
      if (resolution) {
        return {
          width: parseInt(resolution[1]),
          height: parseInt(resolution[2])
        };
      }
    } catch {}
    
  } else if (platform.isWindows) {
    // Windows: Use PowerShell
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      Write-Host "$($screen.Bounds.Width),$($screen.Bounds.Height)"
    `;
    
    const { stdout } = await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    
    const [width, height] = new TextDecoder().decode(stdout).trim().split(",");
    return {
      width: parseInt(width),
      height: parseInt(height)
    };
    
  } else {
    // Linux: Try xrandr or xdpyinfo
    try {
      const { stdout } = await new Deno.Command("xrandr", {
        args: ["--current"]
      }).output();
      
      const output = new TextDecoder().decode(stdout);
      const match = output.match(/primary (\d+)x(\d+)/);
      if (match) {
        return {
          width: parseInt(match[1]),
          height: parseInt(match[2])
        };
      }
    } catch {
      try {
        const { stdout } = await new Deno.Command("xdpyinfo").output();
        const output = new TextDecoder().decode(stdout);
        const match = output.match(/dimensions:\s+(\d+)x(\d+)/);
        if (match) {
          return {
            width: parseInt(match[1]),
            height: parseInt(match[2])
          };
        }
      } catch {}
    }
  }
  
  // Fallback
  return { width: 1920, height: 1080 };
}