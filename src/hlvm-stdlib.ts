/**
 * HLVM - High-Level Virtual Machine
 * Standalone JavaScript REPL with Ollama integration
 */

// Import all modules (bundled in binary)
import * as platformMod from './modules/standalone/platform.ts';
import * as systemMod from './modules/standalone/system.ts';
import * as fsMod from './modules/standalone/fs.ts';
import * as clipboardMod from './modules/standalone/clipboard.ts';
import * as keyboardMod from './modules/macos/keyboard.ts';
import * as mouseMod from './modules/macos/mouse.ts';
import * as screenMod from './modules/macos/screen.ts';
import * as notificationMod from './modules/macos/notification.ts';
import * as appMod from './modules/macos/app.ts';
import * as ollamaMod from './modules/standalone/ollama.ts';

// Global HLVM namespace
declare global {
    var hlvm: any;
}

// Constants
const PROXY_URL = 'http://localhost:11437';

// Initialize HLVM namespace
globalThis.hlvm = {};

// Pretty print utility
export function pprint(obj: any): void {
    console.log(JSON.stringify(obj, null, 2));
}

// Module loader
function loadModule(moduleName: string): any {
    const modules: Record<string, any> = {
        'platform': platformMod,
        'system': systemMod,
        'fs': fsMod,
        'clipboard': clipboardMod,
        'keyboard': keyboardMod,
        'mouse': mouseMod,
        'screen': screenMod,
        'notification': notificationMod,
        'app': appMod,
        'ollama': ollamaMod
    };
    return modules[moduleName] || null;
}

// Save/Load functions for eval-proxy
async function save(name: string, value: any): Promise<void> {
    const code = typeof value === 'function' ? value.toString() : JSON.stringify(value);
    const response = await fetch(`${PROXY_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code })
    });
    if (!response.ok) throw new Error('Failed to save');
}

async function load(name: string): Promise<any> {
    const response = await fetch(`${PROXY_URL}/load/${name}`);
    if (!response.ok) throw new Error('Module not found');
    const code = await response.text();
    return eval(code);
}

async function list(): Promise<string[]> {
    const response = await fetch(`${PROXY_URL}/list`);
    if (!response.ok) throw new Error('Failed to list');
    return response.json();
}

// Initialize modules
async function initializeHLVM() {
    // Platform
    const platform = loadModule('platform');
    if (platform) {
        hlvm.platform = {
            ...platform.default,
            os: Deno.build.os,
            arch: Deno.build.arch,
            version: Deno.osRelease()
        };
    }
    
    // System
    const system = loadModule('system');
    if (system) {
        hlvm.system = system.default;
    }
    
    // File System
    const fs = loadModule('fs');
    if (fs) {
        hlvm.fs = fs.default;
    }
    
    // Clipboard
    const clipboard = loadModule('clipboard');
    if (clipboard) {
        hlvm.clipboard = clipboard.default;
    }
    
    // Keyboard
    const keyboard = loadModule('keyboard');
    if (keyboard) {
        hlvm.keyboard = keyboard.default;
    }
    
    // Mouse
    const mouse = loadModule('mouse');
    if (mouse) {
        hlvm.mouse = mouse.default;
    }
    
    // Screen
    const screen = loadModule('screen');
    if (screen) {
        hlvm.screen = screen.default;
    }
    
    // Notification
    const notification = loadModule('notification');
    if (notification) {
        hlvm.notification = notification.default;
    }
    
    // App launcher
    const app = loadModule('app');
    if (app) {
        hlvm.app = app.default;
    }
    
    // Ollama AI
    const ollama = loadModule('ollama');
    if (ollama) {
        hlvm.ollama = ollama.default;
        // Add shorthand
        hlvm.ask = ollama.ask;
    }
    
    // Eval proxy functions
    hlvm.save = save;
    hlvm.load = load;
    hlvm.list = list;
    
    // Status function
    hlvm.status = () => {
        const modules = Object.keys(hlvm);
        console.log('\nHLVM Modules:');
        console.log('─'.repeat(40));
        modules.forEach(m => console.log(`  ${m}`));
        console.log(`\nTotal: ${modules.length} modules`);
    };
    
    // Help
    hlvm.help = () => {
        console.log(`
HLVM - High-Level Virtual Machine

Core Functions:
  hlvm.ask(prompt)         // AI chat with Ollama
  hlvm.save(name, code)    // Save module
  hlvm.load(name)          // Load module
  hlvm.list()              // List saved modules
  
System Modules:
  hlvm.platform            // Platform info
  hlvm.system              // System info
  hlvm.fs                  // File operations
  hlvm.clipboard           // Clipboard access
  
macOS Modules:
  hlvm.keyboard            // Keyboard control
  hlvm.mouse               // Mouse control  
  hlvm.screen              // Screenshot
  hlvm.notification        // Notifications
  hlvm.app                 // Launch apps
  
Ollama:
  hlvm.ollama.list()       // List models
  hlvm.ollama.pull(model)  // Download model
  hlvm.ollama.stream(text) // Stream response

Type 'hlvm.status()' for loaded modules
        `);
    };
}

// Initialize on load
await initializeHLVM();

// Export for REPL
globalThis.pprint = pprint;