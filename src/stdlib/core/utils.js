// Core utilities for DRY principles across stdlib
import { isDarwin, isWindows, decode } from "./platform.js";

// ─────────────────────────────────────────────────────────────────────────────
// Platform-specific command execution with fallback support

/**
 * Execute platform-specific commands with automatic OS detection
 * @param {Object} commands - Platform-specific command configurations
 * @param {Object} commands.darwin - macOS command config {cmd, args, stdin?, input?}
 * @param {Object} commands.windows - Windows command config {cmd, args, stdin?, input?} or {script, stdin?, input?} for PowerShell
 * @param {Array|Object} commands.linux - Linux command(s) - can be array for fallback tools
 * @param {Object} options - Additional options {stdin?, input?} applied to all platforms
 * @returns {Promise<Object>} Command result with {success, stdout, stderr, code}
 */
export async function platformCommand(commands, options = {}) {
  // Merge platform-specific options with general options
  const mergeOptions = (platformConfig) => ({
    ...platformConfig,
    stdin: platformConfig.stdin || options.stdin,
    input: platformConfig.input !== undefined ? platformConfig.input : options.input
  });
  
  if (isDarwin && commands.darwin) {
    return await runCommand(mergeOptions(commands.darwin));
  }
  
  if (isWindows && commands.windows) {
    const config = mergeOptions(commands.windows);
    if (config.script) {
      // PowerShell script execution with potential stdin
      return await runPowerShell(config.script, config.stdin, config.input);
    }
    return await runCommand(config);
  }
  
  if (commands.linux) {
    // Linux with fallback support for multiple tools
    const tools = Array.isArray(commands.linux) ? commands.linux : [commands.linux];
    const toolsWithOptions = tools.map(tool => mergeOptions(tool));
    return await runWithFallback(toolsWithOptions);
  }
  
  throw new Error(`Unsupported platform: ${Deno.build.os}`);
}

/**
 * Run a single command
 */
async function runCommand(config) {
  const { cmd, args = [], stdin, input } = config;
  const options = { args };
  
  if (stdin === "piped" && input !== undefined) {
    // Handle stdin input
    const command = new Deno.Command(cmd, { ...options, stdin: "piped" });
    const proc = command.spawn();
    const writer = proc.stdin.getWriter();
    await writer.write(new TextEncoder().encode(input));
    await writer.close();
    const result = await proc.output();
    return {
      success: result.success,
      stdout: decode(result.stdout),
      stderr: decode(result.stderr),
      code: result.code
    };
  }
  
  const command = new Deno.Command(cmd, options);
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
async function runPowerShell(script, stdin, input) {
  return await runCommand({
    cmd: "powershell",
    args: ["-NoProfile", "-Command", script],
    stdin,
    input
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
export function initDocs(functions, docs) {
  const inspectSymbol = Symbol.for('Deno.customInspect');
  
  for (const [name, fn] of Object.entries(functions)) {
    if (docs[name]) {
      fn.__doc__ = docs[name];
      fn[inspectSymbol] = function() { return this.__doc__; };
    }
  }
}