// Screen module - Cross-platform screen capture

import { isDarwin, isWindows, tempDir, pathSep, decode } from "../core/platform.js";
import { platformCommand, PowerShellTemplates, checkSuccess, initDocs } from "../core/utils.js";

export async function capture(output = null, options = {}) {
  // Use platform-specific temp file if no output specified
  if (!output) {
    const tempDirectory = tempDir();
    const timestamp = Date.now();
    output = `${tempDirectory}${pathSep}screenshot-${timestamp}.png`;
  }
  
  // Build macOS args
  const darwinArgs = ["-x"]; // No sound
  if (options.interactive) darwinArgs.push("-i");
  if (options.selection || options.select) darwinArgs.push("-s");
  if (options.window) darwinArgs.push("-w");
  if (options.delay) darwinArgs.push("-T", String(options.delay));
  darwinArgs.push(output);
  
  // Build Linux tool configs
  const linuxTools = [
    { cmd: "scrot", args: options.selection ? ["-s", output] : [output] },
    { cmd: "gnome-screenshot", args: options.selection ? ["-a", "-f", output] : ["-f", output] },
    { cmd: "spectacle", args: options.selection ? ["-r", "-b", "-n", "-o", output] : ["-b", "-n", "-o", output] },
    { cmd: "import", args: [output] }
  ];
  
  const result = await platformCommand({
    darwin: { cmd: "screencapture", args: darwinArgs },
    windows: { script: PowerShellTemplates.screenshot(output) },
    linux: linuxTools
  });
  
  checkSuccess(result, "Screenshot capture");
  
  return output;
}

// Get screen dimensions (cross-platform)
export async function getScreenSize() {
  if (isDarwin) {
    // macOS: Use system_profiler
    const { stdout } = await new Deno.Command("system_profiler", {
      args: ["SPDisplaysDataType", "-json"]
    }).output();
    
    try {
      const data = JSON.parse(decode(stdout));
      const display = data.SPDisplaysDataType[0].spdisplays_ndrvs[0];
      const resolution = display._spdisplays_resolution.match(/(\d+) x (\d+)/);
      if (resolution) {
        return {
          width: parseInt(resolution[1]),
          height: parseInt(resolution[2])
        };
      }
    } catch {}
    
  } else if (isWindows) {
    // Windows: Use PowerShell
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      Write-Host "$($screen.Bounds.Width),$($screen.Bounds.Height)"
    `;
    
    const { stdout } = await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    
    const [width, height] = decode(stdout).trim().split(",");
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
      
      const output = decode(stdout);
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
        const output = decode(stdout);
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


// Initialize docs on module load
initDocs({ capture, getScreenSize }, {
  capture: `capture(output?, options?)
Captures a screenshot to file
Parameters: output - file path, options - {selection, window, delay}
Returns: output path`,
  
  getScreenSize: `getScreenSize()
Gets primary screen dimensions
Returns: {width, height} in pixels`
});
