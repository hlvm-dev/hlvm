// Platform module - Cross-platform OS information

export const os = Deno.build.os;
export const arch = Deno.build.arch;
export const version = Deno.osRelease();
export const isDarwin = os === "darwin";
export const isWindows = os === "windows";
export const isLinux = os === "linux";
export function tempDir() {
  const envTemp = Deno.env.get("TMPDIR") || 
                  Deno.env.get("TEMP") || 
                  Deno.env.get("TMP");
  if (envTemp) return envTemp;
  
  if (isWindows) {
    const userProfile = Deno.env.get("USERPROFILE");
    if (userProfile) {
      return `${userProfile}\\AppData\\Local\\Temp`;
    }
    return "C:\\Windows\\Temp";
  }
  
  return "/tmp";
}

export function homeDir() {
  if (isWindows) {
    return Deno.env.get("USERPROFILE") || Deno.env.get("HOMEDRIVE") + Deno.env.get("HOMEPATH");
  }
  return Deno.env.get("HOME") || "/";
}

// Path and executable info
export const pathSep = isWindows ? "\\" : "/";
export const exeExt = isWindows ? ".exe" : "";

// Shell access
export function shell() {
  if (isWindows) {
    return ["cmd", "/c"];
  }
  return ["sh", "-c"];
}

// ===== MERGED FROM utils.js =====

// Escape string for shell command (cross-platform)
export function escapeShell(str) {
  if (isWindows) {
    // PowerShell escaping
    return str.replace(/"/g, '`"').replace(/\$/g, '`$');
  } else {
    // Unix shell escaping
    return str.replace(/'/g, "'\\''");
  }
}

// Escape text for keyboard input (cross-platform)
export function escapeKeyboard(text) {
  if (isWindows) {
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

// ===== MERGED FROM exec.js =====

// Decode text from command output
export function decode(buffer) {
  return new TextDecoder().decode(buffer);
}

// Run PowerShell command with standard args
export async function powershell(script) {
  return await new Deno.Command("powershell", {
    args: ["-NoProfile", "-Command", script]
  }).output();
}

// PowerShell script boilerplate
export const PS = {
  forms: "Add-Type -AssemblyName System.Windows.Forms",
  drawing: "Add-Type -AssemblyName System.Drawing",
  visualBasic: "Add-Type -AssemblyName Microsoft.VisualBasic"
};

// Linux tool with xdotool/ydotool fallback
export async function linuxTool(xdotoolArgs, ydotoolArgs, errorMsg) {
  try {
    return await new Deno.Command("xdotool", { args: xdotoolArgs }).output();
  } catch {
    try {
      return await new Deno.Command("ydotool", { args: ydotoolArgs }).output();
    } catch {
      throw new Error(errorMsg || "Install xdotool (X11) or ydotool (Wayland)");
    }
  }
}

// Common error messages
export const ERRORS = {
  LINUX_TOOLS: "Install xdotool (X11) or ydotool (Wayland)",
  LINUX_NOTIFY: "Install libnotify-bin (notify-send)",
  LINUX_DIALOG: "Install zenity or kdialog"
};