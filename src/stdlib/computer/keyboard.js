// Keyboard module - Cross-platform keyboard automation with unified array format
// Array format: ["cmd", "shift", "a"] where last element is the key, rest are modifiers

import * as platform from "../core/platform.js";
import { escapeKeyboard, powershell, linuxTool, PS, ERRORS } from "../core/platform.js";

// Global keyboard event listeners storage
const keyListeners = new Map();

export async function type(text) {
  const escapedText = escapeKeyboard(text);
  
  if (platform.isDarwin) {
    // macOS: osascript (built-in)
    const script = `tell application "System Events" to keystroke "${escapedText}"`;
    const result = await new Deno.Command("osascript", { args: ["-e", script] }).output();
    if (!result.success) {
      const error = decode(result.stderr);
      if (error.includes("not allowed to send keystrokes")) {
        throw new Error("Keyboard control requires accessibility permissions. Go to System Settings → Privacy & Security → Accessibility and add your terminal app.");
      }
      throw new Error(`Keyboard type failed: ${error}`);
    }
    
  } else if (platform.isWindows) {
    // Windows: PowerShell SendKeys (built-in)
    const script = `
      ${PS.forms}
      [System.Windows.Forms.SendKeys]::SendWait("${escapedText}")
    `;
    await powershell(script);
    
  } else {
    // Linux: Try xdotool or ydotool
    await linuxTool(
      ["type", text], // xdotool args
      ["type", text], // ydotool args
      ERRORS.LINUX_TOOLS
    );
  }
}

// Key mappings for cross-platform support
const KEY_MAP = {
  // Common keys
  "enter": { 
    darwin: "return", 
    windows: "{ENTER}", 
    linux: "Return" 
  },
  "return": { 
    darwin: "return", 
    windows: "{ENTER}", 
    linux: "Return" 
  },
  "tab": { 
    darwin: "tab", 
    windows: "{TAB}", 
    linux: "Tab" 
  },
  "delete": { 
    darwin: "delete", 
    windows: "{DEL}", 
    linux: "Delete" 
  },
  "backspace": { 
    darwin: "delete", 
    windows: "{BACKSPACE}", 
    linux: "BackSpace" 
  },
  "escape": { 
    darwin: "escape", 
    windows: "{ESC}", 
    linux: "Escape" 
  },
  "esc": { 
    darwin: "escape", 
    windows: "{ESC}", 
    linux: "Escape" 
  },
  "space": { 
    darwin: "space", 
    windows: " ", 
    linux: "space" 
  },
  "up": { 
    darwin: "up arrow", 
    windows: "{UP}", 
    linux: "Up" 
  },
  "down": { 
    darwin: "down arrow", 
    windows: "{DOWN}", 
    linux: "Down" 
  },
  "left": { 
    darwin: "left arrow", 
    windows: "{LEFT}", 
    linux: "Left" 
  },
  "right": { 
    darwin: "right arrow", 
    windows: "{RIGHT}", 
    linux: "Right" 
  },
  "home": { 
    darwin: "home", 
    windows: "{HOME}", 
    linux: "Home" 
  },
  "end": { 
    darwin: "end", 
    windows: "{END}", 
    linux: "End" 
  },
  "pageup": { 
    darwin: "page up", 
    windows: "{PGUP}", 
    linux: "Page_Up" 
  },
  "pagedown": { 
    darwin: "page down", 
    windows: "{PGDN}", 
    linux: "Page_Down" 
  }
};

// Helper to normalize keys array
function normalizeKeys(keys) {
  // Only accept array format
  if (!Array.isArray(keys)) {
    throw new Error('Keyboard functions require array format: ["cmd", "s"] or ["enter"]');
  }
  
  // Normalize modifier names
  return keys.map(k => {
    const lower = k.toLowerCase();
    // Normalize common variations
    if (lower === 'command' || lower === 'meta' || lower === 'super') return 'cmd';
    if (lower === 'control') return 'ctrl';
    if (lower === 'option') return 'alt';
    return lower;
  });
}

// Get string representation of keys for Map key
function getKeyString(keys) {
  const normalized = normalizeKeys(keys);
  return normalized.sort().join('+');
}

// Updated press function that accepts array format only
export async function press(keys) {
  // Only array format is supported
  const normalized = normalizeKeys(keys);
  
  // Extract key and modifiers from normalized array
  const key = normalized[normalized.length - 1];
  const modifiers = normalized.slice(0, -1);
  
  // Normalize key name
  const normalizedKey = key.toLowerCase();
  const keyMapping = KEY_MAP[normalizedKey] || {
    darwin: key,
    windows: key,
    linux: key
  };
  
  if (platform.isDarwin) {
    // macOS: osascript with modifiers
    const mods = [];
    if (modifiers.includes('cmd')) mods.push("command down");
    if (modifiers.includes('ctrl')) mods.push("control down");
    if (modifiers.includes('alt')) mods.push("option down");
    if (modifiers.includes('shift')) mods.push("shift down");
    
    const keyName = keyMapping.darwin;
    const script = mods.length > 0
      ? `tell application "System Events" to keystroke "${keyName}" using {${mods.join(", ")}}`
      : `tell application "System Events" to keystroke "${keyName}"`;
    
    const result = await new Deno.Command("osascript", { args: ["-e", script] }).output();
    if (!result.success) {
      const error = decode(result.stderr);
      if (error.includes("not allowed to send keystrokes")) {
        throw new Error("Keyboard control requires accessibility permissions. Go to System Settings → Privacy & Security → Accessibility and add your terminal app.");
      }
      throw new Error(`Keyboard press failed: ${error}`);
    }
    
  } else if (platform.isWindows) {
    // Windows: PowerShell SendKeys with modifiers
    let keysStr = "";
    if (modifiers.includes('ctrl')) keysStr += "^";
    if (modifiers.includes('alt')) keysStr += "%";
    if (modifiers.includes('shift')) keysStr += "+";
    keysStr += keyMapping.windows;
    
    const script = `
      ${PS.forms}
      [System.Windows.Forms.SendKeys]::SendWait("${keysStr}")
    `;
    await powershell(script);
    
  } else {
    // Linux: xdotool or ydotool
    const linuxKeys = [];
    if (modifiers.includes('ctrl')) linuxKeys.push("ctrl");
    if (modifiers.includes('alt')) linuxKeys.push("alt");
    if (modifiers.includes('shift')) linuxKeys.push("shift");
    if (modifiers.includes('cmd')) linuxKeys.push("super");
    linuxKeys.push(keyMapping.linux);
    
    await linuxTool(
      ["key", linuxKeys.join("+")], // xdotool args
      ["key", ...linuxKeys], // ydotool args
      ERRORS.LINUX_TOOLS
    );
  }
}

// Register a global keyboard shortcut listener
export function onKeyPress(keys, callback) {
  const keyString = getKeyString(keys);
  
  // Store the callback
  if (!keyListeners.has(keyString)) {
    keyListeners.set(keyString, []);
  }
  keyListeners.get(keyString).push(callback);
  
  // Platform-specific global hotkey registration would go here
  // For now, this is a stub that stores the callbacks for future implementation
  
  if (platform.isDarwin) {
    // TODO: Use native macOS APIs or a tool like hammerspoon
    console.warn('Global keyboard shortcuts not yet implemented. Callback registered for future use.');
  } else if (platform.isWindows) {
    // TODO: Use Windows hooks or AutoHotkey
    console.warn('Global keyboard shortcuts not yet implemented. Callback registered for future use.');
  } else {
    // TODO: Use X11 or Wayland APIs
    console.warn('Global keyboard shortcuts not yet implemented. Callback registered for future use.');
  }
  
  return true;
}

// Unregister a global keyboard shortcut listener
export function offKeyPress(keys, callback) {
  const keyString = getKeyString(keys);
  
  if (!keyListeners.has(keyString)) {
    return false;
  }
  
  const callbacks = keyListeners.get(keyString);
  
  if (callback) {
    // Remove specific callback
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
    
    // Clean up if no callbacks left
    if (callbacks.length === 0) {
      keyListeners.delete(keyString);
    }
  } else {
    // Remove all callbacks for this key combination
    keyListeners.delete(keyString);
  }
  
  // Platform-specific deregistration would go here
  
  return true;
}

// List all registered keyboard shortcuts
export function listKeyListeners() {
  const result = [];
  for (const [keyString, callbacks] of keyListeners.entries()) {
    result.push({
      keys: keyString.split('+'),
      callbackCount: callbacks.length
    });
  }
  return result;
}


// Initialize docs on module load
