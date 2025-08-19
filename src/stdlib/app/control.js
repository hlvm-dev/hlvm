// HLVM App Control - Cross-platform application control
// Provides unified API for controlling applications across macOS, Windows, and Linux

/**
 * Known application mappings for common apps across platforms
 * Maps simple names to platform-specific identifiers
 */
const APP_REGISTRY = {
  // Browsers
  'safari': {
    darwin: 'Safari',
    windows: null, // Not available on Windows
    linux: null
  },
  'chrome': {
    darwin: 'Google Chrome',
    windows: 'chrome.exe',
    linux: 'google-chrome'
  },
  'firefox': {
    darwin: 'Firefox',
    windows: 'firefox.exe',
    linux: 'firefox'
  },
  'edge': {
    darwin: 'Microsoft Edge',
    windows: 'msedge.exe',
    linux: 'microsoft-edge'
  },
  'arc': {
    darwin: 'Arc',
    windows: null,
    linux: null
  },
  
  // IDEs and Editors
  'vscode': {
    darwin: 'Visual Studio Code',
    windows: 'Code.exe',
    linux: 'code'
  },
  'xcode': {
    darwin: 'Xcode',
    windows: null,
    linux: null
  },
  'sublime': {
    darwin: 'Sublime Text',
    windows: 'sublime_text.exe',
    linux: 'sublime_text'
  },
  'atom': {
    darwin: 'Atom',
    windows: 'atom.exe',
    linux: 'atom'
  },
  'intellij': {
    darwin: 'IntelliJ IDEA',
    windows: 'idea64.exe',
    linux: 'idea'
  },
  'cursor': {
    darwin: 'Cursor',
    windows: 'Cursor.exe',
    linux: 'cursor'
  },
  
  // Terminals
  'terminal': {
    darwin: 'Terminal',
    windows: 'cmd.exe',
    linux: 'gnome-terminal'
  },
  'iterm': {
    darwin: 'iTerm',
    windows: null,
    linux: null
  },
  'warp': {
    darwin: 'Warp',
    windows: null,
    linux: null
  },
  'powershell': {
    darwin: null,
    windows: 'powershell.exe',
    linux: 'pwsh'
  },
  
  // Communication
  'slack': {
    darwin: 'Slack',
    windows: 'slack.exe',
    linux: 'slack'
  },
  'discord': {
    darwin: 'Discord',
    windows: 'Discord.exe',
    linux: 'discord'
  },
  'zoom': {
    darwin: 'zoom.us',
    windows: 'Zoom.exe',
    linux: 'zoom'
  },
  'teams': {
    darwin: 'Microsoft Teams',
    windows: 'Teams.exe',
    linux: 'teams'
  },
  'messages': {
    darwin: 'Messages',
    windows: null,
    linux: null
  },
  
  // Productivity
  'notion': {
    darwin: 'Notion',
    windows: 'Notion.exe',
    linux: 'notion'
  },
  'obsidian': {
    darwin: 'Obsidian',
    windows: 'Obsidian.exe',
    linux: 'obsidian'
  },
  'notes': {
    darwin: 'Notes',
    windows: 'onenote.exe',
    linux: null
  },
  
  // System Apps
  'finder': {
    darwin: 'Finder',
    windows: 'explorer.exe',
    linux: 'nautilus'
  },
  'explorer': {
    darwin: 'Finder',
    windows: 'explorer.exe',
    linux: 'nautilus'
  },
  'settings': {
    darwin: 'System Settings',
    windows: 'SystemSettings.exe',
    linux: 'gnome-control-center'
  },
  'preferences': {
    darwin: 'System Settings',
    windows: 'SystemSettings.exe',
    linux: 'gnome-control-center'
  },
  
  // Media
  'music': {
    darwin: 'Music',
    windows: 'iTunes.exe',
    linux: 'rhythmbox'
  },
  'spotify': {
    darwin: 'Spotify',
    windows: 'Spotify.exe',
    linux: 'spotify'
  },
  'vlc': {
    darwin: 'VLC',
    windows: 'vlc.exe',
    linux: 'vlc'
  }
};

/**
 * Platform abstraction layer
 * Provides unified interface for platform-specific operations
 */
class PlatformAdapter {
  constructor() {
    // Lazy initialization to avoid circular dependency
    this._initialized = false;
  }
  
  _init() {
    if (this._initialized) return;
    this.platform = globalThis.hlvm.core.system.os;
    this.isDarwin = globalThis.hlvm.core.system.isDarwin;
    this.isWindows = globalThis.hlvm.core.system.isWindows;
    this.isLinux = globalThis.hlvm.core.system.isLinux;
    this._initialized = true;
  }

  /**
   * Resolve app identifier for current platform
   */
  resolveAppName(identifier) {
    this._init(); // Ensure initialized
    // Check if it's a known app alias
    const lowerName = identifier.toLowerCase();
    if (APP_REGISTRY[lowerName]) {
      const mapped = APP_REGISTRY[lowerName][this.platform];
      if (mapped) return mapped;
    }
    
    // Return as-is if not found in registry
    return identifier;
  }

  /**
   * Execute platform-specific command
   */
  async executeCommand(command) {
    const result = await globalThis.hlvm.core.system.exec(command);
    return result;
  }

  /**
   * List running applications
   */
  async listApps() {
    this._init(); // Ensure initialized
    if (this.isDarwin) {
      const script = `tell application "System Events" to get name of every process whose background only is false`;
      const result = await this.runAppleScript(script);
      const trimmed = result.trim();
      if (!trimmed) return [];
      return trimmed.split(', ').filter(name => name.length > 0);
    } 
    else if (this.isWindows) {
      const command = `powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -ExpandProperty ProcessName | Select-Object -Unique"`;
      const result = await this.executeCommand(command);
      return result.stdout.split('\n').filter(name => name.trim().length > 0);
    }
    else if (this.isLinux) {
      const command = `wmctrl -l | awk '{for(i=4;i<=NF;i++) printf "%s ", $i; print ""}' | sort -u`;
      const result = await this.executeCommand(command);
      return result.stdout.split('\n').filter(name => name.trim().length > 0);
    }
    return [];
  }

  /**
   * Get frontmost application
   */
  async getFrontmost() {
    this._init();
    if (this.isDarwin) {
      const script = `tell application "System Events" to get name of first process whose frontmost is true`;
      const name = await this.runAppleScript(script);
      return name.trim();
    }
    else if (this.isWindows) {
      const command = `powershell -Command "Add-Type @' 
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")]
  public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
}
'@; $hwnd = [Win32]::GetForegroundWindow(); $pid = 0; [Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid); (Get-Process -Id $pid).ProcessName"`;
      const result = await this.executeCommand(command);
      return result.stdout.trim();
    }
    else if (this.isLinux) {
      const command = `xdotool getactivewindow getwindowname`;
      const result = await this.executeCommand(command);
      return result.stdout.trim();
    }
    return null;
  }

  /**
   * Launch application and wait for it to be ready
   */
  async launchApp(appName) {
    this._init();
    
    // Check if already running
    const wasRunning = await this.isAppRunning(appName);
    
    if (this.isDarwin) {
      const script = `tell application "${appName}" to launch`;
      await this.runAppleScript(script);
    }
    else if (this.isWindows) {
      await this.executeCommand(`start "" "${appName}"`);
    }
    else if (this.isLinux) {
      await this.executeCommand(`${appName} &`);
    }
    
    // If app wasn't running, wait for it to be ready
    if (!wasRunning) {
      await this.waitForApp(appName);
    }
    
    return !wasRunning; // Return true if we launched it
  }
  
  /**
   * Wait for application to be ready (windows loaded, responsive)
   */
  async waitForApp(appName, maxWait = 10000) {
    this._init();
    const startTime = Date.now();
    
    // First wait for process to exist
    while (Date.now() - startTime < maxWait) {
      if (await this.isAppRunning(appName)) {
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    
    // Then wait for window to be ready (check if it has windows)
    if (this.isDarwin) {
      // Wait for app to have at least one window
      const waitScript = `
        tell application "${appName}"
          repeat 50 times
            try
              if (count windows) > 0 then
                return true
              end if
            end try
            delay 0.1
          end repeat
          return false
        end tell
      `;
      await this.runAppleScript(waitScript);
    }
    
    // Additional small delay for UI to be fully ready
    await new Promise(r => setTimeout(r, 200));
  }

  /**
   * Activate (bring to front) application
   */
  async activateApp(appName) {
    this._init();
    if (this.isDarwin) {
      const script = `tell application "${appName}" to activate`;
      await this.runAppleScript(script);
    }
    else if (this.isWindows) {
      // Use PowerShell to activate window
      const command = `powershell -Command "(New-Object -ComObject Shell.Application).Windows() | Where-Object {$_.Name -like '*${appName}*'} | ForEach-Object {$_.Visible = $true}"`;
      await this.executeCommand(command);
    }
    else if (this.isLinux) {
      await this.executeCommand(`wmctrl -a "${appName}"`);
    }
  }

  /**
   * Quit application
   */
  async quitApp(appName) {
    this._init();
    if (this.isDarwin) {
      const script = `tell application "${appName}" to quit`;
      await this.runAppleScript(script);
    }
    else if (this.isWindows) {
      await this.executeCommand(`taskkill /IM "${appName}" /F`);
    }
    else if (this.isLinux) {
      await this.executeCommand(`pkill -f "${appName}"`);
    }
  }

  /**
   * Check if application is running
   */
  async isAppRunning(appName) {
    this._init();
    if (this.isDarwin) {
      const script = `tell application "System Events" to (name of processes) contains "${appName}"`;
      const result = await this.runAppleScript(script);
      return result.trim() === 'true';
    }
    else if (this.isWindows) {
      const command = `tasklist /FI "IMAGENAME eq ${appName}" 2>NUL | find /I /N "${appName}"`;
      const result = await this.executeCommand(command);
      return result.code === 0;
    }
    else if (this.isLinux) {
      const command = `pgrep -f "${appName}"`;
      const result = await this.executeCommand(command);
      return result.code === 0;
    }
    return false;
  }

  /**
   * Hide application
   */
  async hideApp(appName) {
    this._init();
    if (this.isDarwin) {
      const script = `tell application "System Events" to set visible of process "${appName}" to false`;
      await this.runAppleScript(script);
    }
    else if (this.isWindows) {
      // Minimize window on Windows
      const command = `powershell -Command "(New-Object -ComObject Shell.Application).Windows() | Where-Object {$_.Name -like '*${appName}*'} | ForEach-Object {$_.Minimize()}"`;
      await this.executeCommand(command);
    }
    else if (this.isLinux) {
      await this.executeCommand(`xdotool search --name "${appName}" windowminimize`);
    }
  }

  /**
   * Show application
   */
  async showApp(appName) {
    this._init();
    if (this.isDarwin) {
      const script = `tell application "System Events" to set visible of process "${appName}" to true`;
      await this.runAppleScript(script);
    }
    else if (this.isWindows) {
      // Restore window on Windows
      const command = `powershell -Command "(New-Object -ComObject Shell.Application).Windows() | Where-Object {$_.Name -like '*${appName}*'} | ForEach-Object {$_.Restore()}"`;
      await this.executeCommand(command);
    }
    else if (this.isLinux) {
      await this.executeCommand(`xdotool search --name "${appName}" windowactivate`);
    }
  }

  /**
   * Maximize application window
   */
  async maximizeApp(appName) {
    this._init();
    
    if (this.isDarwin) {
      // Use AppleScript to click the green maximize button
      const script = `
        tell application "System Events"
          tell process "${appName}"
            try
              click button 2 of window 1
            on error
              -- Fallback to fullscreen shortcut
              keystroke "f" using {command down, control down}
            end try
          end tell
        end tell
      `;
      await this.runAppleScript(script);
    }
    else if (this.isWindows) {
      // Windows maximize
      const command = `powershell -Command "(New-Object -ComObject Shell.Application).Windows() | Where-Object {$_.Name -like '*${appName}*'} | ForEach-Object {$_.Maximize()}"`;
      await this.executeCommand(command);
    }
    else if (this.isLinux) {
      // Linux maximize using wmctrl
      await this.executeCommand(`wmctrl -r "${appName}" -b add,maximized_vert,maximized_horz`);
    }
  }
  
  /**
   * Send keyboard shortcut to application
   */
  async sendKeys(appName, keys) {
    this._init();
    // First activate the app
    await this.activateApp(appName);
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
    
    if (this.isDarwin) {
      // Parse the keys for macOS
      const modifiers = [];
      const keyParts = keys.toLowerCase().split('+');
      let mainKey = keyParts[keyParts.length - 1];
      
      for (let i = 0; i < keyParts.length - 1; i++) {
        const mod = keyParts[i];
        if (mod === 'cmd' || mod === 'command') modifiers.push('command down');
        if (mod === 'ctrl' || mod === 'control') modifiers.push('control down');
        if (mod === 'opt' || mod === 'option' || mod === 'alt') modifiers.push('option down');
        if (mod === 'shift') modifiers.push('shift down');
      }
      
      const modifierString = modifiers.length > 0 ? ` using {${modifiers.join(', ')}}` : '';
      const script = `tell application "System Events" to keystroke "${mainKey}"${modifierString}`;
      await this.runAppleScript(script);
    }
    else if (this.isWindows) {
      // Use SendKeys on Windows
      const winKeys = keys.replace('cmd', 'ctrl').replace('option', 'alt');
      const command = `powershell -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${winKeys}')"`;
      await this.executeCommand(command);
    }
    else if (this.isLinux) {
      // Use xdotool on Linux
      const linuxKeys = keys.replace('cmd', 'ctrl').replace('option', 'alt');
      await this.executeCommand(`xdotool key ${linuxKeys.replace('+', '+')}`);
    }
  }

  /**
   * Type text into application
   */
  async typeText(appName, text) {
    this._init();
    await this.activateApp(appName);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (this.isDarwin) {
      const escapedText = text.replace(/"/g, '\\"');
      const script = `tell application "System Events" to keystroke "${escapedText}"`;
      await this.runAppleScript(script);
    }
    else if (this.isWindows) {
      const escapedText = text.replace(/'/g, "''");
      const command = `powershell -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${escapedText}')"`;
      await this.executeCommand(command);
    }
    else if (this.isLinux) {
      await this.executeCommand(`xdotool type "${text}"`);
    }
  }

  /**
   * macOS-specific: Run AppleScript
   */
  async runAppleScript(script) {
    this._init();
    if (!this.isDarwin) return '';
    
    try {
      // Escape double quotes for the AppleScript
      const escapedScript = script.replace(/"/g, '\\"');
      // Use double quotes for the command to handle single quotes in AppleScript
      const command = `osascript -e "${escapedScript}"`;
      const result = await this.executeCommand(command);
      return result.stdout || '';
    } catch (error) {
      // Check if it's a harmless error (like app already quit)
      if (error.message && (error.message.includes('User canceled') || 
          error.message.includes('Application isn\'t running'))) {
        return '';
      }
      throw error;
    }
  }
}

// Create singleton platform adapter
const platform = new PlatformAdapter();

/**
 * Get a handle to an application (cross-platform)
 * @param {string} identifier - App name, alias, or platform-specific identifier
 * @returns {Promise<Object>} App handle with control methods
 */
export async function get(identifier) {
  // Resolve the app name for current platform
  const appName = platform.resolveAppName(identifier);
  
  // Return null if app not available on this platform
  if (!appName) {
    console.warn(`App '${identifier}' is not available on ${platform.platform}`);
    return null;
  }
  
  // Create app handle with methods
  return {
    _identifier: appName,
    _originalName: identifier,
    
    /**
     * Launch the application
     */
    async launch() {
      return await platform.launchApp(appName);
    },
    
    /**
     * Activate (bring to front) the application
     */
    async activate() {
      return await platform.activateApp(appName);
    },
    
    /**
     * Quit the application
     */
    async quit() {
      return await platform.quitApp(appName);
    },
    
    /**
     * Hide the application
     */
    async hide() {
      return await platform.hideApp(appName);
    },
    
    /**
     * Show/unhide the application
     */
    async show() {
      return await platform.showApp(appName);
    },
    
    /**
     * Check if application is running
     */
    async isRunning() {
      return await platform.isAppRunning(appName);
    },
    
    /**
     * Check if application is frontmost (active)
     */
    async isFrontmost() {
      const front = await platform.getFrontmost();
      return front === appName;
    },
    
    /**
     * Send keyboard shortcut to the application
     * @param {string} keys - Keyboard shortcut like "cmd+s", "ctrl+a"
     */
    async sendKeys(keys) {
      return await platform.sendKeys(appName, keys);
    },
    
    /**
     * Type text into the application
     * @param {string} text - Text to type
     */
    async type(text) {
      return await platform.typeText(appName, text);
    },
    
    /**
     * Maximize/fullscreen the application window
     */
    async maximize() {
      // First ensure app is running and active
      const launched = await this.launch();
      await this.activate();
      
      // Wait a bit more if we just launched
      if (launched) {
        await new Promise(r => setTimeout(r, 500));
      }
      
      return await platform.maximizeApp(appName);
    },
    
    /**
     * Open app with callback or promise chain
     * @param {Function} [callback] - Optional callback when ready
     */
    async open(callback) {
      const launched = await this.launch();
      await this.activate();
      
      // If just launched, ensure it's ready
      if (launched) {
        await platform.waitForApp(appName);
      }
      
      if (callback && typeof callback === 'function') {
        return await callback(this);
      }
      
      return this; // Allow chaining
    }
  };
}

/**
 * List all running applications
 * @returns {Promise<Array>} List of running app names
 */
export async function list() {
  return await platform.listApps();
}

/**
 * Get the frontmost (active) application
 * @returns {Promise<Object>} App handle for the active app
 */
export async function frontmost() {
  const name = await platform.getFrontmost();
  if (!name) return null;
  return get(name);
}

/**
 * Get list of known app aliases
 * @returns {Array} List of available app aliases
 */
export function aliases() {
  return Object.keys(APP_REGISTRY);
}

/**
 * Check if an app alias is available on current platform
 * @param {string} alias - App alias to check
 * @returns {boolean} True if available on current platform
 */
export function isAvailable(alias) {
  platform._init();
  const lowerName = alias.toLowerCase();
  if (!APP_REGISTRY[lowerName]) return false;
  return APP_REGISTRY[lowerName][platform.platform] !== null;
}

export default {
  get,
  list,
  frontmost,
  aliases,
  isAvailable
};