// Core utilities for DRY principles across stdlib
import { isDarwin, isWindows, decode } from "./platform.js";

// ─────────────────────────────────────────────────────────────────────────────
// Platform-specific command execution with fallback support

/**
 * Execute platform-specific commands with automatic OS detection
 * @param {Object} commands - Platform-specific command configurations
 * @param {Object} commands.darwin - macOS command config {cmd, args}
 * @param {Object} commands.windows - Windows command config {cmd, args} or {script} for PowerShell
 * @param {Array|Object} commands.linux - Linux command(s) - can be array for fallback tools
 * @returns {Promise<Object>} Command result with {success, stdout, stderr, code}
 */
export async function platformCommand(commands) {
  if (isDarwin && commands.darwin) {
    return await runCommand(commands.darwin);
  }
  
  if (isWindows && commands.windows) {
    if (commands.windows.script) {
      // PowerShell script execution
      return await runPowerShell(commands.windows.script);
    }
    return await runCommand(commands.windows);
  }
  
  if (commands.linux) {
    // Linux with fallback support for multiple tools
    const tools = Array.isArray(commands.linux) ? commands.linux : [commands.linux];
    return await runWithFallback(tools);
  }
  
  throw new Error(`Unsupported platform: ${Deno.build.os}`);
}

/**
 * Run a single command
 */
async function runCommand(config) {
  const { cmd, args = [] } = config;
  const command = new Deno.Command(cmd, { args });
  const result = await command.output();
  return {
    success: result.success,
    stdout: decode(result.stdout),
    stderr: decode(result.stderr),
    code: result.code
  };
}

/**
 * Run PowerShell script on Windows
 */
async function runPowerShell(script) {
  return await runCommand({
    cmd: "powershell",
    args: ["-NoProfile", "-Command", script]
  });
}

/**
 * Try multiple Linux tools until one succeeds
 */
async function runWithFallback(tools) {
  let lastError = null;
  
  for (const tool of tools) {
    try {
      const result = await runCommand(tool);
      if (result.success) {
        return result;
      }
      lastError = result;
    } catch (e) {
      lastError = { success: false, stderr: e.message };
    }
  }
  
  // All tools failed
  const toolNames = tools.map(t => t.cmd).join(", ");
  throw new Error(`All tools failed. Install one of: ${toolNames}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Common error handling

/**
 * Check command result and throw standardized error if failed
 */
export function checkSuccess(result, operation = "Operation") {
  if (!result.success) {
    const error = result.stderr || `${operation} failed with code ${result.code}`;
    throw new Error(error);
  }
  return result;
}

/**
 * Handle macOS permission errors with helpful guidance
 */
export function handleMacOSPermission(error) {
  if (!isDarwin) return false;
  
  const permissionPatterns = [
    /Operation not permitted/i,
    /not allowed to send Apple events/i,
    /Automation.*not allowed/i,
    /accessibility/i
  ];
  
  const message = error.message || error.stderr || String(error);
  if (permissionPatterns.some(pattern => pattern.test(message))) {
    console.log('\n🔐 macOS blocked this action. Grant permission in:');
    console.log('   System Settings → Privacy & Security → Accessibility/Automation');
    console.log('   Quick open: open "x-apple.systempreferences:com.apple.preference.security?Privacy"');
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// PowerShell script templates for Windows

export const PowerShellTemplates = {
  addWindowsTypes: `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
  `,
  
  getScreen: `
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bounds = $screen.Bounds
  `,
  
  getCursorPosition: `
    Add-Type -AssemblyName System.Windows.Forms
    $pos = [System.Windows.Forms.Cursor]::Position
    Write-Host "$($pos.X),$($pos.Y)"
  `,
  
  setCursorPosition: (x, y) => `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
  `,
  
  mouseClick: (button = 'left') => `
    Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Mouse {
        [DllImport("user32.dll")]
        public static extern void mouse_event(uint flags, uint x, uint y, uint data, int extraInfo);
      }
    "@
    ${button === 'right' ? 
      '[Mouse]::mouse_event(0x08, 0, 0, 0, 0); [Mouse]::mouse_event(0x10, 0, 0, 0, 0)' :
      '[Mouse]::mouse_event(0x02, 0, 0, 0, 0); [Mouse]::mouse_event(0x04, 0, 0, 0, 0)'
    }
  `,
  
  sendKeys: (keys) => `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait("${keys.replace(/"/g, '""')}")
  `,
  
  screenshot: (output) => `
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
  `,
  
  getClipboard: `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Clipboard]::GetText()
  `,
  
  setClipboard: (text) => `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Clipboard]::SetText("${text.replace(/"/g, '""')}")
  `
};

// ─────────────────────────────────────────────────────────────────────────────
// Documentation helper for consistent module initialization

/**
 * Initialize function documentation for REPL discovery
 * @param {Object} functions - Object containing functions to document
 * @param {Object} docs - Documentation strings keyed by function name
 */
export function initializeDocs(functions, docs) {
  const inspectSymbol = Symbol.for('Deno.customInspect');
  
  for (const [name, fn] of Object.entries(functions)) {
    if (docs[name]) {
      fn.__doc__ = docs[name];
      fn[inspectSymbol] = function() { return this.__doc__; };
    }
  }
}


export default {
  platformCommand,
  checkSuccess,
  handleMacOSPermission,
  PowerShellTemplates,
  initializeDocs
};