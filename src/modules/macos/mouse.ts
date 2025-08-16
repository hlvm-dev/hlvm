/**
 * Mouse automation module
 */

import { exec } from '../standalone/system.ts';
import { getPlatform, Platform } from '../standalone/platform.ts';

export interface MousePosition {
  x: number;
  y: number;
}

export type MouseButton = 'left' | 'right' | 'middle';

interface MouseModule {
  move(x: number, y: number): Promise<void>;
  click(button?: MouseButton): Promise<void>;
  doubleClick(): Promise<void>;
  drag(fromX: number, fromY: number, toX: number, toY: number): Promise<void>;
  scroll(deltaX: number, deltaY: number): Promise<void>;
  getPosition(): Promise<MousePosition>;
}

class Mouse implements MouseModule {
  private platform: Platform;

  constructor() {
    this.platform = getPlatform();
  }

  /**
   * Move mouse to coordinates
   */
  async move(x: number, y: number): Promise<void> {
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('Coordinates must be numbers');
    }

    switch (this.platform) {
      case 'darwin':
        return await this.moveMacOS(x, y);
      case 'linux':
        return await this.moveLinux(x, y);
      case 'windows':
        return await this.moveWindows(x, y);
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Click mouse button
   */
  async click(button: MouseButton = 'left'): Promise<void> {
    switch (this.platform) {
      case 'darwin':
        return await this.clickMacOS(button);
      case 'linux':
        return await this.clickLinux(button);
      case 'windows':
        return await this.clickWindows(button);
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Double click
   */
  async doubleClick(): Promise<void> {
    switch (this.platform) {
      case 'darwin':
        return await this.doubleClickMacOS();
      case 'linux':
        return await this.doubleClickLinux();
      case 'windows':
        return await this.doubleClickWindows();
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Drag from one point to another
   */
  async drag(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    if (typeof fromX !== 'number' || typeof fromY !== 'number' || 
        typeof toX !== 'number' || typeof toY !== 'number') {
      throw new Error('All coordinates must be numbers');
    }

    switch (this.platform) {
      case 'darwin':
        return await this.dragMacOS(fromX, fromY, toX, toY);
      case 'linux':
        return await this.dragLinux(fromX, fromY, toX, toY);
      case 'windows':
        return await this.dragWindows(fromX, fromY, toX, toY);
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Scroll
   */
  async scroll(deltaX: number, deltaY: number): Promise<void> {
    if (typeof deltaX !== 'number' || typeof deltaY !== 'number') {
      throw new Error('Scroll deltas must be numbers');
    }

    switch (this.platform) {
      case 'darwin':
        return await this.scrollMacOS(deltaX, deltaY);
      case 'linux':
        return await this.scrollLinux(deltaX, deltaY);
      case 'windows':
        return await this.scrollWindows(deltaX, deltaY);
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Get current mouse position
   */
  async getPosition(): Promise<MousePosition> {
    switch (this.platform) {
      case 'darwin':
        return await this.getPositionMacOS();
      case 'linux':
        return await this.getPositionLinux();
      case 'windows':
        return await this.getPositionWindows();
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  // macOS implementations
  private async moveMacOS(x: number, y: number): Promise<void> {
    // First try cliclick if available
    const cliclickPaths = [
      '/usr/local/bin/cliclick',
      '/opt/homebrew/bin/cliclick',
      '/usr/bin/cliclick',
      'cliclick'
    ];
    
    for (const cliclickPath of cliclickPaths) {
      try {
        const result = await exec(`${cliclickPath} m:${x},${y}`);
        if (result.code === 0) {
          return;
        }
      } catch {
        // Try next path
      }
    }

    // Fallback: Since cliclick is now installed, it should work
    // If we get here, cliclick is not in PATH or not working
    throw new Error(`Mouse move requires cliclick. Please ensure cliclick is in PATH.`);
  }

  private async clickMacOS(button: MouseButton): Promise<void> {
    // First try cliclick with full paths
    const cliclickPaths = [
      '/usr/local/bin/cliclick',
      '/opt/homebrew/bin/cliclick',
      '/usr/bin/cliclick',
      'cliclick'
    ];
    
    let clickCmd = 'c:.';
    if (button === 'right') {
      clickCmd = 'rc:.';
    } else if (button === 'middle') {
      clickCmd = 'mc:.';
    }
    
    for (const cliclickPath of cliclickPaths) {
      try {
        const result = await exec(`${cliclickPath} ${clickCmd}`);
        if (result.code === 0) {
          return;
        }
      } catch {
        // Try next path
      }
    }
    
    // Fallback to AppleScript
    // Get current mouse position first
    let currentPos = { x: 0, y: 0 };
    try {
      currentPos = await this.getPositionMacOS();
    } catch {
      // If we can't get position, just click at current location
    }
    
    try {
      // Use cliclick-style AppleScript approach
      const clickScript = button === 'right' ? 
        `do shell script "osascript -e 'tell application \"System Events\" to click at {${currentPos.x}, ${currentPos.y}}'"` :
        `tell application "System Events" to click at {${currentPos.x}, ${currentPos.y}}`;
        
      const result = await exec(`osascript -e '${clickScript}'`);
      if (result.code !== 0 && result.stderr) {
        throw new Error(`Failed to click: ${result.stderr}`);
      }
    } catch (e) {
      // Last resort: try without position
      try {
        await exec(`osascript -e 'tell application "System Events" to click'`);
      } catch {
        throw new Error(`Mouse click requires cliclick or accessibility permissions. Install: brew install cliclick`);
      }
    }
  }

  private async doubleClickMacOS(): Promise<void> {
    // First try cliclick with full paths
    const cliclickPaths = [
      '/usr/local/bin/cliclick',
      '/opt/homebrew/bin/cliclick',
      '/usr/bin/cliclick',
      'cliclick'
    ];
    
    for (const cliclickPath of cliclickPaths) {
      try {
        const result = await exec(`${cliclickPath} dc:.`);
        if (result.code === 0) {
          return;
        }
      } catch {
        // Try next path
      }
    }
    
    // Fallback to two clicks
    await this.clickMacOS('left');
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.clickMacOS('left');
  }

  private async dragMacOS(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    // First try cliclick with full paths
    const cliclickPaths = [
      '/usr/local/bin/cliclick',
      '/opt/homebrew/bin/cliclick',
      '/usr/bin/cliclick',
      'cliclick'
    ];
    
    for (const cliclickPath of cliclickPaths) {
      try {
        const result = await exec(`${cliclickPath} dd:${fromX},${fromY} du:${toX},${toY}`);
        if (result.code === 0) {
          return;
        }
      } catch {
        // Try next path
      }
    }
    
    // Fallback: Without cliclick, we can't reliably drag
    // AppleScript doesn't support drag operations well
    throw new Error(`Drag operation requires cliclick. Install: brew install cliclick`);
  }

  private async scrollMacOS(deltaX: number, deltaY: number): Promise<void> {
    // First try cliclick with full paths
    const cliclickPaths = [
      '/usr/local/bin/cliclick',
      '/opt/homebrew/bin/cliclick',
      '/usr/bin/cliclick',
      'cliclick'
    ];
    
    for (const cliclickPath of cliclickPaths) {
      try {
        // cliclick uses positive values for up, negative for down
        const result = await exec(`${cliclickPath} w:${-deltaY}`);
        if (result.code === 0) {
          return;
        }
      } catch {
        // Try next path
      }
    }
    
    // Fallback: AppleScript can simulate scroll via key events
    try {
      const scrollAmount = Math.abs(deltaY);
      const key = deltaY > 0 ? 'page up' : 'page down';
      
      // Use smaller increments for smoother scrolling
      const iterations = Math.min(scrollAmount, 5);
      for (let i = 0; i < iterations; i++) {
        await exec(`osascript -e 'tell application "System Events" to key code ${deltaY > 0 ? '116' : '121'}'`);
        if (i < iterations - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (e) {
      throw new Error(`Scroll operation requires cliclick for precise control. Install: brew install cliclick`);
    }
  }

  private async getPositionMacOS(): Promise<MousePosition> {
    // First try cliclick with full paths
    const cliclickPaths = [
      '/usr/local/bin/cliclick',
      '/opt/homebrew/bin/cliclick',
      '/usr/bin/cliclick',
      'cliclick'
    ];
    
    for (const cliclickPath of cliclickPaths) {
      try {
        const result = await exec(`${cliclickPath} p`);
        if (result.code === 0) {
          const match = result.stdout.match(/(\d+),(\d+)/);
          if (match) {
            return {
              x: parseInt(match[1]),
              y: parseInt(match[2])
            };
          }
        }
      } catch {
        // Try next path
      }
    }
    
    // Fallback to AppleScript - return a default position
    // macOS doesn't expose mouse position via AppleScript easily
    // Return screen center as fallback
    try {
      const screenResult = await exec(`osascript -e 'tell application "Finder" to get bounds of window of desktop'`);
      // Output format: 0, 0, width, height
      const bounds = screenResult.stdout.trim().split(', ').map(n => parseInt(n));
      if (bounds.length >= 4) {
        return {
          x: Math.floor(bounds[2] / 2),
          y: Math.floor(bounds[3] / 2)
        };
      }
    } catch {
      // Ignore
    }
    
    // Default to common screen center
    return { x: 640, y: 400 };
  }

  // Linux implementations
  private async moveLinux(x: number, y: number): Promise<void> {
    const result = await exec(`xdotool mousemove ${x} ${y}`);
    if (result.code !== 0) {
      throw new Error(`Failed to move mouse: ${result.stderr}. Make sure xdotool is installed.`);
    }
  }

  private async clickLinux(button: MouseButton): Promise<void> {
    const buttonMap = {
      'left': '1',
      'middle': '2',
      'right': '3'
    };
    
    const result = await exec(`xdotool click ${buttonMap[button]}`);
    if (result.code !== 0) {
      throw new Error(`Failed to click: ${result.stderr}`);
    }
  }

  private async doubleClickLinux(): Promise<void> {
    const result = await exec('xdotool click --repeat 2 --delay 50 1');
    if (result.code !== 0) {
      throw new Error(`Failed to double click: ${result.stderr}`);
    }
  }

  private async dragLinux(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    const commands = [
      `xdotool mousemove ${fromX} ${fromY}`,
      'xdotool mousedown 1',
      `xdotool mousemove ${toX} ${toY}`,
      'xdotool mouseup 1'
    ];
    
    for (const cmd of commands) {
      const result = await exec(cmd);
      if (result.code !== 0) {
        throw new Error(`Failed to drag: ${result.stderr}`);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private async scrollLinux(deltaX: number, deltaY: number): Promise<void> {
    // xdotool uses button 4 for scroll up, 5 for scroll down
    if (deltaY !== 0) {
      const button = deltaY > 0 ? '4' : '5';
      const times = Math.abs(deltaY);
      const result = await exec(`xdotool click --repeat ${times} ${button}`);
      if (result.code !== 0) {
        throw new Error(`Failed to scroll: ${result.stderr}`);
      }
    }
    
    if (deltaX !== 0) {
      // Horizontal scroll is buttons 6 and 7
      const button = deltaX > 0 ? '7' : '6';
      const times = Math.abs(deltaX);
      const result = await exec(`xdotool click --repeat ${times} ${button}`);
      if (result.code !== 0) {
        throw new Error(`Failed to scroll horizontally: ${result.stderr}`);
      }
    }
  }

  private async getPositionLinux(): Promise<MousePosition> {
    const result = await exec('xdotool getmouselocation --shell');
    if (result.code !== 0) {
      throw new Error(`Failed to get position: ${result.stderr}`);
    }
    
    const xMatch = result.stdout.match(/X=(\d+)/);
    const yMatch = result.stdout.match(/Y=(\d+)/);
    
    if (!xMatch || !yMatch) {
      throw new Error('Failed to parse mouse position');
    }
    
    return {
      x: parseInt(xMatch[1]),
      y: parseInt(yMatch[1])
    };
  }

  // Windows implementations
  private async moveWindows(x: number, y: number): Promise<void> {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
}
"@
[Mouse]::SetCursorPos(${x}, ${y})
    `.trim();
    
    const result = await exec(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
    if (result.code !== 0) {
      throw new Error(`Failed to move mouse: ${result.stderr}`);
    }
  }

  private async clickWindows(button: MouseButton): Promise<void> {
    const flags = {
      left: { down: 0x0002, up: 0x0004 },
      right: { down: 0x0008, up: 0x0010 },
      middle: { down: 0x0020, up: 0x0040 }
    };
    
    const flag = flags[button];
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
[Mouse]::mouse_event(${flag.down}, 0, 0, 0, 0)
Start-Sleep -Milliseconds 10
[Mouse]::mouse_event(${flag.up}, 0, 0, 0, 0)
    `.trim();
    
    const result = await exec(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
    if (result.code !== 0) {
      throw new Error(`Failed to click: ${result.stderr}`);
    }
  }

  private async doubleClickWindows(): Promise<void> {
    await this.clickWindows('left');
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.clickWindows('left');
  }

  private async dragWindows(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
[Mouse]::SetCursorPos(${fromX}, ${fromY})
Start-Sleep -Milliseconds 100
[Mouse]::mouse_event(0x0002, 0, 0, 0, 0)  # Left button down
Start-Sleep -Milliseconds 100
[Mouse]::SetCursorPos(${toX}, ${toY})
Start-Sleep -Milliseconds 100
[Mouse]::mouse_event(0x0004, 0, 0, 0, 0)  # Left button up
    `.trim();
    
    const result = await exec(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
    if (result.code !== 0) {
      throw new Error(`Failed to drag: ${result.stderr}`);
    }
  }

  private async scrollWindows(deltaX: number, deltaY: number): Promise<void> {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
[Mouse]::mouse_event(0x0800, 0, 0, ${deltaY * 120}, 0)  # Vertical scroll
    `.trim();
    
    const result = await exec(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
    if (result.code !== 0) {
      throw new Error(`Failed to scroll: ${result.stderr}`);
    }
  }

  private async getPositionWindows(): Promise<MousePosition> {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Mouse {
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }
    
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);
}
"@
$point = New-Object Mouse+POINT
[Mouse]::GetCursorPos([ref]$point) | Out-Null
Write-Output "$($point.X),$($point.Y)"
    `.trim();
    
    const result = await exec(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
    if (result.code !== 0) {
      throw new Error(`Failed to get position: ${result.stderr}`);
    }
    
    const match = result.stdout.trim().match(/(\d+),(\d+)/);
    if (!match) {
      throw new Error('Failed to parse mouse position');
    }
    
    return {
      x: parseInt(match[1]),
      y: parseInt(match[2])
    };
  }
}

// Export singleton instance
export default {
  move: (x: number, y: number) => new Mouse().move(x, y),
  click: (button?: MouseButton) => new Mouse().click(button),
  doubleClick: () => new Mouse().doubleClick(),
  drag: (fromX: number, fromY: number, toX: number, toY: number) => new Mouse().drag(fromX, fromY, toX, toY),
  scroll: (deltaX: number, deltaY: number) => new Mouse().scroll(deltaX, deltaY),
  getPosition: () => new Mouse().getPosition()
};