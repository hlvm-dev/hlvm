// Filesystem module - Cross-platform file operations

import * as platform from "../core/platform.js";

// File operations
class FileOps {
  static read = (path) => Deno.readTextFile(path);
  static write = (path, content) => Deno.writeTextFile(path, content);
  static readBytes = (path) => Deno.readFile(path);
  static writeBytes = (path, data) => Deno.writeFile(path, data);
  
  static async exists(path) {
    try {
      await Deno.stat(path);
      return true;
    } catch {
      return false;
    }
  }
  
  static stat = (path) => Deno.stat(path);
}

// Directory operations
class DirOps {
  static mkdir = (path, options = { recursive: true }) => Deno.mkdir(path, options);
  static readdir = (path) => Deno.readDir(path);
  static remove = (path, options = { recursive: true }) => Deno.remove(path, options);
  
  static async copy(src, dest) {
    const srcStat = await FileOps.stat(src);
    
    if (srcStat.isFile) {
      const data = await FileOps.readBytes(src);
      await FileOps.writeBytes(dest, data);
    } else if (srcStat.isDirectory) {
      await this.mkdir(dest);
      for await (const entry of this.readdir(src)) {
        await this.copy(
          PathUtils.join(src, entry.name),
          PathUtils.join(dest, entry.name)
        );
      }
    }
  }
  
  static async move(src, dest) {
    try {
      await Deno.rename(src, dest);
    } catch {
      // If rename fails (e.g., across drives on Windows), copy and delete
      await this.copy(src, dest);
      await this.remove(src);
    }
  }
}

// Path utilities
class PathUtils {
  static join(...paths) {
    return paths.join(platform.pathSep);
  }
  
  static dirname(path) {
    const sep = platform.pathSep;
    const lastIndex = path.lastIndexOf(sep);
    return lastIndex === -1 ? "." : path.substring(0, lastIndex);
  }
  
  static basename(path, ext = "") {
    const sep = platform.pathSep;
    const lastIndex = path.lastIndexOf(sep);
    const base = lastIndex === -1 ? path : path.substring(lastIndex + 1);
    return ext && base.endsWith(ext) 
      ? base.substring(0, base.length - ext.length)
      : base;
  }
  
  static extname(path) {
    const lastDot = path.lastIndexOf(".");
    return lastDot === -1 ? "" : path.substring(lastDot);
  }
}

// Export public API (maintain backward compatibility)
export const read = FileOps.read;
export const write = FileOps.write;
export const readBytes = FileOps.readBytes;
export const writeBytes = FileOps.writeBytes;
export const exists = FileOps.exists;
export const stat = FileOps.stat;

export const mkdir = DirOps.mkdir;
export const readdir = DirOps.readdir;
export const remove = DirOps.remove;
export const copy = DirOps.copy;
export const move = DirOps.move;

export const join = PathUtils.join;
export const dirname = PathUtils.dirname;
export const basename = PathUtils.basename;
export const extname = PathUtils.extname;