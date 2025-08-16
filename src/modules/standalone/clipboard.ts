/**
 * Cross-platform clipboard module for reading and writing text
 */

interface ClipboardModule {
  read(): Promise<string>;
  readSync(): string;
  write(text: string): Promise<void>;
  writeSync(text: string): void;
  clear(): Promise<void>;
  clearSync(): void;
}

class Clipboard implements ClipboardModule {
  private platform: string;

  constructor() {
    this.platform = Deno.build.os;
  }

  /**
   * Read text from the system clipboard
   * @returns Promise<string> The text content from clipboard
   */
  async read(): Promise<string> {
    switch (this.platform) {
      case 'darwin':
        return this.readMacOS();
      case 'windows':
        return this.readWindows();
      case 'linux':
        return this.readLinux();
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Read text from clipboard synchronously
   * @returns string The text content from clipboard
   */
  readSync(): string {
    const decoder = new TextDecoder();
    let output: Deno.CommandOutput;

    switch (this.platform) {
      case 'darwin':
        output = new Deno.Command('pbpaste').outputSync();
        break;
      case 'windows':
        output = new Deno.Command('powershell', {
          args: ['-Command', 'Get-Clipboard']
        }).outputSync();
        break;
      case 'linux':
        try {
          output = new Deno.Command('xclip', {
            args: ['-selection', 'clipboard', '-o']
          }).outputSync();
        } catch {
          // Fallback to xsel if xclip is not available
          output = new Deno.Command('xsel', {
            args: ['--clipboard', '--output']
          }).outputSync();
        }
        break;
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }

    if (!output.success) {
      throw new Error(`Failed to read clipboard: ${decoder.decode(output.stderr)}`);
    }

    return decoder.decode(output.stdout).trimEnd();
  }

  /**
   * Write text to the system clipboard
   * @param text The text to write to clipboard
   */
  async write(text: string): Promise<void> {
    switch (this.platform) {
      case 'darwin':
        await this.writeMacOS(text);
        break;
      case 'windows':
        await this.writeWindows(text);
        break;
      case 'linux':
        await this.writeLinux(text);
        break;
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Write text to clipboard synchronously
   * @param text The text to write to clipboard
   */
  writeSync(text: string): void {
    const encoder = new TextEncoder();
    let cmd: Deno.Command;

    switch (this.platform) {
      case 'darwin':
        cmd = new Deno.Command('pbcopy', {
          stdin: 'piped'
        });
        break;
      case 'windows':
        cmd = new Deno.Command('clip', {
          stdin: 'piped'
        });
        break;
      case 'linux':
        try {
          cmd = new Deno.Command('xclip', {
            args: ['-selection', 'clipboard'],
            stdin: 'piped'
          });
        } catch {
          // Fallback to xsel if xclip is not available
          cmd = new Deno.Command('xsel', {
            args: ['--clipboard', '--input'],
            stdin: 'piped'
          });
        }
        break;
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }

    const proc = cmd.spawn();
    const writer = proc.stdin!.getWriter();
    writer.write(encoder.encode(text));
    writer.close();
    proc.output();
  }

  /**
   * Clear the clipboard
   */
  async clear(): Promise<void> {
    await this.write('');
  }

  /**
   * Clear the clipboard synchronously
   */
  clearSync(): void {
    this.writeSync('');
  }

  // Platform-specific implementations
  private async readMacOS(): Promise<string> {
    const cmd = new Deno.Command('pbpaste');
    const output = await cmd.output();
    
    if (!output.success) {
      throw new Error('Failed to read clipboard on macOS');
    }
    
    return new TextDecoder().decode(output.stdout);
  }

  private async writeMacOS(text: string): Promise<void> {
    const cmd = new Deno.Command('pbcopy', {
      stdin: 'piped'
    });
    
    const proc = cmd.spawn();
    const writer = proc.stdin.getWriter();
    await writer.write(new TextEncoder().encode(text));
    await writer.close();
    
    const status = await proc.status;
    if (!status.success) {
      throw new Error('Failed to write to clipboard on macOS');
    }
  }

  private async readWindows(): Promise<string> {
    const cmd = new Deno.Command('powershell', {
      args: ['-Command', 'Get-Clipboard']
    });
    const output = await cmd.output();
    
    if (!output.success) {
      throw new Error('Failed to read clipboard on Windows');
    }
    
    return new TextDecoder().decode(output.stdout).trimEnd();
  }

  private async writeWindows(text: string): Promise<void> {
    const cmd = new Deno.Command('clip', {
      stdin: 'piped'
    });
    
    const proc = cmd.spawn();
    const writer = proc.stdin.getWriter();
    await writer.write(new TextEncoder().encode(text));
    await writer.close();
    
    const status = await proc.status;
    if (!status.success) {
      throw new Error('Failed to write to clipboard on Windows');
    }
  }

  private async readLinux(): Promise<string> {
    // Try xclip first
    try {
      const cmd = new Deno.Command('xclip', {
        args: ['-selection', 'clipboard', '-o']
      });
      const output = await cmd.output();
      
      if (output.success) {
        return new TextDecoder().decode(output.stdout);
      }
    } catch {
      // xclip not available, try xsel
    }

    // Fallback to xsel
    try {
      const cmd = new Deno.Command('xsel', {
        args: ['--clipboard', '--output']
      });
      const output = await cmd.output();
      
      if (output.success) {
        return new TextDecoder().decode(output.stdout);
      }
    } catch {
      throw new Error('Neither xclip nor xsel is available. Please install one of them.');
    }

    throw new Error('Failed to read clipboard on Linux');
  }

  private async writeLinux(text: string): Promise<void> {
    // Try xclip first
    try {
      const cmd = new Deno.Command('xclip', {
        args: ['-selection', 'clipboard'],
        stdin: 'piped'
      });
      
      const proc = cmd.spawn();
      const writer = proc.stdin.getWriter();
      await writer.write(new TextEncoder().encode(text));
      await writer.close();
      
      const status = await proc.status;
      if (status.success) {
        return;
      }
    } catch {
      // xclip not available, try xsel
    }

    // Fallback to xsel
    try {
      const cmd = new Deno.Command('xsel', {
        args: ['--clipboard', '--input'],
        stdin: 'piped'
      });
      
      const proc = cmd.spawn();
      const writer = proc.stdin.getWriter();
      await writer.write(new TextEncoder().encode(text));
      await writer.close();
      
      const status = await proc.status;
      if (status.success) {
        return;
      }
    } catch {
      throw new Error('Neither xclip nor xsel is available. Please install one of them.');
    }

    throw new Error('Failed to write to clipboard on Linux');
  }
}

// Create singleton instance
const clipboard = new Clipboard();

// Export both the instance and individual functions
export default clipboard;
export const read = () => clipboard.read();
export const readSync = () => clipboard.readSync();
export const write = (text: string) => clipboard.write(text);
export const writeSync = (text: string) => clipboard.writeSync(text);
export const clear = () => clipboard.clear();
export const clearSync = () => clipboard.clearSync();