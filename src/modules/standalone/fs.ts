/**
 * File System Module
 * Provides a clean interface for file system operations using Deno's APIs
 */

import { join, dirname, basename, extname, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import { ensureDir as stdEnsureDir, ensureFile as stdEnsureFile, move as stdMove, copy as copyDir } from "https://deno.land/std@0.224.0/fs/mod.ts";

/**
 * File stats information
 */
export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  createdAt: Date | null;
  modifiedAt: Date | null;
  accessedAt: Date | null;
  mode: number | null;
}

/**
 * Options for file operations
 */
export interface FileOptions {
  encoding?: string;
  append?: boolean;
  create?: boolean;
  createNew?: boolean;
  mode?: number;
}

/**
 * Options for directory operations
 */
export interface DirectoryOptions {
  recursive?: boolean;
  mode?: number;
}

/**
 * Directory entry information
 */
export interface DirectoryEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
}

/**
 * File watcher event
 */
export interface WatchEvent {
  kind: "create" | "modify" | "remove" | "rename" | "access";
  paths: string[];
}

/**
 * File System Module
 */
export class FileSystem {
  /**
   * Read a file as text
   */
  async readText(path: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
    const data = await Deno.readFile(path);
    const decoder = new TextDecoder(encoding);
    return decoder.decode(data);
  }

  /**
   * Read a file as binary data
   */
  async readBinary(path: string): Promise<Uint8Array> {
    return await Deno.readFile(path);
  }

  /**
   * Write text to a file
   */
  async writeText(path: string, content: string, options?: FileOptions): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    const writeOptions: Deno.WriteFileOptions = {
      append: options?.append,
      create: options?.create ?? true,
      createNew: options?.createNew,
      mode: options?.mode,
    };
    
    await Deno.writeFile(path, data, writeOptions);
  }

  /**
   * Write binary data to a file
   */
  async writeBinary(path: string, data: Uint8Array, options?: FileOptions): Promise<void> {
    const writeOptions: Deno.WriteFileOptions = {
      append: options?.append,
      create: options?.create ?? true,
      createNew: options?.createNew,
      mode: options?.mode,
    };
    
    await Deno.writeFile(path, data, writeOptions);
  }

  /**
   * Append text to a file
   */
  async appendText(path: string, content: string, encoding: BufferEncoding = "utf-8"): Promise<void> {
    await this.writeText(path, content, { append: true, encoding });
  }

  /**
   * Remove a file
   */
  async remove(path: string): Promise<void> {
    await Deno.remove(path);
  }

  /**
   * Rename/move a file
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    await Deno.rename(oldPath, newPath);
  }

  /**
   * Copy a file
   */
  async copy(source: string, destination: string, overwrite = false): Promise<void> {
    if (!overwrite && await this.exists(destination)) {
      throw new Error(`Destination file already exists: ${destination}`);
    }
    await Deno.copyFile(source, destination);
  }

  /**
   * Create a directory
   */
  async mkdir(path: string, options?: DirectoryOptions): Promise<void> {
    if (options?.recursive) {
      await stdEnsureDir(path);
    } else {
      await Deno.mkdir(path, { mode: options?.mode });
    }
  }

  /**
   * Remove a directory
   */
  async rmdir(path: string, options?: DirectoryOptions): Promise<void> {
    await Deno.remove(path, { recursive: options?.recursive });
  }

  /**
   * Read directory contents
   */
  async readdir(path: string): Promise<DirectoryEntry[]> {
    const entries: DirectoryEntry[] = [];
    
    for await (const entry of Deno.readDir(path)) {
      entries.push({
        name: entry.name,
        path: join(path, entry.name),
        isFile: entry.isFile,
        isDirectory: entry.isDirectory,
        isSymlink: entry.isSymlink,
      });
    }
    
    return entries;
  }

  /**
   * Check if a path exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file/directory statistics
   */
  async stat(path: string): Promise<FileStats> {
    const stats = await Deno.stat(path);
    
    return {
      size: stats.size,
      isFile: stats.isFile,
      isDirectory: stats.isDirectory,
      isSymlink: stats.isSymlink,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime,
      mode: stats.mode,
    };
  }

  /**
   * Check if a path is a file
   */
  async isFile(path: string): Promise<boolean> {
    try {
      const stats = await this.stat(path);
      return stats.isFile;
    } catch {
      return false;
    }
  }

  /**
   * Check if a path is a directory
   */
  async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await this.stat(path);
      return stats.isDirectory;
    } catch {
      return false;
    }
  }

  /**
   * Watch for file system changes
   */
  async *watch(paths: string | string[]): AsyncGenerator<WatchEvent> {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    const watcher = Deno.watchFs(pathArray);
    
    for await (const event of watcher) {
      yield {
        kind: event.kind as WatchEvent["kind"],
        paths: event.paths,
      };
    }
  }

  /**
   * Ensure a file exists, creating it if necessary
   */
  async ensureFile(path: string): Promise<void> {
    await stdEnsureFile(path);
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  async ensureDir(path: string): Promise<void> {
    await stdEnsureDir(path);
  }

  /**
   * Move a file or directory
   */
  async move(source: string, destination: string, overwrite = false): Promise<void> {
    await stdMove(source, destination, { overwrite });
  }

  /**
   * Copy a directory recursively
   */
  async copyDir(source: string, destination: string, overwrite = false): Promise<void> {
    await copyDir(source, destination, { overwrite });
  }

  /**
   * Get the size of a file or directory (recursive)
   */
  async getSize(path: string): Promise<number> {
    const stats = await this.stat(path);
    
    if (stats.isFile) {
      return stats.size;
    }
    
    if (stats.isDirectory) {
      let totalSize = 0;
      const entries = await this.readdir(path);
      
      for (const entry of entries) {
        totalSize += await this.getSize(entry.path);
      }
      
      return totalSize;
    }
    
    return 0;
  }

  /**
   * Create a temporary file
   */
  async createTempFile(prefix = "temp", suffix = ""): Promise<string> {
    const tempDir = await Deno.makeTempDir();
    const tempFileName = `${prefix}-${Date.now()}${suffix}`;
    const tempFilePath = join(tempDir, tempFileName);
    await this.writeText(tempFilePath, "");
    return tempFilePath;
  }

  /**
   * Create a temporary directory
   */
  async createTempDir(prefix = "temp"): Promise<string> {
    return await Deno.makeTempDir({ prefix });
  }

  // Convenience aliases for common operations
  async read(path: string, encoding?: BufferEncoding): Promise<string> {
    return this.readText(path, encoding);
  }

  async write(path: string, content: string | Uint8Array, options?: FileOptions): Promise<void> {
    if (typeof content === 'string') {
      return this.writeText(path, content, options);
    } else {
      return this.writeBinary(path, content, options);
    }
  }

  async append(path: string, content: string, encoding?: BufferEncoding): Promise<void> {
    return this.appendText(path, content, encoding);
  }
}

// Create and export singleton instance
const fs = new FileSystem();
export { fs };
export default fs;

// Export path utilities for convenience
export { join, dirname, basename, extname, resolve };

// Define common types
export type BufferEncoding = 
  | "ascii"
  | "utf8"
  | "utf-8"
  | "utf16le"
  | "ucs2"
  | "ucs-2"
  | "base64"
  | "latin1"
  | "binary"
  | "hex";