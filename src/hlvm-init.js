// HLVM Initialization - Clean Mediator
// Imports all stdlib modules and exposes them through the hlvm namespace

// Enable async spinner for all promises in REPL (disabled for now)
// import asyncSpinner from "./stdlib/core/async-spinner.js";
// asyncSpinner.enableAsyncSpinner();

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

// Import stdlib AI module
import * as stdlibAI from "./stdlib/ai.js";

// Import core event module
import * as event from "./stdlib/core/event.js";

// Import environment settings module
import * as env from "./stdlib/core/env.js";

// Create hlvm namespace inside IIFE to hide from global scope
globalThis.hlvm = (() => {
  const hlvmBase = {
    // LAYER 1: Core primitives - all building blocks
    core: {
      // System - OS/environment stuff (merge platform + system)
      system: {
        // Info & platform
        os: platform.os,
        arch: platform.arch,
        version: platform.version,
        hostname: system.hostname,
        pid: system.pid,
        isDarwin: platform.isDarwin,
        isWindows: platform.isWindows,
        isLinux: platform.isLinux,
        
        // Working directory & paths
        homeDir: platform.homeDir,
        tempDir: platform.tempDir,
        cwd: system.cwd,
        chdir: system.chdir,
        pathSep: platform.pathSep,
        exeExt: platform.exeExt,
        
        // Environment & execution
        env: system.env,
        exit: system.exit,
        exec: system.exec,
        shell: platform.shell,
        powershell: platform.powershell,
        
        // Utilities
        escapeShell: platform.escapeShell,
        escapeKeyboard: platform.escapeKeyboard,
        decode: platform.decode,
        linuxTool: platform.linuxTool,
        
        // Constants
        PS: platform.PS,
        ERRORS: platform.ERRORS
      },
      
      // Storage - persistence
      storage: {
        db: Object.assign(db.db, {
          path: db.path,
          load: db.load,
          getSource: db.getSource
        }),
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
          
          // Alias management - permanent global aliases
          alias: async (name, path) => {
            // Remove alias if path is null
            if (path === null || path === undefined) {
              return removeAlias(name);
            }
            return createAlias(name, path);
          },
          aliases: () => listAliases(),
          removeAlias: (name) => removeAlias(name),
          updateAlias: (name, path) => createAlias(name, path)
        }
      },
      
      // IO - input/output
      io: {
        fs: {
          read: fs.read,
          write: fs.write,
          readBytes: fs.readBytes,
          writeBytes: fs.writeBytes,
          exists: fs.exists,
          stat: fs.stat,
          remove: fs.remove,
          copy: fs.copy,
          move: fs.move,
          mkdir: fs.mkdir,
          readdir: fs.readdir,
          // Path utilities stay here (fs context)
          join: fs.join,
          dirname: fs.dirname,
          basename: fs.basename,
          extname: fs.extname
        },
        clipboard: {
          isAvailable: clipboard.isAvailable,
          read: clipboard.read,
          write: clipboard.write
        }
      },
      
      // Computer - automation
      computer: {
        keyboard: {
          type: keyboard.type,
          press: keyboard.press,
          onKeyPress: keyboard.onKeyPress,
          offKeyPress: keyboard.offKeyPress,
          listKeyListeners: keyboard.listKeyListeners
        },
        mouse: {
          move: mouse.move,
          click: mouse.click,
          doubleClick: mouse.doubleClick,
          drag: mouse.drag,
          position: mouse.position
        },
        screen: {
          capture: screen.capture,
          getScreenSize: screen.getScreenSize
        },
        context: computerContext
      },
      
      // UI - user interface
      ui: {
        notification: {
          alert: notification.alert,
          confirm: notification.confirm,
          notify: notification.notify,
          prompt: notification.prompt
        }
      },
      
      // AI - AI services
      ai: {
        ollama: ollama
      },
      
      // Event - observation system
      event: {
        observe: event.observe,
        unobserve: event.unobserve,
        listObservers: event.listObservers
      }
    },
    
    // LAYER 2: App control (top-level, not core!)
    app: ui,
    
    // LAYER 3: High-level stdlib
    stdlib: {
      ai: {
        revise: stdlibAI.revise,
        draw: stdlibAI.draw,
        refactor: stdlibAI.refactor
      }
    },
    
    // Environment settings (persistent configuration)
    env: env,
    
    // Context - returns context object (keep at root for convenience)
    get context() {
      return hlvmBase.core.computer.context;
    },
  
  // Help
  help: () => {
    console.log(`
HLVM - High-Level Virtual Machine
==================================

STRUCTURE:
  hlvm.core.*               - Core primitives (building blocks)
  hlvm.app.*                - App control (GUI functions)
  hlvm.stdlib.*             - High-level functions (coming soon)

CORE MODULES:
  hlvm.core.system          - OS/environment (exec, env, paths)
  hlvm.core.storage         - Persistence (db, modules)
  hlvm.core.io              - Input/Output (fs, clipboard)
  hlvm.core.computer        - Automation (keyboard, mouse, screen)
  hlvm.core.ui              - User interface (notifications)
  hlvm.core.ai              - AI services (ollama)
  hlvm.core.event           - Observation system (observe, unobserve)

STORAGE & MODULES:
  hlvm.core.storage.modules.save()    - Save module
  hlvm.core.storage.modules.remove()  - Remove module(s)
  hlvm.core.storage.modules.list()    - List modules
  hlvm.core.storage.modules.load()    - Load module

FILE OPERATIONS:
  hlvm.core.io.fs.read(path)          - Read text file
  hlvm.core.io.fs.write(path, text)   - Write text file
  hlvm.core.io.fs.exists(path)        - Check if path exists
  hlvm.core.io.fs.remove(path)        - Delete file/directory
  hlvm.core.io.fs.mkdir(path)         - Create directory
  hlvm.core.io.fs.copy(src, dest)     - Copy file/directory
  hlvm.core.io.fs.move(src, dest)     - Move file/directory

COMPUTER AUTOMATION:
  hlvm.core.computer.keyboard.type()  - Type text
  hlvm.core.computer.keyboard.press() - Press keys (array format: ["cmd", "s"])
  hlvm.core.computer.mouse.click()    - Click mouse
  hlvm.core.computer.mouse.move()     - Move mouse
  hlvm.core.computer.screen.capture() - Capture screen

AI SERVICES:
  hlvm.core.ai.ollama.list()          - List models
  hlvm.core.ai.ollama.chat()          - Chat with AI

APP CONTROL:
  hlvm.app.spotlight                  - Spotlight UI
  hlvm.app.chat                       - Chat UI
  hlvm.app.playground                 - Code playground

Examples:
  // Files
  await hlvm.core.io.fs.write('/tmp/test.txt', 'Hello')
  const text = await hlvm.core.io.fs.read('/tmp/test.txt')
  
  // Notifications
  await hlvm.core.ui.notification.notify("Done!", "HLVM")
  const name = await hlvm.core.ui.notification.prompt("Name?")
  
  // Automation
  await hlvm.core.computer.screen.capture("/tmp/screen.png")
  await hlvm.core.computer.keyboard.type("Hello")
  await hlvm.core.computer.mouse.click(100, 100)
  
  // AI
  const response = await hlvm.core.ai.ollama.chat({ 
    model: 'llama3', 
    prompt: 'Hello' 
  }
    `);
  },
  
  // Status
  status: () => {
    const modules = Object.keys(hlvm).filter(k => typeof hlvm[k] === 'object');
    const savedModules = hlvmBase.core.storage.modules.list();
    
    console.log('\nHLVM Status:');
    console.log('─'.repeat(40));
    console.log('Top-level:', modules.join(', '));
    console.log(`Saved Modules: ${savedModules.length} modules`);
    console.log(`Database: ${hlvmBase.core.storage.db.path}`);
    console.log(`Platform: ${hlvmBase.core.system.os} (${hlvmBase.core.system.arch}`);
    console.log(`Temp Dir: ${hlvmBase.core.system.tempDir()}`);
    console.log(`Home Dir: ${hlvmBase.core.system.homeDir()}`);
  }
  };

  // Setup alias persistence
  function setupAliases() {
    // Create aliases table if not exists
    db.db.exec(`
    CREATE TABLE IF NOT EXISTS aliases (
      name TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  // Load existing aliases and create global functions
  const aliases = db.db.prepare('SELECT * FROM aliases').all();
  aliases.forEach(alias => {
    try {
      // Create the global alias function
      globalThis[alias.name] = async (...args) => {
        // Navigate the path to find the function
        const parts = alias.path.split('.');
        let current = globalThis;
        for (const part of parts) {
          current = current[part];
          if (!current) {
            throw new Error(`Path ${alias.path} not found`);
          }
        }
        
        // Call the function if it's callable
        if (typeof current === 'function') {
          return await current(...args);
        }
        return current;
      };
    } catch (e) {
      console.error(`Failed to restore alias '${alias.name}':`, e.message);
    }
  });
}

  // Create an alias
  function createAlias(name, path) {
  // Validate name doesn't conflict with system
  const reserved = ['hlvm', 'Deno', 'console', 'global', 'globalThis', 'window', 
                    'document', 'alert', 'confirm', 'prompt', 'eval', 'Function',
                    'Object', 'Array', 'String', 'Number', 'Boolean', 'Symbol',
                    'Math', 'Date', 'RegExp', 'Error', 'JSON', 'Promise'];
  
  if (reserved.includes(name)) {
    throw new Error(`Cannot use reserved name '${name}' for alias`);
  }
  
  // Save to database
  const now = Date.now();
  db.db.prepare(`
    INSERT OR REPLACE INTO aliases (name, path, created_at, updated_at)
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
  
  console.log(`✅ Created alias: ${name}() → ${path}`);
  return true;
}

  // Remove an alias
  function removeAlias(name) {
  // Remove from database
  db.db.prepare('DELETE FROM aliases WHERE name = ?').run(name);
  
  // Remove from global scope
  delete globalThis[name];
  
  console.log(`✅ Removed alias: ${name}`);
  return true;
}

  // List all aliases
  function listAliases() {
  const aliases = db.db.prepare('SELECT * FROM aliases ORDER BY name').all();
  return aliases.map(s => ({
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
        cleanHlvm[prop.key] = eval(`(${prop.value})`);
      } else {
        cleanHlvm[prop.key] = JSON.parse(prop.value);
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

  // Create a clean object without Object.prototype for better tab completion
  // This prevents showing methods like valueOf, toString, etc.
  const cleanHlvm = Object.create(null);
  
  // Copy all properties from hlvmBase to cleanHlvm
  for (const key in hlvmBase) {
    cleanHlvm[key] = hlvmBase[key];
  }
  
  // Setup persistence (must be after cleanHlvm is created)
  setupAliases();
  setupCustomPropertyPersistence();

  // Add custom property setter directly to the clean object
  // This preserves TAB completion while allowing custom properties
  Object.defineProperty(cleanHlvm, '__set', {
    value: function(prop, value) {
      const systemProps = ['core', 'app', 'stdlib', 'env', 'context', 'help', 'status', '__set', '__delete'];
      
      if (systemProps.includes(prop)) {
        console.error(`Cannot override system property: hlvm.${prop}`);
        return false;
      }
      
      // Save to database for persistence
      saveCustomProperty(prop, value);
      
      // Set the value
      if (value === null || value === undefined) {
        delete this[prop];
      } else {
        this[prop] = value;
      }
      return true;
    },
    enumerable: false,
    configurable: false
  });
  
  Object.defineProperty(cleanHlvm, '__delete', {
    value: function(prop) {
      // Remove from database
      db.db.prepare('DELETE FROM custom_properties WHERE key = ?').run(prop);
      delete this[prop];
      return true;
    },
    enumerable: false,
    configurable: false
  });

  // Return the clean object for TAB completion to work
  return cleanHlvm;
})();  // End IIFE - hlvmBase is now hidden from global scope

// Global utilities
globalThis.pprint = (obj) => console.log(JSON.stringify(obj, null, 2));

// Setup custom inspect for functions with documentation
(function setupFunctionDocs() {
  // Create a special inspect symbol for documented functions
  const inspectSymbol = Symbol.for('Deno.customInspect');
  
  // Helper to attach docs to a function
  globalThis.__attachDocs = function(func, doc) {
    func.__doc__ = doc;
    func[inspectSymbol] = function() {
      return this.__doc__;
    };
    return func;
  };
  
  // Process all functions in hlvm namespace to add inspect if they have __doc__
  function processObject(obj, path = '') {
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'function' && value.__doc__) {
        value[inspectSymbol] = function() {
          return this.__doc__;
        };
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        processObject(value, path ? `${path}.${key}` : key);
      }
    }
  }
  
  // Process the hlvm namespace after a small delay to ensure all modules are loaded
  setTimeout(() => processObject(globalThis.hlvm), 100);
})();

// Global shorthand for context - removed to prevent startup issues