// Database module - Cross-platform SQLite persistence

import { DatabaseSync } from "node:sqlite";  // Works in compiled binaries!
import * as platform from "./platform.js";

// Get cross-platform database path
function dbPath() {
  if (platform.isDarwin) {
    // macOS: ~/Library/Application Support/HLVM/
    return `${platform.homeDir()}/Library/Application Support/HLVM/HLVM.sqlite`;
  } else if (platform.isWindows) {
    // Windows: %APPDATA%\HLVM\
    const appData = Deno.env.get("APPDATA") || 
                    `${platform.homeDir()}\\AppData\\Roaming`;
    return `${appData}\\HLVM\\HLVM.sqlite`;
  } else {
    // Linux/Unix: ~/.local/share/HLVM/
    const xdgData = Deno.env.get("XDG_DATA_HOME") || 
                    `${platform.homeDir()}/.local/share`;
    return `${xdgData}/HLVM/HLVM.sqlite`;
  }
}

export const path = dbPath();

// Extract directory with cross-platform support
const dbDir = path.substring(0, 
  path.lastIndexOf(platform.isWindows ? "\\" : "/")
);

// Ensure directory exists
await Deno.mkdir(dbDir, { recursive: true });

// Open database
export const db = new DatabaseSync(path);

// Create table with WAL mode for better concurrency
db.exec("PRAGMA journal_mode=WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS modules (
    key TEXT PRIMARY KEY,
    namespace TEXT NOT NULL,
    source_code TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    type TEXT DEFAULT 'javascript',
    updated_at INTEGER NOT NULL,
    spotlight BOOLEAN DEFAULT 1
  )
`);

export async function save(name, code) {
  try {
    const isFunction = typeof code === 'function';
    const sourceCode = isFunction ? code.toString() : code;
    const namespace = `hlvm.${name}`;
    const metadata = JSON.stringify({
      isFunction,
      createdAt: new Date().toISOString(),
      platform: platform.os
    });
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO modules 
      (key, namespace, source_code, metadata, type, updated_at, spotlight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(name, namespace, sourceCode, metadata, 'javascript', Date.now(), 1);
    
    return true;
  } catch (e) {
    throw new Error(`Save failed: ${e.message}`);
  }
}

export async function load(name) {
  try {
    const module = db.prepare("SELECT * FROM modules WHERE key = ?").get(name);
    if (!module) throw new Error(`Module '${name}' not found`);
    
    const metadata = JSON.parse(module.metadata || '{}');
    
    if (metadata.isFunction) {
      return eval(`(${module.source_code})`);
    }
    
    // Use cross-platform temp directory
    const tempDir = platform.tempDir();
    const tempFile = `${tempDir}${platform.pathSep}hlvm-module-${name}-${Date.now()}.js`;
    await Deno.writeTextFile(tempFile, module.source_code);
    
    // Import with file:// protocol (works cross-platform)
    const imported = await import(`file://${tempFile}`);
    
    // Clean up after import
    setTimeout(() => Deno.remove(tempFile).catch(() => {}), 1000);
    
    return imported;
  } catch (e) {
    throw new Error(`Load failed: ${e.message}`);
  }
}

export function list() {
  try {
    const stmt = db.prepare(`
      SELECT key, namespace, type, updated_at, spotlight 
      FROM modules 
      WHERE spotlight = 1 
      ORDER BY updated_at DESC
    `);
    const modules = stmt.all();
    return modules.map(m => ({
      key: m.key,
      namespace: m.namespace,
      type: m.type,
      updatedAt: new Date(m.updated_at)
    }));
  } catch (e) {
    return [];
  }
}

export function remove(name) {
  try {
    const stmt = db.prepare("DELETE FROM modules WHERE key = ?");
    stmt.run(name);
    return true;
  } catch (e) {
    throw new Error(`Remove failed: ${e.message}`);
  }
}