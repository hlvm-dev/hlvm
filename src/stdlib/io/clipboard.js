// Clipboard module - Cross-platform clipboard operations

import * as platform from "../core/platform.js";

/**
 * Reads text from system clipboard
 * @returns {Promise<string>} Clipboard text content
 * @example
 * await read()
 * // → "Hello from clipboard"
 */
export async function read() {
  if (platform.isDarwin) {
    // macOS: pbpaste (built-in)
    const p = new Deno.Command("pbpaste");
    const { stdout } = await p.output();
    return new TextDecoder().decode(stdout);
    
  } else if (platform.isWindows) {
    // Windows: PowerShell Get-Clipboard (built-in)
    const p = new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", "Get-Clipboard"]
    });
    const { stdout } = await p.output();
    return new TextDecoder().decode(stdout).replace(/\r\n$/, '');
    
  } else {
    // Linux: Try multiple clipboard tools in order of preference
    const tools = [
      { cmd: "xclip", args: ["-selection", "clipboard", "-o"] },
      { cmd: "xsel", args: ["--clipboard", "--output"] },
      { cmd: "wl-paste", args: [] } // Wayland
    ];
    
    for (const tool of tools) {
      try {
        const p = new Deno.Command(tool.cmd, { args: tool.args });
        const { stdout, success } = await p.output();
        if (success) {
          return new TextDecoder().decode(stdout);
        }
      } catch {
        // Try next tool
      }
    }
    
    throw new Error(
      "Clipboard read failed. Install one of: xclip, xsel, or wl-clipboard"
    );
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
  if (platform.isDarwin) {
    // macOS: pbcopy (built-in)
    const p = new Deno.Command("pbcopy", { stdin: "piped" });
    const proc = p.spawn();
    const writer = proc.stdin.getWriter();
    await writer.write(new TextEncoder().encode(text));
    await writer.close();
    await proc.status;
    
  } else if (platform.isWindows) {
    // Windows: PowerShell Set-Clipboard (built-in)
    // Escape quotes for PowerShell
    const escaped = text.replace(/"/g, '`"').replace(/\$/g, '`$');
    const p = new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", `Set-Clipboard -Value "${escaped}"`]
    });
    await p.output();
    
  } else {
    // Linux: Try multiple clipboard tools
    const tools = [
      { cmd: "xclip", args: ["-selection", "clipboard"] },
      { cmd: "xsel", args: ["--clipboard", "--input"] },
      { cmd: "wl-copy", args: [] } // Wayland
    ];
    
    for (const tool of tools) {
      try {
        const p = new Deno.Command(tool.cmd, { 
          args: tool.args,
          stdin: "piped"
        });
        const proc = p.spawn();
        const writer = proc.stdin.getWriter();
        await writer.write(new TextEncoder().encode(text));
        await writer.close();
        const { success } = await proc.status;
        if (success) return;
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
 * Checks if clipboard operations are available
 * @returns {Promise<boolean>} True if clipboard is available
 * @example
 * await isAvailable()
 * // → true (on macOS/Windows)
 * // → false (on Linux without xclip/xsel)
 */
export async function isAvailable() {
  try {
    if (platform.isDarwin || platform.isWindows) {
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
