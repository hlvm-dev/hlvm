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
import appControl from "./stdlib/app/control.js";
import { context as computerContext } from "./stdlib/computer/context.js";

// Import stdlib AI module (default export)
import stdlibAI from "./stdlib/ai.js";

// Import core event module
import * as event from "./stdlib/core/event.js";

// Import environment settings module
import * as env from "./stdlib/core/env.js";

// Import documentation registry
import docRegistry from "./stdlib/documentation.js";

// Create hlvm namespace inside IIFE to hide from global scope
// Use void to prevent output when executed in REPL
void (globalThis.hlvm = (() => {
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
        // ESM modules collection (renamed from modules for clarity)
        esm: {
          set: db.save,  // Renamed from save for consistency
          get: db.getSource,
          list: db.list,
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
          has: async (name) => {
            const modules = db.list();
            return modules.some(m => m.key === name);
          },
          load: db.load  // Keep load as it executes the module
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
        list: event.list
      },
      
      // Global aliases - create shortcuts to any hlvm path
      alias: {
        set: async (name, path) => createAlias(name, path),
        get: (name) => getAlias(name),
        list: () => listAliases(),
        remove: async (name) => removeAlias(name),
        has: (name) => hasAlias(name),
        // Show all aliases in a nice format
        show: function(filter) {
          const aliases = listAliases();
          
          // If filter provided, filter by name or path
          let filtered = aliases;
          if (filter) {
            const lowerFilter = filter.toLowerCase();
            filtered = aliases.filter(a => 
              a.name.toLowerCase().includes(lowerFilter) || 
              a.path.toLowerCase().includes(lowerFilter)
            );
          }
          
          if (filtered.length === 0) {
            if (filter) {
              console.log(`\x1b[33mNo global functions matching '${filter}'\x1b[0m`);
            } else {
              console.log(`\x1b[33mNo global aliases registered yet.\x1b[0m`);
              console.log(`\x1b[90mCreate one with: hlvm.core.alias.set('name', 'path.to.function')\x1b[0m`);
              console.log(`\x1b[90mExample: hlvm.core.alias.set('ask', 'hlvm.stdlib.ai.ask')\x1b[0m`);
            }
            return [];
          }
          
          // Display in a nice format
          console.log(`\n\x1b[36m═══ Global Aliases${filter ? ` (filtered: ${filter})` : ''} ═══\x1b[0m\n`);
          
          // Group by category if possible
          const categorized = {};
          filtered.forEach(alias => {
            // Try to categorize by path prefix
            let category = 'Custom';
            if (alias.path.includes('.ai.')) category = 'AI';
            else if (alias.path.includes('.fs.')) category = 'File System';
            else if (alias.path.includes('.clipboard.')) category = 'Clipboard';
            else if (alias.path.includes('.system.')) category = 'System';
            else if (alias.path.includes('.computer.')) category = 'Automation';
            else if (alias.path.includes('.notification.')) category = 'UI';
            
            if (!categorized[category]) categorized[category] = [];
            categorized[category].push(alias);
          });
          
          // Display categorized
          Object.keys(categorized).sort().forEach(category => {
            console.log(`\x1b[33m${category}:\x1b[0m`);
            categorized[category].sort((a, b) => a.name.localeCompare(b.name)).forEach(alias => {
              const padding = ' '.repeat(Math.max(1, 20 - alias.name.length));
              console.log(`  \x1b[32m${alias.name}()\x1b[0m${padding}→ \x1b[90m${alias.path}\x1b[0m`);
            });
            console.log();
          });
          
          console.log(`\x1b[90mTotal: ${filtered.length} function${filtered.length !== 1 ? 's' : ''}\x1b[0m`);
          if (filtered.length > 0) {
            console.log(`\x1b[90mUse help('${filtered[0].name}') or help(${filtered[0].name}) for documentation\x1b[0m\n`);
          }
          
          // Show documentation for each function
          console.log(`\x1b[36m═══ Documentation ═══\x1b[0m\n`);
          
          filtered.forEach(alias => {
            // Check if documentation exists for this path
            if (docRegistry.has(alias.path)) {
              console.log(docRegistry.get(alias.path));
              console.log(); // Add spacing between docs
            } else {
              // Show basic info if no documentation
              console.log(`\x1b[36m${alias.name}()\x1b[0m`);
              console.log(`Path: ${alias.path}`);
              console.log(`\x1b[90mNo detailed documentation available\x1b[0m\n`);
            }
          });
          
          return filtered;
        }
      }
    },
    
    // LAYER 2: App control (top-level, not core!)
    app: {
      // HLVM's own UI controls (WebSocket bridge, etc.)
      hlvm: ui,
      
      // External app control (cross-platform)
      get: appControl.get,
      list: appControl.list,
      frontmost: appControl.frontmost,
      aliases: appControl.aliases,
      isAvailable: appControl.isAvailable
    },
    
    // LAYER 3: High-level stdlib
    stdlib: {
      ai: {
        revise: stdlibAI.revise,
        draw: stdlibAI.draw,
        refactor: stdlibAI.refactor,
        chat: stdlibAI.chat,
        ask: stdlibAI.ask,
        judge: stdlibAI.judge
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
    // Get current aliases for display
    const aliases = listAliases();
    const hasAliases = aliases.length > 0;
    
    console.log(`
\x1b[36m═══════════════════════════════════════════════════════════════\x1b[0m
\x1b[36m                    HLVM QUICK START GUIDE\x1b[0m
\x1b[36m═══════════════════════════════════════════════════════════════\x1b[0m

\x1b[33m🚀 DISCOVERY COMMANDS:\x1b[0m
  \x1b[32malias()\x1b[0m                  - List all global aliases you can use
  \x1b[32mhelp('name')\x1b[0m             - Get help for specific function (e.g., help('ask'))
  \x1b[32mhelp(functionName)\x1b[0m       - Get help for function object (e.g., help(ask))
  
${hasAliases ? `\x1b[33m📦 YOUR GLOBAL ALIASES:\x1b[0m
${aliases.map(a => `  \x1b[32m${a.name}()\x1b[0m${' '.repeat(Math.max(1, 24 - a.name.length))}→ ${a.path}`).join('\n')}
` : `\x1b[33m📦 NO GLOBAL ALIASES YET:\x1b[0m
  Create your first one:
  \x1b[90mhlvm.core.alias.set('ask', 'hlvm.stdlib.ai.ask')\x1b[0m
  \x1b[90mhlvm.core.alias.set('read', 'hlvm.core.io.fs.read')\x1b[0m
`}
\x1b[33m🎯 COMMON TASKS:\x1b[0m
  \x1b[90m// AI Chat\x1b[0m
  await hlvm.stdlib.ai.ask("What is quantum computing?")
  
  \x1b[90m// Text Revision\x1b[0m
  await hlvm.stdlib.ai.revise("fix this text plz")
  
  \x1b[90m// File Operations\x1b[0m
  await hlvm.core.io.fs.write('/tmp/test.txt', 'Hello')
  await hlvm.core.io.fs.read('/tmp/test.txt')
  
  \x1b[90m// Clipboard\x1b[0m
  await hlvm.core.io.clipboard.write("text")
  await hlvm.core.io.clipboard.read()

\x1b[33m📚 MAIN NAMESPACES:\x1b[0m
  \x1b[36mhlvm.core\x1b[0m               - Core system functions
  \x1b[36mhlvm.stdlib\x1b[0m             - High-level utilities
  \x1b[36mhlvm.app\x1b[0m                - Application control
  \x1b[36mhlvm.env\x1b[0m                - Environment settings

\x1b[33m💡 TIPS:\x1b[0m
  • Type \x1b[32malias()\x1b[0m to see all your global aliases
  • Use \x1b[32mhlvm.<TAB>\x1b[0m to explore the API
  • Create shortcuts: \x1b[90mhlvm.core.alias.set('clip', 'hlvm.core.io.clipboard.read')\x1b[0m
  • Get detailed docs: \x1b[90mhelp('hlvm.core.io.fs.read')\x1b[0m

\x1b[36m═══════════════════════════════════════════════════════════════\x1b[0m
    `);
  },
  
  // Status
  status: () => {
    const modules = Object.keys(hlvm).filter(k => typeof hlvm[k] === 'object');
    const savedModules = hlvmBase.core.storage.esm.list();
    
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
  
  // Add user storage namespace for user-defined properties (before setting null prototypes)
  hlvmBase.core.storage.user = {};  // Will be populated after setupCustomPropertyPersistence

  // NOTE: We're NOT setting null prototypes as it breaks Deno's tab completion.
  // The trade-off is we'll see Object.prototype methods (toString, valueOf, etc.)
  // but tab completion will work properly at all nested levels.

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
  
  // Always ensure alias() is available as a global function
  if (!aliases.some(a => a.name === 'alias')) {
    // Create alias function directly without going through createAlias to avoid circular dependency
    globalThis.alias = (...args) => hlvmBase.core.alias.show(...args);
  }
  
  // Show available global aliases after they are loaded
  // Filter out 'alias' from the display since it's always available
  const userAliases = aliases.filter(a => a.name !== 'alias');
  if (userAliases.length > 0) {
    const aliasNames = userAliases.map(a => a.name).sort().join(', ');
    console.log(`\x1b[33mGlobal aliases: ${aliasNames}\x1b[0m`);
    console.log(`\x1b[90mType alias() to list all, help('name') for docs, or hlvm.core.alias.set() to create new\x1b[0m`);
  } else {
    console.log(`\x1b[33mNo global aliases yet.\x1b[0m \x1b[90mCreate one with hlvm.core.alias.set('name', 'path')\x1b[0m`);
    console.log(`\x1b[90mType alias() to see examples\x1b[0m`);
  }
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

  // Get a specific alias
  function getAlias(name) {
  const alias = db.db.prepare('SELECT * FROM aliases WHERE name = ?').get(name);
  if (!alias) return null;
  return {
    name: alias.name,
    path: alias.path,
    createdAt: new Date(alias.created_at),
    updatedAt: new Date(alias.updated_at)
  };
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

  // Check if alias exists
  function hasAlias(name) {
  const alias = db.db.prepare('SELECT 1 FROM aliases WHERE name = ?').get(name);
  return !!alias;
}

  // Create custom properties table if not exists (moved from setupCustomPropertyPersistence)
  function setupCustomPropertiesTable() {
    db.db.exec(`
      CREATE TABLE IF NOT EXISTS custom_properties (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  // Function to recursively convert all objects to null prototype
  function cleanObject(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (typeof obj === 'function') return obj;
    if (Array.isArray(obj)) return obj;
    
    // Create new object with null prototype
    const clean = Object.create(null);
    
    // Copy all properties
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        // Recursively clean nested objects
        if (value && typeof value === 'object' && !Array.isArray(value) && typeof value !== 'function') {
          clean[key] = cleanObject(value);
        } else {
          clean[key] = value;
        }
      }
    }
    
    return clean;
  }
  
  // Clean the entire hlvmBase object tree to remove Object.prototype pollution
  const cleanHlvm = cleanObject(hlvmBase);
  
  // Setup persistence (must be after cleanHlvm is created)
  setupAliases();
  setupCustomPropertiesTable();

  // Wrap in Proxy for auto-persist custom properties - uses storage.user infrastructure
  const hlvmProxy = new Proxy(cleanHlvm, {
    set(target, prop, value) {
      // Delegate ALL to storage.user.set - it handles system prop filtering
      hlvmBase.core.storage.user.set(prop, value);
      return true;
    },
    
    deleteProperty(target, prop) {
      // Delegate ALL to storage.user.remove - it handles system prop filtering  
      hlvmBase.core.storage.user.remove(prop);
      return true;
    },
    
    // CRITICAL: These traps are required for tab completion to work in Deno REPL
    // Use Reflect to properly forward all operations
    has(target, prop) {
      return Reflect.has(target, prop);
    },
    
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    
    get(target, prop) {
      return Reflect.get(target, prop);
    }
  });

  // Define reusable helpers for user storage (DRY)
  const SYSTEM_PROPS = ['core', 'app', 'stdlib', 'env', 'context', 'help', 'status'];
  
  const isSystemProp = (key) => SYSTEM_PROPS.includes(key);
  const isUserProp = (key) => !isSystemProp(key);
  
  const serializeValue = (value) => {
    if (value === null) return { serialized: 'null', type: 'null' };
    if (value === undefined) return { serialized: 'undefined', type: 'undefined' };
    const type = typeof value;
    const serialized = type === 'function' ? value.toString() : JSON.stringify(value);
    return { serialized, type };
  };
  
  const persistToDb = (key, value) => {
    const { serialized, type } = serializeValue(value);
    db.db.prepare(`
      INSERT OR REPLACE INTO custom_properties (key, value, type, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(key, serialized, type, Date.now());
  };
  
  const removeFromDb = (key) => {
    db.db.prepare('DELETE FROM custom_properties WHERE key = ?').run(key);
  };
  
  // Populate the user storage methods - single source of truth for all user data persistence
  hlvmBase.core.storage.user.set = function(key, value) {
    // System properties - just set directly, no persistence
    if (isSystemProp(key)) {
      cleanHlvm[key] = value;
      return value;
    }
    
    // User properties - persist to database (including null/undefined)
    persistToDb(key, value);
    cleanHlvm[key] = value;
    return value;
  };
  
  hlvmBase.core.storage.user.get = function(key) {
    return cleanHlvm[key];
  };
  
  hlvmBase.core.storage.user.remove = function(key) {
    // System properties - just delete, no database
    if (isSystemProp(key)) {
      delete cleanHlvm[key];
      return true;
    }
    
    // User properties - remove from database
    if (key in cleanHlvm) {
      removeFromDb(key);
      delete cleanHlvm[key];
    }
    return true;
  };
  
  hlvmBase.core.storage.user.list = function() {
    const props = db.db.prepare('SELECT * FROM custom_properties ORDER BY key').all();
    return props.map(p => ({
      key: p.key,
      type: p.type,
      updatedAt: new Date(p.updated_at)
    }));
  };
  
  hlvmBase.core.storage.user.has = function(key) {
    return (key in cleanHlvm) && isUserProp(key);
  };
  
  // Load existing custom properties from database
  hlvmBase.core.storage.user.load = function() {
    const props = db.db.prepare('SELECT * FROM custom_properties').all();
    props.forEach(prop => {
      try {
        if (prop.type === 'null') {
          cleanHlvm[prop.key] = null;
        } else if (prop.type === 'undefined') {
          cleanHlvm[prop.key] = undefined;
        } else if (prop.type === 'function') {
          // Recreate function from string
          cleanHlvm[prop.key] = eval(`(${prop.value})`);
        } else {
          cleanHlvm[prop.key] = JSON.parse(prop.value);
        }
      } catch (e) {
        console.error(`Failed to restore custom property '${prop.key}':`, e.message);
      }
    });
  };
  
  // Load user properties on startup
  hlvmBase.core.storage.user.load();

  // TEMPORARY: Return cleanHlvm directly without Proxy to test tab completion
  // TODO: Find a better way to handle persistence that doesn't break tab completion
  return cleanHlvm;
  // return hlvmProxy;
})());  // End IIFE - hlvmBase is now hidden from global scope - extra parens for void operator

// Global utilities
globalThis.pprint = (obj) => console.log(JSON.stringify(obj, null, 2));

// Global help function - shows general help or specific function documentation
globalThis.help = function(func) {
  // If no argument, show general HLVM help
  if (arguments.length === 0) {
    // Call hlvm.help() for general help
    if (globalThis.hlvm && globalThis.hlvm.help) {
      globalThis.hlvm.help();
    } else {
      console.log('HLVM help not available');
    }
    return;
  }
  
  // Otherwise show documentation for specific function
  let path = '';
  
  // Handle string path like 'hlvm.core.io.fs.read'
  if (typeof func === 'string') {
    path = func;
    // Look up documentation directly
    if (docRegistry.has(path)) {
      console.log(docRegistry.get(path));
      return;
    }
    // Try to resolve the path to get the function
    try {
      const parts = func.split('.');
      let current = globalThis;
      for (const part of parts) {
        current = current[part];
        if (!current) {
          console.log(`Path not found: ${func}`);
          return;
        }
      }
      func = current;
    } catch (e) {
      console.log(`Error accessing: ${func}`);
      return;
    }
  }
  
  // Handle direct function - find its path
  if (typeof func === 'function') {
    // First check if this is a global alias
    // Look for the function in global scope
    let aliasName = null;
    for (const key in globalThis) {
      if (globalThis[key] === func && key !== 'doc' && key !== 'pprint') {
        aliasName = key;
        break;
      }
    }
    
    // If we found an alias, check the aliases table for its path
    if (aliasName && globalThis.hlvm?.core?.storage?.db) {
      try {
        const aliasInfo = globalThis.hlvm.core.storage.db
          .prepare('SELECT path FROM aliases WHERE name = ?')
          .get(aliasName);
        if (aliasInfo && aliasInfo.path) {
          path = aliasInfo.path;
          // Look up documentation with this path
          if (docRegistry.has(path)) {
            console.log(docRegistry.get(path));
            return;
          }
        }
      } catch (e) {
        // Database query failed, continue with normal lookup
      }
    }
    
    // Try to find the path for this function in hlvm namespace
    function findPath(obj, target, currentPath = '') {
      for (const key in obj) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (obj[key] === target) {
          return newPath;
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const found = findPath(obj[key], target, newPath);
          if (found) return found;
        }
      }
      return null;
    }
    path = findPath(globalThis.hlvm, func, 'hlvm');
    
    // Look up documentation
    if (path && docRegistry.has(path)) {
      console.log(docRegistry.get(path));
    } else {
      // No documentation found
      const funcName = func.name || aliasName || 'anonymous';
      console.log(`\x1b[36m${funcName}(...)\x1b[0m`);
      console.log('\nNo documentation available');
    }
  } else if (typeof func === 'object' && func !== null) {
    // Show object properties
    console.log(`\x1b[36mObject\x1b[0m`);
    console.log('\nProperties:');
    for (const key in func) {
      const type = typeof func[key];
      console.log(`  ${key}: \x1b[90m${type}\x1b[0m`);
    }
  } else {
    console.log('Usage: help(function) or help("path.to.function")');
  }
};

// Global shorthand for context - removed to prevent startup issues