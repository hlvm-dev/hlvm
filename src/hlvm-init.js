// HLVM Initialization - Clean Mediator
// Imports all stdlib modules and exposes them through the hlvm namespace

// Import all stdlib modules from organized structure
import * as platform from "./stdlib/core/platform.js";
import * as system from "./stdlib/core/system.js";
import * as db from "./stdlib/core/database.js";
import * as fs from "./stdlib/fs/filesystem.js";
import * as clipboard from "./stdlib/io/clipboard.js";
import * as notification from "./stdlib/computer/notification.js";
import * as screen from "./stdlib/computer/screen.js";
import * as keyboard from "./stdlib/computer/keyboard.js";
import * as mouse from "./stdlib/computer/mouse.js";
import * as ollama from "./stdlib/ai/ollama.js";
import ui from "./stdlib/ui/control.js";
import { context as computerContext } from "./stdlib/computer/context.js";

// Create hlvm namespace
const hlvmBase = {
  // Module management - generic for all UIs
  modules: {
    save: db.save,
    remove: async (name) => {
      // If no name given, remove ALL modules (nuke)
      if (!name) {
        const allModules = db.list();
        for (const mod of allModules) {
          await db.remove(mod.key);
        }
        console.log(`Removed all ${allModules.length} modules`);
        return true;
      }
      // Otherwise remove specific module
      return db.remove(name);
    },
    list: db.list,
    load: db.load,
    get: db.getSource,
    has: async (name) => {
      const modules = db.list();
      return modules.some(m => m.key === name);
    },
    
    // Shortcut management - permanent global shortcuts
    shortcut: async (name, path) => {
      // Remove shortcut if path is null
      if (path === null || path === undefined) {
        return removeShortcut(name);
      }
      return createShortcut(name, path);
    },
    shortcuts: () => listShortcuts(),
    removeShortcut: (name) => removeShortcut(name),
    updateShortcut: (name, path) => createShortcut(name, path)
  },
  
  // Database access (for advanced users)
  db: Object.assign(db.db, {
    path: db.path,
    load: db.load,
    getSource: db.getSource
  }),
  
  // System modules
  platform,
  system,
  fs,
  clipboard,
  
  // Computer control - grouped for context access
  computer: {
    notification,
    screen,
    keyboard,
    mouse,
    clipboard,
    context: computerContext
  },
  
  // UI namespace
  ui: {
    notification
  },
  
  // AI namespace
  ai: {
    ollama
  },
  
  // App control (GUI when available)
  app: ui,
  
  // Context - returns context object
  get context() {
    return computerContext;
  },
  
  // Help
  help: () => {
    console.log(`
HLVM - High-Level Virtual Machine
==================================

Core Functions:
  hlvm.modules.save()       - Save module
  hlvm.modules.remove()     - Remove module(s)
  hlvm.modules.list()       - List modules
  hlvm.modules.load()       - Load module
  hlvm.modules.shortcut()   - Create global shortcut
  hlvm.modules.shortcuts()  - List all shortcuts
  hlvm.context              - System context (selection, screen)

System Control:
  hlvm.platform             - Platform info (os, arch, etc)
  hlvm.system               - System utilities
  hlvm.fs                   - File system operations

Computer Control:
  hlvm.computer.notification - UI dialogs (alert, notify, confirm, prompt)
  hlvm.computer.screen      - Screen capture
  hlvm.computer.keyboard    - Keyboard automation (type, press)
  hlvm.computer.mouse       - Mouse automation (move, click, position)
  hlvm.computer.clipboard   - Clipboard operations

AI Services:
  hlvm.ai.ollama.list()     - List available models
  hlvm.ai.ollama.chat()     - Chat with AI model

File Operations:
  hlvm.fs.read(path)        - Read text file
  hlvm.fs.write(path, text) - Write text file
  hlvm.fs.readBytes(path)   - Read binary file
  hlvm.fs.writeBytes(path)  - Write binary file
  hlvm.fs.exists(path)      - Check if path exists
  hlvm.fs.remove(path)      - Delete file/directory
  hlvm.fs.mkdir(path)       - Create directory
  hlvm.fs.copy(src, dest)   - Copy file/directory
  hlvm.fs.move(src, dest)   - Move file/directory

Examples:
  // Files
  await hlvm.fs.write('/tmp/test.txt', 'Hello')
  const text = await hlvm.fs.read('/tmp/test.txt')
  
  // Notifications
  await hlvm.computer.notification.notify("Done!", "HLVM")
  const name = await hlvm.computer.notification.prompt("Name?")
  
  // Automation
  await hlvm.computer.screen.capture("/tmp/screen.png")
  await hlvm.computer.keyboard.type("Hello")
  await hlvm.computer.mouse.click(100, 100)
    `);
  },
  
  // Status
  status: () => {
    const modules = Object.keys(hlvm).filter(k => typeof hlvm[k] === 'object');
    const savedModules = hlvm.modules.list();
    
    console.log('\nHLVM Status:');
    console.log('─'.repeat(40));
    console.log('System Modules:', modules.join(', '));
    console.log(`Saved Modules: ${savedModules.length} modules`);
    console.log(`Database: ${db.path}`);
    console.log(`Platform: ${platform.os} (${platform.arch})`);
    console.log(`Temp Dir: ${platform.tempDir()}`);
    console.log(`Home Dir: ${platform.homeDir()}`);
  }
};

// Setup shortcut persistence
function setupShortcuts() {
  // Create shortcuts table if not exists
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS shortcuts (
      name TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  // Load existing shortcuts and create global functions
  const shortcuts = db.db.prepare('SELECT * FROM shortcuts').all();
  shortcuts.forEach(shortcut => {
    try {
      // Create the global shortcut function
      globalThis[shortcut.name] = async (...args) => {
        // Navigate the path to find the function
        const parts = shortcut.path.split('.');
        let current = globalThis;
        for (const part of parts) {
          current = current[part];
          if (!current) {
            throw new Error(`Path ${shortcut.path} not found`);
          }
        }
        
        // Call the function if it's callable
        if (typeof current === 'function') {
          return await current(...args);
        }
        return current;
      };
    } catch (e) {
      console.error(`Failed to restore shortcut '${shortcut.name}':`, e.message);
    }
  });
}

// Create a shortcut
function createShortcut(name, path) {
  // Validate name doesn't conflict with system
  const reserved = ['hlvm', 'Deno', 'console', 'global', 'globalThis', 'window', 
                    'document', 'alert', 'confirm', 'prompt', 'eval', 'Function',
                    'Object', 'Array', 'String', 'Number', 'Boolean', 'Symbol',
                    'Math', 'Date', 'RegExp', 'Error', 'JSON', 'Promise'];
  
  if (reserved.includes(name)) {
    throw new Error(`Cannot use reserved name '${name}' for shortcut`);
  }
  
  // Save to database
  const now = Date.now();
  db.db.prepare(`
    INSERT OR REPLACE INTO shortcuts (name, path, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(name, path, now, now);
  
  // Create the global function
  globalThis[name] = async (...args) => {
    const parts = path.split('.');
    let current = globalThis;
    for (const part of parts) {
      current = current[part];
      if (!current) {
        throw new Error(`Path ${path} not found`);
      }
    }
    
    if (typeof current === 'function') {
      return await current(...args);
    }
    return current;
  };
  
  console.log(`✅ Created shortcut: ${name}() → ${path}`);
  return true;
}

// Remove a shortcut
function removeShortcut(name) {
  // Remove from database
  db.db.prepare('DELETE FROM shortcuts WHERE name = ?').run(name);
  
  // Remove from global scope
  delete globalThis[name];
  
  console.log(`✅ Removed shortcut: ${name}`);
  return true;
}

// List all shortcuts
function listShortcuts() {
  const shortcuts = db.db.prepare('SELECT * FROM shortcuts ORDER BY name').all();
  return shortcuts.map(s => ({
    name: s.name,
    path: s.path,
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at)
  }));
}

// Setup custom property persistence
function setupCustomPropertyPersistence() {
  // Create custom_properties table if not exists
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS custom_properties (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  // Load existing custom properties
  const props = db.db.prepare('SELECT * FROM custom_properties').all();
  props.forEach(prop => {
    try {
      if (prop.type === 'function') {
        // Recreate function from string
        hlvmBase[prop.key] = eval(`(${prop.value})`);
      } else {
        hlvmBase[prop.key] = JSON.parse(prop.value);
      }
    } catch (e) {
      console.error(`Failed to restore custom property '${prop.key}':`, e.message);
    }
  });
}

// Save custom property to database
function saveCustomProperty(key, value) {
  let serialized;
  let type = typeof value;
  
  if (value === null || value === undefined) {
    // Handle null/undefined - remove from database
    db.db.prepare('DELETE FROM custom_properties WHERE key = ?').run(key);
    return;
  }
  
  if (type === 'function') {
    serialized = value.toString();
  } else {
    serialized = JSON.stringify(value);
  }
  
  db.db.prepare(`
    INSERT OR REPLACE INTO custom_properties (key, value, type, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(key, serialized, type, Date.now());
}

// Setup persistence
setupShortcuts();
setupCustomPropertyPersistence();

// Create proxy for custom properties
globalThis.hlvm = new Proxy(hlvmBase, {
  set(target, prop, value) {
    // List of system properties that cannot be overridden
    const systemProps = ['modules', 'db', 'platform', 'system', 'fs', 'clipboard', 'notification', 
                        'screen', 'keyboard', 'mouse', 'ui', 'ai', 'app', 'computer', 'context', 
                        'help', 'status'];
    
    if (systemProps.includes(prop)) {
      console.error(`Cannot override system property: hlvm.${prop}`);
      return false;
    }
    
    // Save to database for persistence
    saveCustomProperty(prop, value);
    
    // Set the value
    if (value === null || value === undefined) {
      delete target[prop];
    } else {
      target[prop] = value;
    }
    return true;
  },
  
  deleteProperty(target, prop) {
    // Remove from database
    db.db.prepare('DELETE FROM custom_properties WHERE key = ?').run(prop);
    delete target[prop];
    return true;
  }
});

// Global utilities
globalThis.pprint = (obj) => console.log(JSON.stringify(obj, null, 2));



// Global shorthand for context
Object.defineProperty(globalThis, 'context', {
  get() { return hlvm.context; },
  enumerable: true,
  configurable: false
});