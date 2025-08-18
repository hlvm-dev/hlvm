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
import { app } from "./stdlib/app/control.js";

// Create hlvm namespace
const hlvmBase = {
  // Database access (for advanced users)
  db: Object.assign(db.db, {
    path: db.path,
    load: db.load,
    list: db.list,
    remove: db.remove,
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
  
  // AI
  ollama,
  ask: ollama.chat, // Legacy shorthand
  
  // App control (replaces __HLVM_COMMAND__)
  // The macOS app runs a WebSocket server on port 11436
  // hlvm.app connects as a CLIENT to control the GUI
  app,
  
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
  hlvm.save(name, code)     - Save ESM module or function
  hlvm.list()               - List saved modules
  hlvm.remove(name)         - Remove a module
  hlvm.ask(prompt)          - Chat with Ollama
  hlvm.db.load(name)        - Load module (advanced use)
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
    const savedModules = hlvm.list();
    
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
    const systemProps = ['db', 'platform', 'system', 'fs', 'clipboard', 'notification', 
                        'screen', 'keyboard', 'mouse', 'ollama', 'app', 'context', 
                        'help', 'status', 'ask'];
    
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