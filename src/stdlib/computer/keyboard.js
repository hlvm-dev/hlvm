// Keyboard module - Cross-platform keyboard automation

import * as platform from "../core/platform.js";

// Escape text for keyboard input (cross-platform)
function escapeText(text) {
  if (platform.isWindows) {
    // PowerShell SendKeys escaping
    return text
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}')
      .replace(/\(/g, '{(}')
      .replace(/\)/g, '{)}')
      .replace(/\+/g, '{+}')
      .replace(/\^/g, '{^}')
      .replace(/%/g, '{%}')
      .replace(/~/g, '{~}');
  } else {
    // Unix shell escaping
    return text.replace(/'/g, "'\\''");
  }
}

export async function type(text) {
  const escapedText = escapeText(text);
  
  if (platform.isDarwin) {
    // macOS: osascript (built-in)
    const script = `tell application "System Events" to keystroke "${escapedText}"`;
    await new Deno.Command("osascript", { args: ["-e", script] }).output();
    
  } else if (platform.isWindows) {
    // Windows: PowerShell SendKeys (built-in)
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${escapedText}")
    `;
    await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    
  } else {
    // Linux: Try xdotool or ydotool
    try {
      await new Deno.Command("xdotool", {
        args: ["type", text] // xdotool handles text directly
      }).output();
    } catch {
      try {
        // ydotool for Wayland
        await new Deno.Command("ydotool", {
          args: ["type", text]
        }).output();
      } catch {
        throw new Error(
          "Keyboard type failed. Install xdotool (X11) or ydotool (Wayland)"
        );
      }
    }
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

export async function press(key, modifiers = {}) {
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
    if (modifiers.cmd || modifiers.command) mods.push("command down");
    if (modifiers.ctrl || modifiers.control) mods.push("control down");
    if (modifiers.alt || modifiers.option) mods.push("option down");
    if (modifiers.shift) mods.push("shift down");
    
    const keyName = keyMapping.darwin;
    const script = mods.length > 0
      ? `tell application "System Events" to keystroke "${keyName}" using {${mods.join(", ")}}`
      : `tell application "System Events" to keystroke "${keyName}"`;
    
    await new Deno.Command("osascript", { args: ["-e", script] }).output();
    
  } else if (platform.isWindows) {
    // Windows: PowerShell SendKeys with modifiers
    let keys = "";
    if (modifiers.ctrl || modifiers.control) keys += "^";
    if (modifiers.alt) keys += "%";
    if (modifiers.shift) keys += "+";
    keys += keyMapping.windows;
    
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${keys}")
    `;
    await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    
  } else {
    // Linux: xdotool or ydotool
    const keys = [];
    if (modifiers.ctrl || modifiers.control) keys.push("ctrl");
    if (modifiers.alt) keys.push("alt");
    if (modifiers.shift) keys.push("shift");
    if (modifiers.cmd || modifiers.command || modifiers.super) keys.push("super");
    keys.push(keyMapping.linux);
    
    try {
      await new Deno.Command("xdotool", {
        args: ["key", keys.join("+")]
      }).output();
    } catch {
      try {
        // ydotool for Wayland
        await new Deno.Command("ydotool", {
          args: ["key", ...keys]
        }).output();
      } catch {
        throw new Error(
          "Keyboard press failed. Install xdotool (X11) or ydotool (Wayland)"
        );
      }
    }
  }
}

// Send keyboard shortcut (convenience function)
export async function shortcut(keys) {
  // Parse shortcut like "cmd+a" or "ctrl+shift+t"
  const parts = keys.toLowerCase().split("+");
  const modifiers = {};
  let key = "";
  
  for (const part of parts) {
    if (["cmd", "command", "ctrl", "control", "alt", "option", "shift", "super"].includes(part)) {
      if (part === "cmd" || part === "command") modifiers.cmd = true;
      if (part === "ctrl" || part === "control") modifiers.ctrl = true;
      if (part === "alt" || part === "option") modifiers.alt = true;
      if (part === "shift") modifiers.shift = true;
      if (part === "super") modifiers.super = true;
    } else {
      key = part;
    }
  }
  
  return press(key, modifiers);
}