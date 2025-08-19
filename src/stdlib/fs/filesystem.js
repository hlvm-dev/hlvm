// Filesystem module - Cross-platform file operations

import * as platform from "../core/platform.js";

// File operations
class FileOps {
  /**
   * Reads text content from a file
   * @param {string} path - File path to read
   * @returns {Promise<string>} File content as text
   * @example
   * await read('/tmp/test.txt')
   * // → "Hello World"
   */
  static read = (path) => Deno.readTextFile(path);
  /**
   * Writes text content to a file
   * @param {string} path - File path to write
   * @param {string} content - Text content to write
   * @returns {Promise<void>}
   * @example
   * await write('/tmp/test.txt', 'Hello World')
   * // → File created with content
   */
  static write = (path, content) => Deno.writeTextFile(path, content);
  /**
   * Reads binary content from a file
   * @param {string} path - File path to read
   * @returns {Promise<Uint8Array>} File content as bytes
   * @example
   * await readBytes('/tmp/image.png')
   * // → Uint8Array[137, 80, 78, ...]
   */
  static readBytes = (path) => Deno.readFile(path);
  /**
   * Writes binary content to a file
   * @param {string} path - File path to write
   * @param {Uint8Array} data - Binary data to write
   * @returns {Promise<void>}
   * @example
   * await writeBytes('/tmp/data.bin', new Uint8Array([1,2,3]))
   * // → Binary file created
   */
  static writeBytes = (path, data) => Deno.writeFile(path, data);
  
  /**
   * Checks if a file or directory exists
   * @param {string} path - Path to check
   * @returns {Promise<boolean>} True if exists
   * @example
   * await exists('/tmp/test.txt')
   * // → true
   */
  static async exists(path) {
    try {
      await Deno.stat(path);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Gets file or directory information
   * @param {string} path - Path to stat
   * @returns {Promise<Deno.FileInfo>} File information
   * @example
   * await stat('/tmp/test.txt')
   * // → {size: 11, isFile: true, isDirectory: false, ...}
   */
  static stat = (path) => Deno.stat(path);
}

// Directory operations
class DirOps {
  /**
   * Creates a directory
   * @param {string} path - Directory path to create
   * @param {Object} [options={recursive: true}] - Creation options
   * @returns {Promise<void>}
   * @example
   * await mkdir('/tmp/test/deep/path')
   * // → Creates all directories in path
   */
  static mkdir = (path, options = { recursive: true }) => Deno.mkdir(path, options);
  /**
   * Reads directory contents
   * @param {string} path - Directory path to read
   * @returns {AsyncIterable<Deno.DirEntry>} Directory entries
   * @example
   * for await (const entry of readdir('/tmp')) {
   *   console.log(entry.name, entry.isFile)
   * }
   * // → test.txt true
   * // → subdir false
   */
  static readdir = (path) => Deno.readDir(path);
  /**
   * Removes a file or directory
   * @param {string} path - Path to remove
   * @param {Object} [options={recursive: true}] - Removal options
   * @returns {Promise<void>}
   * @example
   * await remove('/tmp/test')
   * // → Removes test and all contents
   */
  static remove = (path, options = { recursive: true }) => Deno.remove(path, options);
  
  /**
   * Copies files or directories recursively
   * @param {string} src - Source path
   * @param {string} dest - Destination path
   * @returns {Promise<void>}
   * @example
   * await copy('/tmp/source', '/tmp/backup')
   * // → Creates backup with all contents
   */
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
  
  /**
   * Moves or renames files and directories
   * @param {string} src - Source path
   * @param {string} dest - Destination path
   * @returns {Promise<void>}
   * @example
   * await move('/tmp/old.txt', '/tmp/new.txt')
   * // → Renames old.txt to new.txt
   */
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
  /**
   * Joins path segments using platform separator
   * @param {...string} paths - Path segments to join
   * @returns {string} Joined path
   * @example
   * join('/tmp', 'test', 'file.txt')
   * // → '/tmp/test/file.txt' (Unix)
   * // → '\tmp\test\file.txt' (Windows)
   */
  static join(...paths) {
    return paths.join(platform.pathSep);
  }
  
  /**
   * Gets directory name from path
   * @param {string} path - File path
   * @returns {string} Directory path
   * @example
   * dirname('/tmp/test/file.txt')
   * // → '/tmp/test'
   */
  static dirname(path) {
    const sep = platform.pathSep;
    const lastIndex = path.lastIndexOf(sep);
    return lastIndex === -1 ? "." : path.substring(0, lastIndex);
  }
  
  /**
   * Gets filename from path
   * @param {string} path - File path
   * @param {string} [ext=''] - Extension to remove
   * @returns {string} Filename
   * @example
   * basename('/tmp/test/file.txt')
   * // → 'file.txt'
   * basename('/tmp/test/file.txt', '.txt')
   * // → 'file'
   */
  static basename(path, ext = "") {
    const sep = platform.pathSep;
    const lastIndex = path.lastIndexOf(sep);
    const base = lastIndex === -1 ? path : path.substring(lastIndex + 1);
    return ext && base.endsWith(ext) 
      ? base.substring(0, base.length - ext.length)
      : base;
  }
  
  /**
   * Gets file extension from path
   * @param {string} path - File path
   * @returns {string} Extension including dot
   * @example
   * extname('/tmp/test/file.txt')
   * // → '.txt'
   * extname('/tmp/test/file')
   * // → ''
   */
  static extname(path) {
    const lastDot = path.lastIndexOf(".");
    return lastDot === -1 ? "" : path.substring(lastDot);
  }
}

// Initialize documentation for REPL display
function initializeDocs() {
  // File operations docs
  FileOps.read.__doc__ = `\x1b[36mread(path)\x1b[0m

Reads text content from a file

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - File path to read

\x1b[33mReturns:\x1b[0m Promise<string> - File content as text

\x1b[33mExample:\x1b[0m
  await read('/tmp/test.txt')
  \x1b[32m// → "Hello World"\x1b[0m`;
  FileOps.read[Symbol.for('Deno.customInspect')] = function() { return FileOps.read.__doc__; };

  FileOps.write.__doc__ = `\x1b[36mwrite(path, content)\x1b[0m

Writes text content to a file

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - File path to write
  content: \x1b[90mstring\x1b[0m - Text content to write

\x1b[33mReturns:\x1b[0m Promise<void>

\x1b[33mExample:\x1b[0m
  await write('/tmp/test.txt', 'Hello World')
  \x1b[32m// → File created with content\x1b[0m`;
  FileOps.write[Symbol.for('Deno.customInspect')] = function() { return FileOps.write.__doc__; };

  FileOps.exists.__doc__ = `\x1b[36mexists(path)\x1b[0m

Checks if a file or directory exists

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - Path to check

\x1b[33mReturns:\x1b[0m Promise<boolean>

\x1b[33mExample:\x1b[0m
  await exists('/tmp/test.txt')
  \x1b[32m// → true\x1b[0m`;
  FileOps.exists[Symbol.for('Deno.customInspect')] = function() { return FileOps.exists.__doc__; };

  // Directory operations docs
  DirOps.mkdir.__doc__ = `\x1b[36mmkdir(path, options?)\x1b[0m

Creates a directory

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - Directory path to create
  options: \x1b[90mObject\x1b[0m (optional) - {recursive: true}

\x1b[33mReturns:\x1b[0m Promise<void>

\x1b[33mExample:\x1b[0m
  await mkdir('/tmp/test/deep/path')
  \x1b[32m// → Creates all directories in path\x1b[0m`;
  DirOps.mkdir[Symbol.for('Deno.customInspect')] = function() { return DirOps.mkdir.__doc__; };

  DirOps.remove.__doc__ = `\x1b[36mremove(path, options?)\x1b[0m

Removes a file or directory

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - Path to remove
  options: \x1b[90mObject\x1b[0m (optional) - {recursive: true}

\x1b[33mReturns:\x1b[0m Promise<void>

\x1b[33mExample:\x1b[0m
  await remove('/tmp/test')
  \x1b[32m// → Removes test and all contents\x1b[0m`;
  DirOps.remove[Symbol.for('Deno.customInspect')] = function() { return DirOps.remove.__doc__; };

  DirOps.copy.__doc__ = `\x1b[36mcopy(src, dest)\x1b[0m

Copies files or directories recursively

\x1b[33mParameters:\x1b[0m
  src: \x1b[90mstring\x1b[0m - Source path
  dest: \x1b[90mstring\x1b[0m - Destination path

\x1b[33mReturns:\x1b[0m Promise<void>

\x1b[33mExample:\x1b[0m
  await copy('/tmp/source', '/tmp/backup')
  \x1b[32m// → Creates backup with all contents\x1b[0m`;
  DirOps.copy[Symbol.for('Deno.customInspect')] = function() { return DirOps.copy.__doc__; };

  DirOps.move.__doc__ = `\x1b[36mmove(src, dest)\x1b[0m

Moves or renames files and directories

\x1b[33mParameters:\x1b[0m
  src: \x1b[90mstring\x1b[0m - Source path
  dest: \x1b[90mstring\x1b[0m - Destination path

\x1b[33mReturns:\x1b[0m Promise<void>

\x1b[33mExample:\x1b[0m
  await move('/tmp/old.txt', '/tmp/new.txt')
  \x1b[32m// → Renames old.txt to new.txt\x1b[0m`;
  DirOps.move[Symbol.for('Deno.customInspect')] = function() { return DirOps.move.__doc__; };

  // Path utilities docs
  PathUtils.join.__doc__ = `\x1b[36mjoin(...paths)\x1b[0m

Joins path segments using platform separator

\x1b[33mParameters:\x1b[0m
  ...paths: \x1b[90mstring[]\x1b[0m - Path segments to join

\x1b[33mReturns:\x1b[0m string - Joined path

\x1b[33mExample:\x1b[0m
  join('/tmp', 'test', 'file.txt')
  \x1b[32m// → '/tmp/test/file.txt' (Unix)
  // → '\\tmp\\test\\file.txt' (Windows)\x1b[0m`;
  PathUtils.join[Symbol.for('Deno.customInspect')] = function() { return PathUtils.join.__doc__; };
}

// Initialize docs on module load
initializeDocs();

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