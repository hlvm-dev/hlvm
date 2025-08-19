// Database module - Cross-platform SQLite persistence

import { DatabaseSync } from "node:sqlite";  // Works in compiled binaries!
import * as platform from "./platform.js";

// Module configuration
class ModuleConfig {
  static get dbPath() {
    if (platform.isDarwin) {
      return `${platform.homeDir()}/Library/Application Support/HLVM/HLVM.sqlite`;
    } else if (platform.isWindows) {
      const appData = Deno.env.get("APPDATA") || `${platform.homeDir()}\\AppData\\Roaming`;
      return `${appData}\\HLVM\\HLVM.sqlite`;
    } else {
      const xdgData = Deno.env.get("XDG_DATA_HOME") || `${platform.homeDir()}/.local/share`;
      return `${xdgData}/HLVM/HLVM.sqlite`;
    }
  }

  static get dbDir() {
    const path = this.dbPath;
    return path.substring(0, path.lastIndexOf(platform.isWindows ? "\\" : "/"));
  }

  static get modulesDir() {
    return `${this.dbDir}${platform.pathSep}modules`;
  }
}

// Database manager
class DatabaseManager {
  constructor() {
    this.path = ModuleConfig.dbPath;
    this.dbDir = ModuleConfig.dbDir;
    this.modulesDir = ModuleConfig.modulesDir;
    this.db = null;
    this.esbuild = null;
  }

  async init() {
    // Ensure directories exist
    await Deno.mkdir(this.dbDir, { recursive: true });
    await Deno.mkdir(this.modulesDir, { recursive: true });

    // Open database with WAL mode
    this.db = new DatabaseSync(this.path);
    this.db.exec("PRAGMA journal_mode=WAL");

    // Initialize schema
    await this.initSchema();

    // Try to load esbuild for bundling
    try {
      this.esbuild = await import("https://deno.land/x/esbuild@0.20.0/mod.js");
    } catch {
      // esbuild not available - bundling will be disabled
    }
  }

  async initSchema() {
    const tableInfo = this.db.prepare("PRAGMA table_info(modules)").all();
    const hasSourceCode = tableInfo.some(col => col.name === 'source_code');
    const hasFilePath = tableInfo.some(col => col.name === 'file_path');

    if (hasSourceCode && !hasFilePath) {
      await this.migrateFromOldSchema();
    } else if (!hasSourceCode && !hasFilePath) {
      this.createNewSchema();
    }
  }

  async migrateFromOldSchema() {
    console.log("Migrating HLVM database to new schema...");
    
    this.db.exec(`
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
    
    const oldModules = this.db.prepare("SELECT * FROM modules").all();
    for (const mod of oldModules) {
      const fileName = `${mod.key}.module.js`;
      const filePath = `${this.modulesDir}${platform.pathSep}${fileName}`;
      await Deno.writeTextFile(filePath, mod.source_code);
      
      this.db.prepare(`
        INSERT INTO modules_new (key, namespace, file_path, entry_point, metadata, type, updated_at, spotlight)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(mod.key, mod.namespace, `modules/${fileName}`, 'default', mod.metadata, mod.type, mod.updated_at, mod.spotlight);
    }
    
    this.db.exec("DROP TABLE modules");
    this.db.exec("ALTER TABLE modules_new RENAME TO modules");
    console.log("Migration complete!");
  }

  createNewSchema() {
    this.db.exec(`
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
}

// Module bundler
class ModuleBundler {
  constructor(esbuild) {
    this.esbuild = esbuild;
  }

  isFilePath(input) {
    try {
      const stat = Deno.statSync(input);
      return stat.isFile;
    } catch {
      return input.includes('/') || input.endsWith('.js') || input.endsWith('.ts');
    }
  }

  async bundle(codeOrPath) {
    if (!this.esbuild) {
      // Fallback without bundling
      const isPath = this.isFilePath(codeOrPath);
      if (isPath) {
        return await Deno.readTextFile(codeOrPath);
      }
      return typeof codeOrPath === 'function' 
        ? `export default ${codeOrPath.toString()}`
        : codeOrPath;
    }
    
    const isPath = this.isFilePath(codeOrPath);
    
    try {
      const result = await this.esbuild.build({
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
        platform: 'browser',
        target: 'esnext',
        write: false,
      });
      
      if (result.errors.length > 0) {
        const error = result.errors[0];
        throw new Error(`${error.text} at ${error.location?.file || 'input'}:${error.location?.line || 0}`);
      }
      
      await this.esbuild.stop();
      return result.outputFiles[0].text;
    } catch (error) {
      error.type = this.getErrorType(error.message);
      throw error;
    }
  }

  getErrorType(message) {
    if (message.includes('Could not resolve')) return 'import';
    if (message.includes('Syntax') || message.includes('Unexpected')) return 'syntax';
    return 'bundle';
  }
}

// Module operations
class ModuleOperations {
  constructor(dbManager, bundler) {
    this.dbManager = dbManager;
    this.bundler = bundler;
  }

  async save(name, codeOrPath) {
    try {
      const bundled = await this.bundler.bundle(codeOrPath);
      const hasDefaultFunction = this.hasDefaultExport(bundled);
      
      // Save file
      const fileName = `${name}.module.js`;
      const filePath = `${this.dbManager.modulesDir}${platform.pathSep}${fileName}`;
      await Deno.writeTextFile(filePath, bundled);
      
      // Save metadata
      const metadata = this.createMetadata(hasDefaultFunction);
      this.saveToDatabase(name, fileName, hasDefaultFunction, metadata);
      
      // Module change notification removed - no longer needed
      return true;
    } catch (error) {
      await this.handleSaveError(name, error);
      throw error;
    }
  }

  hasDefaultExport(code) {
    return code.includes('export default function') || 
           code.includes('export default async function');
  }

  createMetadata(hasDefaultFunction) {
    return JSON.stringify({
      hasDefaultFunction,
      createdAt: new Date().toISOString(),
      platform: platform.os,
      bundled: true,
      isUserModule: true
    });
  }

  saveToDatabase(name, fileName, hasDefaultFunction, metadata) {
    const namespace = `hlvm.${name}`;
    const entryPoint = hasDefaultFunction ? 'default' : 'script';
    
    this.dbManager.db.prepare(`
      INSERT OR REPLACE INTO modules 
      (key, namespace, file_path, entry_point, metadata, type, updated_at, spotlight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, namespace, `modules/${fileName}`, entryPoint, metadata, 'javascript', Date.now(), 1);
  }

  async handleSaveError(name, error) {
    console.error(`❌ Failed to save '${name}': ${error.message}`);
    // Event notification removed - simplified error handling
    console.error('Module bundle failed:', {
      name,
      error: error.message,
      type: error.type || 'unknown'
    });
  }

  async load(name) {
    try {
      const module = this.getModule(name);
      if (!module) throw new Error(`Module '${name}' not found`);
      
      const code = await this.readModuleCode(module);
      const imported = await this.importModule(name, code);
      
      return imported.default || imported;
    } catch (e) {
      throw new Error(`Load failed: ${e.message}`);
    }
  }

  getModule(name) {
    return this.dbManager.db.prepare("SELECT * FROM modules WHERE key = ?").get(name);
  }

  async readModuleCode(module) {
    const filePath = `${this.dbManager.dbDir}${platform.pathSep}${module.file_path}`;
    return await Deno.readTextFile(filePath);
  }

  async importModule(name, code) {
    const tempDir = platform.tempDir();
    const tempFile = `${tempDir}${platform.pathSep}hlvm-module-${name}-${Date.now()}.js`;
    await Deno.writeTextFile(tempFile, code);
    
    const imported = await import(`file://${tempFile}`);
    
    // Clean up after import
    setTimeout(() => Deno.remove(tempFile).catch(() => {}), 1000);
    
    return imported;
  }

  async getSource(name) {
    try {
      const module = this.getModule(name);
      if (!module) throw new Error(`Module '${name}' not found`);
      
      return await this.readModuleCode(module);
    } catch (e) {
      throw new Error(`Get source failed: ${e.message}`);
    }
  }

  list() {
    try {
      const modules = this.dbManager.db.prepare(`
        SELECT key, namespace, file_path, entry_point, type, updated_at, spotlight 
        FROM modules 
        WHERE spotlight = 1 
        ORDER BY updated_at DESC
      `).all();
      
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

  async remove(name) {
    try {
      const module = this.getModule(name);
      
      if (module) {
        const filePath = `${this.dbManager.dbDir}${platform.pathSep}${module.file_path}`;
        await Deno.remove(filePath).catch(() => {});
      }
      
      this.dbManager.db.prepare("DELETE FROM modules WHERE key = ?").run(name);
      // Module change notification removed - no longer needed
      
      return true;
    } catch (e) {
      throw new Error(`Remove failed: ${e.message}`);
    }
  }
}

// Initialize and export
const dbManager = new DatabaseManager();
await dbManager.init();

const bundler = new ModuleBundler(dbManager.esbuild);
const operations = new ModuleOperations(dbManager, bundler);

// Export public API
export const path = dbManager.path;
export const db = dbManager.db;
export const save = (name, codeOrPath) => operations.save(name, codeOrPath);
export const load = (name) => operations.load(name);
export const getSource = (name) => operations.getSource(name);
export const list = () => operations.list();
export const remove = (name) => operations.remove(name);