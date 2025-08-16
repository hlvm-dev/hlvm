// Filesystem module - Cross-platform file operations

import * as platform from "../core/platform.js";

// File operations - concise names with clear context from parameters
export const read = (path) => Deno.readTextFile(path);
export const write = (path, content) => Deno.writeTextFile(path, content);

// Binary operations when needed
export const readBytes = (path) => Deno.readFile(path);
export const writeBytes = (path, data) => Deno.writeFile(path, data);

// Path operations with cross-platform support
export async function exists(path) {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

export function remove(path, options = { recursive: true }) {
  return Deno.remove(path, options);
}

export function mkdir(path, options = { recursive: true }) {
  return Deno.mkdir(path, options);
}

export function readdir(path) {
  return Deno.readDir(path);
}

export async function stat(path) {
  return Deno.stat(path);
}

// Cross-platform path utilities
export function join(...paths) {
  return paths.join(platform.pathSep);
}

export function dirname(path) {
  const sep = platform.pathSep;
  const lastIndex = path.lastIndexOf(sep);
  return lastIndex === -1 ? "." : path.substring(0, lastIndex);
}

export function basename(path, ext = "") {
  const sep = platform.pathSep;
  const lastIndex = path.lastIndexOf(sep);
  const base = lastIndex === -1 ? path : path.substring(lastIndex + 1);
  return ext && base.endsWith(ext) 
    ? base.substring(0, base.length - ext.length)
    : base;
}

export function extname(path) {
  const lastDot = path.lastIndexOf(".");
  return lastDot === -1 ? "" : path.substring(lastDot);
}

// Copy file or directory
export async function copy(src, dest) {
  const srcStat = await stat(src);
  
  if (srcStat.isFile) {
    const data = await readBytes(src);
    await writeBytes(dest, data);
  } else if (srcStat.isDirectory) {
    await mkdir(dest);
    for await (const entry of readdir(src)) {
      await copy(
        join(src, entry.name),
        join(dest, entry.name)
      );
    }
  }
}

// Move file or directory (cross-platform)
export async function move(src, dest) {
  try {
    await Deno.rename(src, dest);
  } catch {
    // If rename fails (e.g., across drives on Windows), copy and delete
    await copy(src, dest);
    await remove(src);
  }
}