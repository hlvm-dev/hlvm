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
globalThis.hlvm = {
  // Core persistence
  save: db.save,
  load: db.load,
  list: db.list,
  remove: db.remove,
  db: db.db, // Expose database object for CLI
  
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
  ask: ollama.chat, // Shorthand
  
  // App control (replaces __HLVM_COMMAND__)
  app,
  
  // WebSocket Bridge (for macOS app communication)
  startBridge: async (port = 11435) => {
    // Dynamically import and start the bridge
    const { HLVMBridge } = await import("../src/hlvm-bridge.ts");
    const bridge = new HLVMBridge();
    await bridge.start(port);
    console.log("WebSocket bridge ready on port " + port);
  },
  
  // Help
  help: () => {
    console.log(`
HLVM - High-Level Virtual Machine
==================================

Core Functions:
  hlvm.save(name, code)     - Save ESM module or function
  hlvm.load(name)           - Load and import module
  hlvm.list()               - List saved modules
  hlvm.remove(name)         - Remove a module
  hlvm.ask(prompt)          - Chat with Ollama

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
    console.log(`Saved Modules: ${savedModules.length} modules in SQLite`);
    console.log(`Database: ${db.path}`);
    console.log(`Platform: ${platform.os} (${platform.arch})`);
    console.log(`Temp Dir: ${platform.tempDir()}`);
    console.log(`Home Dir: ${platform.homeDir()}`);
  }
};

// Global utilities
globalThis.pprint = (obj) => console.log(JSON.stringify(obj, null, 2));

// Add bridge starter function (manual activation)
globalThis.hlvm.startBridge = async () => {
  try {
    const { bridge } = await import("../src/hlvm-bridge.ts");
    await bridge.start(11435);
    console.log("WebSocket bridge ready on port 11435");
    return true;
  } catch (e) {
    console.error("Failed to start WebSocket bridge:", e.message);
    return false;
  }
};

console.log("HLVM ready. Type 'hlvm.help()' for help.");