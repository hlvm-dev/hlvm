// Context Module - Captures current system state for developer productivity
// Provides easy access to clipboard, selection, and screen content

import { exec } from "../core/system.js";

// Helper to get selected text
// Uses multiple strategies depending on platform
async function getSelectedText() {
  try {
    // Strategy 1: Try to get selection via OS commands
    if (Deno.build.os === "darwin") {
      // On macOS, try using osascript to get selection from frontmost app
      try {
        const result = await exec(
          `osascript -e 'tell application "System Events" to keystroke "c" using command down' && pbpaste`
        );
        if (result.success && result.stdout.trim()) {
          return result.stdout.trim();
        }
      } catch {
        // Fall through to next strategy
      }
    } else if (Deno.build.os === "linux") {
      // On Linux, try xclip or xsel for primary selection
      try {
        const result = await exec("xclip -o -selection primary 2>/dev/null || xsel -o -p 2>/dev/null");
        if (result.success && result.stdout.trim()) {
          return result.stdout.trim();
        }
      } catch {
        // Fall through to next strategy
      }
    } else if (Deno.build.os === "windows") {
      // On Windows, selection is harder to get directly
      // Fall through to clipboard strategy
    }
    
    // Strategy 2: Return null if no selection available
    // This is better than returning stale clipboard data
    return null;
  } catch (error) {
    console.error("Failed to get selection:", error.message);
    return null;
  }
}

// Extract text from image using OCR

// Context namespace - provides current state
export const context = {
  // Get currently selected text
  get selection() {
    // This is synchronous but internally uses cached async result
    // For now, we'll make it async and users need to await
    return getSelectedText();
  },
  
  // Screen context object
  screen: {
    // Get current screen as image data - SYNCHRONOUS
    get image() {
      try {
        // Capture to temp file and read as bytes
        const tempDir = Deno.env.get("HOME") ? `${Deno.env.get("HOME")}/.hlvm/runtime` : "/tmp";
        try { Deno.mkdirSync(tempDir, { recursive: true }); } catch {}
        const tempPath = `${tempDir}/hlvm_screen_${Date.now()}.png`;
        
        // Use screencapture command directly for sync operation
        if (Deno.build.os === "darwin") {
          const p = new Deno.Command("screencapture", {
            args: ["-x", "-C", tempPath] // -x: no sound, -C: capture cursor
          });
          const output = p.outputSync();
          if (!output.success) {
            throw new Error("Screen capture failed");
          }
        } else if (Deno.build.os === "linux") {
          // Try various Linux screenshot tools
          const tools = [
            { cmd: "import", args: ["-window", "root", tempPath] }, // ImageMagick
            { cmd: "scrot", args: [tempPath] },
            { cmd: "gnome-screenshot", args: ["-f", tempPath] }
          ];
          
          let captured = false;
          for (const tool of tools) {
            try {
              const p = new Deno.Command(tool.cmd, { args: tool.args });
              const output = p.outputSync();
              if (output.success) {
                captured = true;
                break;
              }
            } catch {
              // Try next tool
            }
          }
          
          if (!captured) {
            throw new Error("No screenshot tool available");
          }
        } else if (Deno.build.os === "windows") {
          // Windows: Use PowerShell screenshot
          const script = `
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            $screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
            $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.CopyFromScreen($screen.Left, $screen.Top, 0, 0, $bitmap.Size)
            $bitmap.Save('${tempPath}')
          `;
          const p = new Deno.Command("powershell", {
            args: ["-NoProfile", "-Command", script]
          });
          const output = p.outputSync();
          if (!output.success) {
            throw new Error("Screen capture failed");
          }
        }
        
        // Read the captured image
        const imageData = Deno.readFileSync(tempPath);
        
        // Clean up temp file
        try { Deno.removeSync(tempPath); } catch {}
        
        return imageData;
      } catch (error) {
        console.error("Failed to capture screen:", error.message);
        return new Uint8Array();
      }
    },
    
    // Get text from current screen via OCR
    get text() {
      try {
        // Get screen image first
        const imageData = this.image;
        if (imageData.length === 0) return "";
        
        // Extract text via OCR (this would be async in real implementation)
        // For now return a sync placeholder
        return "[Screen text extraction pending implementation]";
      } catch (error) {
        console.error("Failed to extract screen text:", error.message);
        return "";
      }
    }
  }
};

// Make selection truly async since it needs to run commands
Object.defineProperty(context, 'selection', {
  get() {
    return getSelectedText();
  },
  enumerable: true,
  configurable: false
});

// Re-export for convenience
export default context;