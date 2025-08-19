/**
 * Shared command execution utilities following DRY and SOLID principles
 * Consolidates command execution patterns used across the codebase
 */

import * as platform from './platform.js';

/**
 * Base command executor class (Single Responsibility Principle)
 */
class CommandExecutor {
  /**
   * Execute a command and return the result
   * @param {string} cmd - Command to execute
   * @param {string[]} args - Command arguments
   * @param {Object} options - Additional options
   * @returns {Promise<{success: boolean, stdout: Uint8Array, stderr: Uint8Array}>}
   */
  async execute(cmd, args = [], options = {}) {
    const command = new Deno.Command(cmd, { 
      args,
      ...options 
    });
    return await command.output();
  }

  /**
   * Execute command and decode output as text
   * @param {string} cmd - Command to execute
   * @param {string[]} args - Command arguments
   * @returns {Promise<string>} Decoded stdout
   */
  async executeText(cmd, args = []) {
    const result = await this.execute(cmd, args);
    if (!result.success) {
      const error = platform.decode(result.stderr);
      throw new Error(`Command failed: ${error}`);
    }
    return platform.decode(result.stdout);
  }
}

/**
 * Cross-platform command executor with OS-specific handling
 */
class PlatformCommandExecutor extends CommandExecutor {
  /**
   * Execute platform-specific command
   * @param {Object} commands - Platform-specific commands {darwin, windows, linux}
   * @param {Object} options - Additional options
   * @returns {Promise<any>} Command result
   */
  async executePlatform(commands, options = {}) {
    const os = platform.os;
    const command = commands[os];
    
    if (!command) {
      throw new Error(`No command defined for platform: ${os}`);
    }

    if (typeof command === 'function') {
      return await command();
    }

    return await this.executeText(command.cmd, command.args);
  }
}

/**
 * AppleScript executor for macOS
 */
class AppleScriptExecutor extends CommandExecutor {
  /**
   * Execute AppleScript code
   * @param {string} script - AppleScript code
   * @returns {Promise<string>} Script output
   */
  async run(script) {
    return await this.executeText('osascript', ['-e', script]);
  }

  /**
   * Execute JavaScript for Automation (JXA)
   * @param {string} script - JavaScript code
   * @returns {Promise<string>} Script output
   */
  async runJXA(script) {
    return await this.executeText('osascript', ['-l', 'JavaScript', '-e', script]);
  }
}

/**
 * PowerShell executor for Windows
 */
class PowerShellExecutor extends CommandExecutor {
  constructor() {
    super();
    // Common PowerShell assemblies
    this.assemblies = {
      forms: 'Add-Type -AssemblyName System.Windows.Forms',
      drawing: 'Add-Type -AssemblyName System.Drawing',
      visualBasic: 'Add-Type -AssemblyName Microsoft.VisualBasic'
    };
  }

  /**
   * Execute PowerShell script
   * @param {string} script - PowerShell script
   * @param {string[]} assemblies - Required assemblies to load
   * @returns {Promise<string>} Script output
   */
  async run(script, assemblies = []) {
    const loadAssemblies = assemblies.map(a => this.assemblies[a] || a).join('; ');
    const fullScript = loadAssemblies ? `${loadAssemblies}; ${script}` : script;
    
    return await this.executeText('powershell', [
      '-NoProfile',
      '-NonInteractive', 
      '-Command',
      fullScript
    ]);
  }
}

/**
 * Linux tool executor with fallback chain
 */
class LinuxToolExecutor extends CommandExecutor {
  /**
   * Try multiple Linux tools until one succeeds
   * @param {Array<{cmd: string, args: string[]}>} tools - Tools to try in order
   * @returns {Promise<string>} Output from first successful tool
   */
  async tryTools(tools) {
    let lastError;
    
    for (const tool of tools) {
      try {
        const result = await this.execute(tool.cmd, tool.args);
        if (result.success) {
          return platform.decode(result.stdout);
        }
      } catch (error) {
        lastError = error;
        // Try next tool
      }
    }
    
    throw new Error(`No Linux tools available. Last error: ${lastError?.message}`);
  }
}

// Export singleton instances for convenience
export const executor = new CommandExecutor();
export const platformExecutor = new PlatformCommandExecutor();
export const appleScript = new AppleScriptExecutor();
export const powerShell = new PowerShellExecutor();
export const linuxTools = new LinuxToolExecutor();

// Export classes for extensibility
export {
  CommandExecutor,
  PlatformCommandExecutor,
  AppleScriptExecutor,
  PowerShellExecutor,
  LinuxToolExecutor
};