// Clipboard module - Cross-platform clipboard operations

import { isDarwin, isWindows } from "../core/platform.js";
import { executor, powerShell, linuxTools } from "../core/command.js";

/**
 * Reads text from system clipboard
 * @returns {Promise<string>} Clipboard text content
 * @example
 * await read()
 * // → "Hello from clipboard"
 */
export async function read() {
  if (isDarwin) {
    return await executor.executeText("pbpaste");
    
  } else if (isWindows) {
    const result = await powerShell.run("Get-Clipboard");
    return result.replace(/\r\n$/, '');
    
  } else {
    // Linux: Try multiple clipboard tools
    return await linuxTools.tryTools([
      { cmd: "xclip", args: ["-selection", "clipboard", "-o"] },
      { cmd: "xsel", args: ["--clipboard", "--output"] },
      { cmd: "wl-paste", args: [] }
    ]);
  }
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
  if (isDarwin) {
    await writeToCommand("pbcopy", [], text);
    
  } else if (isWindows) {
    // Escape quotes for PowerShell
    const escaped = text.replace(/"/g, '`"').replace(/\$/g, '`$');
    await powerShell.run(`Set-Clipboard -Value "${escaped}"`);
    
  } else {
    // Linux: Try multiple clipboard tools
    const tools = [
      { cmd: "xclip", args: ["-selection", "clipboard"] },
      { cmd: "xsel", args: ["--clipboard", "--input"] },
      { cmd: "wl-copy", args: [] }
    ];
    
    for (const tool of tools) {
      try {
        await writeToCommand(tool.cmd, tool.args, text);
        return;
      } catch {
        // Try next tool
      }
    }
    
    throw new Error(
      "Clipboard write failed. Install one of: xclip, xsel, or wl-clipboard"
    );
  }
}

/**
 * Helper to write text to a command via stdin
 * @private
 */
async function writeToCommand(cmd, args, text) {
  const p = new Deno.Command(cmd, { args, stdin: "piped" });
  const proc = p.spawn();
  const writer = proc.stdin.getWriter();
  await writer.write(new TextEncoder().encode(text));
  await writer.close();
  const { success } = await proc.status;
  if (!success) throw new Error(`Command ${cmd} failed`);
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
    if (isDarwin || isWindows) {
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
