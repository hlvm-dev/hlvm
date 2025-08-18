// Shared utility functions

import * as platform from "./platform.js";

// Escape string for shell command (cross-platform)
export function escapeShell(str) {
  if (platform.isWindows) {
    // PowerShell escaping
    return str.replace(/"/g, '`"').replace(/\$/g, '`$');
  } else {
    // Unix shell escaping
    return str.replace(/'/g, "'\\''");
  }
}

// Escape text for keyboard input (cross-platform)
export function escapeKeyboard(text) {
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
    // Unix shell escaping for osascript
    return text.replace(/'/g, "'\\''");
  }
}