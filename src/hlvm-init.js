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
import { ui } from "./stdlib/ui/control.js";

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
    }
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
  
  // Computer control
  notification,
  screen,
  keyboard,
  mouse,
  
  // AI - Full Ollama API mirror
  ollama,
  
  // UI control (replaces __HLVM_COMMAND__)
  // The macOS GUI runs a WebSocket server on port 11436
  // hlvm.ui connects as a CLIENT to control the GUI
  ui,
  
  // Context - returns current clipboard content
  get context() {
    return clipboard.read();
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
  hlvm.context              - Get current clipboard content

System Control:
  hlvm.platform             - Platform info (os, arch, etc)
  hlvm.system               - System utilities
  hlvm.fs                   - File system operations
  hlvm.clipboard            - Clipboard read/write

Computer Control:
  hlvm.notification         - UI dialogs (alert, notify, confirm, prompt)
  hlvm.screen              - Screen capture
  hlvm.keyboard            - Keyboard automation (type, press)
  hlvm.mouse               - Mouse automation (move, click, position)

Ollama:
  hlvm.ollama.list()        - List available models
  hlvm.ollama.chat(prompt)  - Chat with specific model

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
  await hlvm.notification.notify("Done!", "HLVM")
  const name = await hlvm.notification.prompt("Name?")
  
  // Automation
  await hlvm.screen.capture("/tmp/screen.png")
  await hlvm.keyboard.type("Hello")
  await hlvm.mouse.click(100, 100)
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
setupCustomPropertyPersistence();

// Create proxy for custom properties
globalThis.hlvm = new Proxy(hlvmBase, {
  set(target, prop, value) {
    // List of system properties that cannot be overridden
    const systemProps = ['modules', 'db', 'platform', 'system', 'fs', 'clipboard', 'notification', 
                        'screen', 'keyboard', 'mouse', 'ollama', 'ui', 'context', 
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

// Global shorthand for core APIs - single source of truth
Object.defineProperty(globalThis, 'context', {
  get() { return hlvm.context; },
  enumerable: true,
  configurable: false
});