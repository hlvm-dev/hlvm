/**
 * Keyboard automation module - Cross-platform keyboard input simulation
 * Provides unified API for typing text, pressing keys, and sending key combinations
 */

// Platform detection
const platform = Deno.build.os;
const isWindows = platform === "windows";
const isMacOS = platform === "darwin";
const isLinux = platform === "linux";

// Import exec from system module for command execution
import { exec } from "../standalone/system.ts";

/**
 * Modifier key options for keyboard operations
 */
export interface ModifierKeys {
  cmd?: boolean;    // Command key (macOS) / Control key (Windows/Linux)
  ctrl?: boolean;   // Control key
  alt?: boolean;    // Alt/Option key
  shift?: boolean;  // Shift key
  fn?: boolean;     // Function key (primarily macOS)
}

/**
 * Special key mappings for cross-platform compatibility
 */
const SPECIAL_KEYS: Record<string, Record<string, string>> = {
  darwin: {
    enter: "return",
    return: "return",
    backspace: "delete",
    delete: "delete",
    tab: "tab",
    escape: "escape",
    esc: "escape",
    space: "space",
    up: "up arrow",
    down: "down arrow",
    left: "left arrow",
    right: "right arrow",
    home: "home",
    end: "end",
    pageup: "page up",
    pagedown: "page down",
    f1: "F1",
    f2: "F2",
    f3: "F3",
    f4: "F4",
    f5: "F5",
    f6: "F6",
    f7: "F7",
    f8: "F8",
    f9: "F9",
    f10: "F10",
    f11: "F11",
    f12: "F12",
  },
  linux: {
    enter: "Return",
    return: "Return",
    backspace: "BackSpace",
    delete: "Delete",
    tab: "Tab",
    escape: "Escape",
    esc: "Escape",
    space: "space",
    up: "Up",
    down: "Down",
    left: "Left",
    right: "Right",
    home: "Home",
    end: "End",
    pageup: "Page_Up",
    pagedown: "Page_Down",
    f1: "F1",
    f2: "F2",
    f3: "F3",
    f4: "F4",
    f5: "F5",
    f6: "F6",
    f7: "F7",
    f8: "F8",
    f9: "F9",
    f10: "F10",
    f11: "F11",
    f12: "F12",
  },
  windows: {
    enter: "{ENTER}",
    return: "{ENTER}",
    backspace: "{BACKSPACE}",
    delete: "{DELETE}",
    tab: "{TAB}",
    escape: "{ESCAPE}",
    esc: "{ESCAPE}",
    space: " ",
    up: "{UP}",
    down: "{DOWN}",
    left: "{LEFT}",
    right: "{RIGHT}",
    home: "{HOME}",
    end: "{END}",
    pageup: "{PGUP}",
    pagedown: "{PGDN}",
    f1: "{F1}",
    f2: "{F2}",
    f3: "{F3}",
    f4: "{F4}",
    f5: "{F5}",
    f6: "{F6}",
    f7: "{F7}",
    f8: "{F8}",
    f9: "{F9}",
    f10: "{F10}",
    f11: "{F11}",
    f12: "{F12}",
  },
};

/**
 * Modifier key mappings for each platform
 */
const MODIFIER_KEYS: Record<string, Record<string, string>> = {
  darwin: {
    cmd: "command",
    command: "command",
    ctrl: "control",
    control: "control",
    alt: "option",
    option: "option",
    shift: "shift",
    fn: "fn",
  },
  linux: {
    cmd: "ctrl",
    command: "ctrl",
    ctrl: "ctrl",
    control: "ctrl",
    alt: "alt",
    option: "alt",
    shift: "shift",
  },
  windows: {
    cmd: "^",
    command: "^",
    ctrl: "^",
    control: "^",
    alt: "%",
    option: "%",
    shift: "+",
  },
};

/**
 * Escape text for safe shell execution
 */
function escapeShellArg(text: string): string {
  if (isWindows) {
    // Windows escaping for PowerShell
    return text
      .replace(/'/g, "''")
      .replace(/"/g, '""')
      .replace(/\$/g, "`$")
      .replace(/`/g, "``");
  } else {
    // Unix-like escaping
    return text.replace(/'/g, "'\\''");
  }
}

/**
 * Get the special key representation for the current platform
 */
function getSpecialKey(key: string): string {
  const platformKeys = SPECIAL_KEYS[platform] || SPECIAL_KEYS.linux;
  return platformKeys[key.toLowerCase()] || key;
}

/**
 * Get the modifier key representation for the current platform
 */
function getModifierKey(key: string): string {
  const platformMods = MODIFIER_KEYS[platform] || MODIFIER_KEYS.linux;
  return platformMods[key.toLowerCase()] || key;
}

/**
 * Type text by simulating keyboard input
 */
export async function type(text: string): Promise<void> {
  if (isMacOS) {
    // Use osascript with System Events on macOS
    // Escape for AppleScript string
    const escapedText = text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    await exec(`osascript -e "tell application \\"System Events\\" to keystroke \\"${escapedText}\\""`);
  } else if (isLinux) {
    const escapedText = escapeShellArg(text);
    // Use xdotool on Linux
    await exec(`xdotool type '${escapedText}'`);
  } else if (isWindows) {
    // Use PowerShell on Windows
    const escapedText = escapeShellArg(text);
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')
    `;
    await exec(`powershell -Command "${script}"`);
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Press a key with optional modifiers
 */
export async function press(key: string, modifiers?: ModifierKeys): Promise<void> {
  if (isMacOS) {
    await pressMacOS(key, modifiers);
  } else if (isLinux) {
    await pressLinux(key, modifiers);
  } else if (isWindows) {
    await pressWindows(key, modifiers);
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Press a key on macOS
 */
async function pressMacOS(key: string, modifiers?: ModifierKeys): Promise<void> {
  const specialKey = getSpecialKey(key);
  let modifierString = "";
  
  if (modifiers) {
    const mods: string[] = [];
    if (modifiers.cmd || modifiers.ctrl) mods.push("command down");
    if (modifiers.alt) mods.push("option down");
    if (modifiers.shift) mods.push("shift down");
    if (modifiers.fn) mods.push("fn down");
    
    if (mods.length > 0) {
      modifierString = `using {${mods.join(", ")}}`;
    }
  }

  // Check if it's a special key
  if (specialKey !== key || key.length > 1) {
    await exec(`osascript -e "tell application \\"System Events\\" to key code ${getKeyCode(specialKey)} ${modifierString}"`);
  } else {
    // Regular character
    const escapedKey = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    await exec(`osascript -e "tell application \\"System Events\\" to keystroke \\"${escapedKey}\\" ${modifierString}"`);
  }
}

/**
 * Get macOS key code for special keys
 */
function getKeyCode(key: string): string {
  const keyCodes: Record<string, string> = {
    "return": "36",
    "tab": "48",
    "space": "49",
    "delete": "51",
    "escape": "53",
    "left arrow": "123",
    "right arrow": "124",
    "down arrow": "125",
    "up arrow": "126",
    "home": "115",
    "end": "119",
    "page up": "116",
    "page down": "121",
    "F1": "122",
    "F2": "120",
    "F3": "99",
    "F4": "118",
    "F5": "96",
    "F6": "97",
    "F7": "98",
    "F8": "100",
    "F9": "101",
    "F10": "109",
    "F11": "103",
    "F12": "111",
  };
  
  return keyCodes[key] || "36"; // Default to return key
}

/**
 * Press a key on Linux
 */
async function pressLinux(key: string, modifiers?: ModifierKeys): Promise<void> {
  const specialKey = getSpecialKey(key);
  const keys: string[] = [];
  
  if (modifiers) {
    if (modifiers.cmd || modifiers.ctrl) keys.push("ctrl");
    if (modifiers.alt) keys.push("alt");
    if (modifiers.shift) keys.push("shift");
  }
  
  // If it's a single character and not a special key, use the character directly
  if (key.length === 1 && specialKey === key) {
    keys.push(key);
  } else {
    keys.push(specialKey);
  }
  
  const keyCombo = keys.join("+");
  await exec(`xdotool key '${keyCombo}'`);
}

/**
 * Press a key on Windows
 */
async function pressWindows(key: string, modifiers?: ModifierKeys): Promise<void> {
  let keySequence = "";
  
  if (modifiers) {
    if (modifiers.cmd || modifiers.ctrl) keySequence += "^";
    if (modifiers.alt) keySequence += "%";
    if (modifiers.shift) keySequence += "+";
  }
  
  const specialKey = getSpecialKey(key);
  
  // If it's a special key, use the special key format
  if (specialKey !== key || key.length > 1) {
    keySequence += specialKey;
  } else {
    // Regular character - wrap in braces if it has modifiers
    if (modifiers && Object.values(modifiers).some(v => v)) {
      keySequence += `{${key}}`;
    } else {
      keySequence += key;
    }
  }
  
  const script = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait('${keySequence}')
  `;
  await exec(`powershell -Command "${script}"`);
}

/**
 * Press a hotkey combination (e.g., cmd+a, ctrl+shift+t)
 * @param keys Keys to press together (e.g., "cmd", "a" or "ctrl", "shift", "t")
 */
export async function hotkey(...keys: string[]): Promise<void> {
  if (keys.length === 0) {
    throw new Error("At least one key must be provided");
  }
  
  // Separate modifiers and regular keys
  const modifierNames = ["cmd", "command", "ctrl", "control", "alt", "option", "shift", "fn"];
  const modifiers: ModifierKeys = {};
  let regularKey = "";
  
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    if (modifierNames.includes(lowerKey)) {
      // Map modifier keys
      if (lowerKey === "cmd" || lowerKey === "command") {
        modifiers.cmd = true;
      } else if (lowerKey === "ctrl" || lowerKey === "control") {
        modifiers.ctrl = true;
      } else if (lowerKey === "alt" || lowerKey === "option") {
        modifiers.alt = true;
      } else if (lowerKey === "shift") {
        modifiers.shift = true;
      } else if (lowerKey === "fn") {
        modifiers.fn = true;
      }
    } else {
      // Regular key (take the last one if multiple are provided)
      regularKey = key;
    }
  }
  
  if (!regularKey) {
    throw new Error("A non-modifier key must be provided");
  }
  
  await press(regularKey, modifiers);
}

/**
 * Press and hold a key down
 */
export async function keyDown(key: string): Promise<void> {
  if (isMacOS) {
    const specialKey = getSpecialKey(key);
    if (specialKey !== key || key.length > 1) {
      await exec(`osascript -e 'tell application "System Events" to key down ${specialKey}'`);
    } else {
      await exec(`osascript -e 'tell application "System Events" to key down "${escapeShellArg(key)}"'`);
    }
  } else if (isLinux) {
    const specialKey = getSpecialKey(key);
    await exec(`xdotool keydown '${specialKey}'`);
  } else if (isWindows) {
    // Windows SendKeys doesn't support key down/up directly
    // This is a limitation - we'll press the key instead
    throw new Error("keyDown is not supported on Windows. Use press() instead.");
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Release a held key
 */
export async function keyUp(key: string): Promise<void> {
  if (isMacOS) {
    const specialKey = getSpecialKey(key);
    if (specialKey !== key || key.length > 1) {
      await exec(`osascript -e 'tell application "System Events" to key up ${specialKey}'`);
    } else {
      await exec(`osascript -e 'tell application "System Events" to key up "${escapeShellArg(key)}"'`);
    }
  } else if (isLinux) {
    const specialKey = getSpecialKey(key);
    await exec(`xdotool keyup '${specialKey}'`);
  } else if (isWindows) {
    // Windows SendKeys doesn't support key down/up directly
    throw new Error("keyUp is not supported on Windows. Use press() instead.");
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Export all functions and types
export default {
  type,
  press,
  hotkey,
  keyDown,
  keyUp,
  platform,
  isWindows,
  isMacOS,
  isLinux,
};