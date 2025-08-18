// Database module - Cross-platform SQLite persistence

import { DatabaseSync } from "node:sqlite";  // Works in compiled binaries!
import * as platform from "./platform.js";
import { notifyModulesChanged, notifyEvent } from "./notifier.js";

// Try to load esbuild if available
let esbuild = null;
try {
  esbuild = await import("https://deno.land/x/esbuild@0.20.0/mod.js");
} catch {
  // esbuild not available - bundling will be disabled
}

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

// Create modules directory if it doesn't exist
const modulesDir = `${dbDir}${platform.pathSep}modules`;
await Deno.mkdir(modulesDir, { recursive: true });

// Create table with WAL mode for better concurrency
db.exec("PRAGMA journal_mode=WAL");

// Check if we need to migrate from old schema
const tableInfo = db.prepare("PRAGMA table_info(modules)").all();
const hasSourceCode = tableInfo.some(col => col.name === 'source_code');
const hasFilePath = tableInfo.some(col => col.name === 'file_path');

if (hasSourceCode && !hasFilePath) {
  // Old schema - needs migration
  console.log("Migrating HLVM database to new schema...");
  
  // Create new table with new schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS modules_new (
      key TEXT PRIMARY KEY,
      namespace TEXT NOT NULL,
      file_path TEXT NOT NULL,
      entry_point TEXT DEFAULT 'default',
      metadata TEXT DEFAULT '{}',
      type TEXT DEFAULT 'javascript',
      updated_at INTEGER NOT NULL,
      spotlight BOOLEAN DEFAULT 1
    )
  `);
  
  // Migrate existing data (save source_code to files)
  const oldModules = db.prepare("SELECT * FROM modules").all();
  for (const mod of oldModules) {
    const fileName = `${mod.key}.module.js`;
    const filePath = `${modulesDir}${platform.pathSep}${fileName}`;
    await Deno.writeTextFile(filePath, mod.source_code);
    
    db.prepare(`
      INSERT INTO modules_new (key, namespace, file_path, entry_point, metadata, type, updated_at, spotlight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(mod.key, mod.namespace, `modules/${fileName}`, 'default', mod.metadata, mod.type, mod.updated_at, mod.spotlight);
  }
  
  // Drop old table and rename new one
  db.exec("DROP TABLE modules");
  db.exec("ALTER TABLE modules_new RENAME TO modules");
  
  console.log("Migration complete!");
} else if (!hasSourceCode && !hasFilePath) {
  // No table or empty - create new schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS modules (
      key TEXT PRIMARY KEY,
      namespace TEXT NOT NULL,
      file_path TEXT NOT NULL,
      entry_point TEXT DEFAULT 'default',
      metadata TEXT DEFAULT '{}',
      type TEXT DEFAULT 'javascript',
      updated_at INTEGER NOT NULL,
      spotlight BOOLEAN DEFAULT 1
    )
  `);
}

// Detect if input is a file path more elegantly
function isFilePath(input) {
  try {
    // Check if it's an existing file
    const stat = Deno.statSync(input);
    return stat.isFile;
  } catch {
    // Not an existing file, check if it looks like a path
    return input.includes('/') || input.endsWith('.js') || input.endsWith('.ts');
  }
}

// Bundle code using esbuild (required)
async function bundleCode(codeOrPath) {
  // If esbuild not available, just return the code as-is for now (temporary for testing)
  if (!esbuild) {
    // For testing in compiled binary - just return code without bundling
    const isPath = isFilePath(codeOrPath);
    if (isPath) {
      return await Deno.readTextFile(codeOrPath);
    }
    return typeof codeOrPath === 'function' 
      ? `export default ${codeOrPath.toString()}`
      : codeOrPath;
  }
  
  const isPath = isFilePath(codeOrPath);
  
  try {
    const result = await esbuild.build({
      entryPoints: isPath ? [codeOrPath] : undefined,
      stdin: !isPath ? {
        contents: typeof codeOrPath === 'function' 
          ? `export default ${codeOrPath.toString()}`
          : codeOrPath,
        loader: 'js',
        resolveDir: Deno.cwd(),
      } : undefined,
      bundle: true,
      format: 'esm',
      platform: 'browser',  // Use 'browser' for Deno compatibility
      target: 'esnext',
      write: false,
    });
    
    if (result.errors.length > 0) {
      const error = result.errors[0];
      throw new Error(`${error.text} at ${error.location?.file || 'input'}:${error.location?.line || 0}`);
    }
    
    // Stop esbuild to free resources
    await esbuild.stop();
    
    return result.outputFiles[0].text;
  } catch (error) {
    // Determine error type for better reporting
    let errorType = 'bundle';
    if (error.message.includes('Could not resolve')) {
      errorType = 'import';
    } else if (error.message.includes('Syntax') || error.message.includes('Unexpected')) {
      errorType = 'syntax';
    }
    
    // Re-throw with type
    error.type = errorType;
    throw error;
  }
}

export async function save(name, codeOrPath) {
  try {
    // Bundle the code
    const bundled = await bundleCode(codeOrPath);
    
    // Detect if it has default export function
    const hasDefaultFunction = bundled.includes('export default function') ||
                              bundled.includes('export default async function');
    
    // Save bundled code to file
    const fileName = `${name}.module.js`;
    const filePath = `${modulesDir}${platform.pathSep}${fileName}`;
    await Deno.writeTextFile(filePath, bundled);
    
    // Save metadata to SQLite
    const namespace = `hlvm.${name}`;
    const metadata = JSON.stringify({
      hasDefaultFunction,
      createdAt: new Date().toISOString(),
      platform: platform.os,
      bundled: true,
      isUserModule: true
    });
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO modules 
      (key, namespace, file_path, entry_point, metadata, type, updated_at, spotlight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const entryPoint = hasDefaultFunction ? 'default' : 'script';
    stmt.run(name, namespace, `modules/${fileName}`, entryPoint, metadata, 'javascript', Date.now(), 1);
    
    // Notify system about the change (cross-platform)
    await notifyModulesChanged();
    
    return true;
  } catch (error) {
    // Notify system about bundle failure
    const errorInfo = {
      name,
      error: error.message,
      type: error.type || 'unknown'
    };
    
    // Log error for user (DRY - single source of error message)
    console.error(`❌ Failed to save '${name}': ${error.message}`);
    
    // Notify GUI apps
    await notifyEvent('module.bundle.failed', errorInfo);
    
    throw error;
  }
}

export async function load(name) {
  try {
    const module = db.prepare("SELECT * FROM modules WHERE key = ?").get(name);
    if (!module) throw new Error(`Module '${name}' not found`);
    
    // Read code from file
    const filePath = `${dbDir}${platform.pathSep}${module.file_path}`;
    const code = await Deno.readTextFile(filePath);
    
    // Create temp file for import
    const tempDir = platform.tempDir();
    const tempFile = `${tempDir}${platform.pathSep}hlvm-module-${name}-${Date.now()}.js`;
    await Deno.writeTextFile(tempFile, code);
    
    // Import with file:// protocol
    const imported = await import(`file://${tempFile}`);
    
    // Clean up after import
    setTimeout(() => Deno.remove(tempFile).catch(() => {}), 1000);
    
    // Return the default function directly if it exists, otherwise return the module
    // This makes it more intuitive: const fn = await load('name'); await fn();
    return imported.default || imported;
  } catch (e) {
    throw new Error(`Load failed: ${e.message}`);
  }
}

// Get source code for editing/viewing
export async function getSource(name) {
  try {
    const module = db.prepare("SELECT * FROM modules WHERE key = ?").get(name);
    if (!module) throw new Error(`Module '${name}' not found`);
    
    // Read code from file
    const filePath = `${dbDir}${platform.pathSep}${module.file_path}`;
    const code = await Deno.readTextFile(filePath);
    
    return code;
  } catch (e) {
    throw new Error(`Get source failed: ${e.message}`);
  }
}

export function list() {
  try {
    const stmt = db.prepare(`
      SELECT key, namespace, file_path, entry_point, type, updated_at, spotlight 
      FROM modules 
      WHERE spotlight = 1 
      ORDER BY updated_at DESC
    `);
    const modules = stmt.all();
    return modules.map(m => ({
      key: m.key,
      namespace: m.namespace,
      filePath: m.file_path,
      entryPoint: m.entry_point,
      type: m.type,
      updatedAt: new Date(m.updated_at)
    }));
  } catch (e) {
    return [];
  }
}

export async function remove(name) {
  try {
    // Get module info first
    const module = db.prepare("SELECT file_path FROM modules WHERE key = ?").get(name);
    
    if (module) {
      // Delete the file
      const filePath = `${dbDir}${platform.pathSep}${module.file_path}`;
      await Deno.remove(filePath).catch(() => {});
    }
    
    // Delete from database
    const stmt = db.prepare("DELETE FROM modules WHERE key = ?");
    stmt.run(name);
    
    // Notify system about the change (cross-platform)
    await notifyModulesChanged();
    
    return true;
  } catch (e) {
    throw new Error(`Remove failed: ${e.message}`);
  }
}