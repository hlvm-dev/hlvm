// Execution utilities - Simple DRY helpers for command execution

import * as platform from "./platform.js";

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