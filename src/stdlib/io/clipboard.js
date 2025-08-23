// Clipboard module - Cross-platform clipboard operations

import { platformCommand, PowerShellTemplates, checkSuccess, initializeDocs } from "../core/utils.js";
import { execCommand } from "../core/resource.js";

/**
 * Reads text from system clipboard
 * @returns {Promise<string>} Clipboard text content
 * @example
 * await read()
 * // → "Hello from clipboard"
 */
export async function read() {
  const result = await platformCommand({
    darwin: { cmd: "pbpaste", args: [] },
    windows: { script: PowerShellTemplates.getClipboard },
    linux: [
      { cmd: "xclip", args: ["-selection", "clipboard", "-o"] },
      { cmd: "xsel", args: ["--clipboard", "--output"] },
      { cmd: "wl-paste", args: [] }
    ]
  });
  
  // Clean Windows line endings
  return result.stdout.replace(/\r\n$/, '');
}

/**
 * Writes text to system clipboard
 * @param {string} text - Text to write to clipboard
 * @returns {Promise<void>}
 * @example
 * await write("Hello clipboard")
 * // → Text copied to clipboard
 */
export async function write(text) {
  // Darwin uses stdin
  if (globalThis.Deno.build.os === "darwin") {
    const result = await execCommand("pbcopy", [], { stdin: "piped", input: text });
    checkSuccess(result, "Clipboard write");
    return;
  }
  
  // Windows uses PowerShell
  if (globalThis.Deno.build.os === "windows") {
    const result = await platformCommand({
      windows: { script: PowerShellTemplates.setClipboard(text) }
    });
    checkSuccess(result, "Clipboard write");
    return;
  }
  
  // Linux tries multiple tools with stdin
  const tools = [
    { cmd: "xclip", args: ["-selection", "clipboard"] },
    { cmd: "xsel", args: ["--clipboard", "--input"] },
    { cmd: "wl-copy", args: [] }
  ];
  
  for (const tool of tools) {
    try {
      const result = await execCommand(tool.cmd, tool.args, { stdin: "piped", input: text });
      if (result.success) return;
    } catch {
      // Try next tool
    }
  }
  
  throw new Error("Clipboard write failed. Install one of: xclip, xsel, or wl-clipboard");
}

/**
 * Checks if clipboard operations are available
 * @returns {Promise<boolean>} True if clipboard is available
 * @example
 * await isAvailable()
 * // → true (on macOS/Windows)
 * // → false (on Linux without xclip/xsel)
 */
export async function isAvailable() {
  try {
    const os = globalThis.Deno.build.os;
    if (os === "darwin" || os === "windows") {
      return true; // Built-in support
    }
    
    // Linux: Check for tools
    const tools = ["xclip", "xsel", "wl-paste"];
    for (const tool of tools) {
      try {
        const p = new Deno.Command("which", { args: [tool] });
        const { success } = await p.output();
        if (success) return true;
      } catch {}
    }
    return false;
  } catch {
    return false;
  }
}

// Initialize docs on module load
initializeDocs({ read, write, isAvailable }, {
  read: `read()
Reads text from system clipboard
Returns: clipboard text content`,
  
  write: `write(text)
Writes text to system clipboard
Parameters: text - string to copy`,
  
  isAvailable: `isAvailable()
Checks if clipboard operations are available
Returns: true if clipboard is available`
});
