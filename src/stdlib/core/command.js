// Unified cross-platform command execution
// Eliminates duplicate platform detection across modules

import { isDarwin, isWindows, isLinux, decode, powershell, linuxTool } from "./platform.js";

/**
 * Execute platform-specific commands with automatic OS detection
 * @param {Object} commands - Object with mac, windows, linux command configs
 * @returns {Promise<any>} Command output
 */
export async function runPlatformCommand(commands) {
  if (isDarwin && commands.mac) {
    return await runMacCommand(commands.mac);
  } else if (isWindows && commands.windows) {
    return await runWindowsCommand(commands.windows);
  } else if (isLinux && commands.linux) {
    return await runLinuxCommand(commands.linux);
  }
  throw new Error(`Unsupported platform or missing command configuration`);
}

async function runMacCommand(config) {
  const { cmd = "osascript", args = [], script, fallback } = config;
  
  try {
    if (script) {
      const result = await new Deno.Command(cmd, {
        args: [...args, "-e", script]
      }).output();
      
      if (config.decode !== false) {
        return decode(result.stdout);
      }
      return result;
    }
    
    const result = await new Deno.Command(cmd, { args }).output();
    if (!result.success && fallback) {
      throw new Error("Primary command failed");
    }
    
    if (config.decode !== false && result.stdout) {
      return decode(result.stdout);
    }
    return result;
  } catch (error) {
    if (fallback) {
      // Handle fallback - can be a function or command config
      if (typeof fallback === 'function') {
        return await fallback();
      }
      return await runMacCommand(fallback);
    }
    throw error;
  }
}

async function runWindowsCommand(config) {
  const { script, decode: shouldDecode = true } = config;
  
  if (script) {
    const result = await powershell(script);
    if (shouldDecode) {
      return decode(result.stdout);
    }
    return result;
  }
  
  throw new Error("Windows command requires a script");
}

async function runLinuxCommand(config) {
  const { xdotool, ydotool, fallback, errorMsg, cmd, args } = config;
  
  // Use specific command if provided
  if (cmd) {
    try {
      const result = await new Deno.Command(cmd, { args: args || [] }).output();
      if (!result.success && fallback) {
        throw new Error("Primary command failed");
      }
      if (config.decode !== false) {
        return decode(result.stdout);
      }
      return result;
    } catch (error) {
      if (fallback) {
        // Handle fallback - can be function, array, or single command
        if (typeof fallback === 'function') {
          return await fallback();
        }
        if (Array.isArray(fallback)) {
          for (const fb of fallback) {
            try {
              const result = await new Deno.Command(fb.cmd, { args: fb.args }).output();
              if (config.decode !== false) {
                return decode(result.stdout);
              }
              return result;
            } catch {
              continue;
            }
          }
          throw new Error(errorMsg || "No Linux command available");
        }
        // Single fallback command
        return await runLinuxCommand(fallback);
      }
      throw error;
    }
  }
  
  // Use xdotool/ydotool fallback pattern
  if (xdotool && ydotool) {
    const result = await linuxTool(xdotool, ydotool, errorMsg);
    if (config.decode !== false) {
      return decode(result.stdout);
    }
    return result;
  }
  
  // Use fallback if no primary command
  if (fallback) {
    if (typeof fallback === 'function') {
      return await fallback();
    }
    if (Array.isArray(fallback)) {
      for (const fb of fallback) {
        try {
          const result = await new Deno.Command(fb.cmd, { args: fb.args }).output();
          if (config.decode !== false) {
            return decode(result.stdout);
          }
          return result;
        } catch {
          continue;
        }
      }
    }
    throw new Error(errorMsg || "No Linux command available");
  }
  
  throw new Error("Linux command configuration required");
}

/**
 * Simple command runner that returns decoded text by default
 */
export async function runCommand(cmd, args = []) {
  const result = await new Deno.Command(cmd, { args }).output();
  return decode(result.stdout);
}

/**
 * Check if a command exists on the system
 */
export async function commandExists(cmd) {
  try {
    const checkCmd = isWindows ? "where" : "which";
    await new Deno.Command(checkCmd, { args: [cmd] }).output();
    return true;
  } catch {
    return false;
  }
}