#!/usr/bin/env -S deno run --allow-all

// HLVM REPL - Direct SQLite version (no proxy server needed)

import { embeddedStdlib, embeddedInit, embeddedBridge } from "./embedded-stdlib.ts";

const tempDir = Deno.env.get("TMPDIR") || Deno.env.get("TEMP") || Deno.env.get("TMP") || "/tmp";
const pathSep = Deno.build.os === "windows" ? "\\" : "/";
const exeExt = Deno.build.os === "windows" ? ".exe" : "";
const DENO_PATH = `${tempDir}${pathSep}hlvm-deno${exeExt}`;
const OLLAMA_PATH = `${tempDir}${pathSep}hlvm-ollama${exeExt}`;

// Database path function
function dbPath() {
  const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";
  if (Deno.build.os === "darwin") {
    return `${homeDir}/Library/Application Support/HLVM/HLVM.sqlite`;
  } else if (Deno.build.os === "windows") {
    const appData = Deno.env.get("APPDATA") || `${homeDir}\\AppData\\Roaming`;
    return `${appData}\\HLVM\\HLVM.sqlite`;
  } else {
    const xdgData = Deno.env.get("XDG_DATA_HOME") || `${homeDir}/.local/share`;
    return `${xdgData}/HLVM/HLVM.sqlite`;
  }
}

async function extractBinary(name: string, targetPath: string, resourcePath: string): Promise<string> {
  try {
    // Check if already extracted and valid
    const info = await Deno.stat(targetPath).catch(() => null);
    if (info && info.isFile) {
      return targetPath;
    }
    
    // Try to read embedded resource
    try {
      const binaryBytes = await Deno.readFile(new URL(resourcePath, import.meta.url));
      const tempPath = `${targetPath}.tmp.${Date.now()}`;
      await Deno.writeFile(tempPath, binaryBytes);
      await Deno.chmod(tempPath, 0o755);
      await Deno.rename(tempPath, targetPath);
      return targetPath;
    } catch {
      // Fallback to local resources for development
      return resourcePath.replace('../', './');
    }
  } catch (e) {
    // Development mode - use local resources
    return resourcePath.replace('../', './');
  }
}

// Helper function to set up HLVM environment
async function setupHLVMEnvironment(tempDir: string, pathSep: string) {
  const initScriptPath = `${tempDir}${pathSep}hlvm-init.js`;
  const stdlibPath = `${tempDir}${pathSep}stdlib`;
  
  // Create stdlib directory structure
  await Deno.mkdir(stdlibPath, { recursive: true });
  const subdirs = ['core', 'fs', 'io', 'computer', 'ai', 'ui'];
  for (const dir of subdirs) {
    await Deno.mkdir(`${stdlibPath}${pathSep}${dir}`, { recursive: true });
  }
  
  // Write all embedded stdlib modules
  for (const [modulePath, moduleCode] of Object.entries(embeddedStdlib)) {
    await Deno.writeTextFile(`${stdlibPath}${pathSep}${modulePath}`, moduleCode);
  }
  
  // Write embedded bridge
  await Deno.writeTextFile(`${tempDir}${pathSep}hlvm-bridge.ts`, embeddedBridge);
  
  // Fix import paths in init code
  let initCode = embeddedInit;
  initCode = initCode.replace(/from "\.\/stdlib\//g, `from "${stdlibPath}/`);
  initCode = initCode.replace(/"..\/(src\/)?hlvm-bridge\.ts"/g, `"${tempDir}${pathSep}hlvm-bridge.ts"`);
  await Deno.writeTextFile(initScriptPath, initCode);
  
  return initScriptPath;
}

// Handle command line arguments first
if (Deno.args.length > 0) {
  // Extract binaries only when needed
  const ollamaPath = await extractBinary('ollama', OLLAMA_PATH, '../resources/ollama');
  
  const [cmd, subcmd] = Deno.args;
  
  // Deno CLI passthrough - expose ALL Deno commands
  if (cmd === "deno") {
    const denoPath = await extractBinary('deno', DENO_PATH, '../resources/deno');
    const denoArgs = Deno.args.slice(1); // Remove "deno" prefix
    
    const denoProcess = new Deno.Command(denoPath, {
      args: denoArgs,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit", // Allow interactive commands
      env: Deno.env.toObject(), // Pass through all env vars
    }).spawn();
    
    const status = await denoProcess.status;
    Deno.exit(status.code);
  }
  
  // Ollama CLI passthrough - expose ALL Ollama commands
  if (cmd === "ollama") {
    const ollamaPath = await extractBinary('ollama', OLLAMA_PATH, '../resources/ollama');
    // Pass all arguments directly to embedded Ollama
    const ollamaArgs = Deno.args.slice(1); // Remove "ollama" prefix
    
    const ollamaProcess = new Deno.Command(ollamaPath, {
      args: ollamaArgs,
      env: {
        "OLLAMA_HOST": Deno.env.get("OLLAMA_HOST") || "127.0.0.1:11434",
        "OLLAMA_MODELS": Deno.env.get("OLLAMA_MODELS") || `${Deno.env.get("HOME")}/.ollama/models`,
        "OLLAMA_DEBUG": Deno.env.get("OLLAMA_DEBUG") || "0",
        "OLLAMA_FLASH_ATTENTION": Deno.env.get("OLLAMA_FLASH_ATTENTION") || "1",
      },
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit", // Allow interactive commands
    }).spawn();
    
    const status = await ollamaProcess.status;
    Deno.exit(status.code);
  }
  
  // Save command
  if (cmd === "save") {
    if (!subcmd) {
      console.error("Usage: hlvm save <name> <file-or-code>");
      Deno.exit(1);
    }
    
    const name = subcmd;
    const codeOrPath = Deno.args.slice(2).join(' ');
    
    if (!codeOrPath) {
      console.error("Usage: hlvm save <name> <file-or-code>");
      Deno.exit(1);
    }
    
    // Set up HLVM environment for save command
    const initScriptPath = await setupHLVMEnvironment(tempDir, pathSep);
    await import(initScriptPath);
    
    try {
      // Call save function
      await globalThis.hlvm.save(name, codeOrPath);
      console.log(`✅ Saved module: ${name}`);
    } catch (error) {
      console.error(`❌ Save failed: ${error.message}`);
      Deno.exit(1);
    }
    
    Deno.exit(0);
  }
  
  // Minimal help
  if (cmd === "--help" || cmd === "-h") {
    console.log(`HLVM - High-Level Virtual Machine
    
Usage:
  hlvm                           Start REPL
  hlvm save <name> <file|code>   Save module to registry
  hlvm ollama serve              Start Ollama AI server
  hlvm --help                    Show this help
  
Examples:
  hlvm save cleanup ./cleanup.js
  hlvm save greet "export default function(name) { return 'Hello ' + name; }"`);
    Deno.exit(0);
  }
  
  // Unknown command - show error
  console.error(`Unknown command: ${cmd}`);
  console.error("Run 'hlvm --help' for usage");
  Deno.exit(1);
}

// REPL mode - extract binaries
const denoPath = await extractBinary('deno', DENO_PATH, '../resources/deno');
const ollamaPath = await extractBinary('ollama', OLLAMA_PATH, '../resources/ollama');

// Start Ollama service for REPL mode
let ollamaProcess = new Deno.Command(ollamaPath, {
  args: ["serve"],
  env: {
    "OLLAMA_HOST": "127.0.0.1:11434",
    "OLLAMA_MODELS": `${Deno.env.get("HOME")}/.ollama/models`
  },
  stdout: "null",
  stderr: "null",
}).spawn();

// Set up HLVM environment for REPL
let initScriptPath: string;
try {
  initScriptPath = await setupHLVMEnvironment(tempDir, pathSep);
  console.log("✓ Extracted embedded stdlib modules to temp directory");
} catch (e) {
  console.error("Failed to extract stdlib:", e);
  // Fallback - write minimal init
  initScriptPath = `${tempDir}${pathSep}hlvm-init.js`;
  await Deno.writeTextFile(initScriptPath, `
      globalThis.hlvm = { 
        platform: { os: "${Deno.build.os}", arch: "${Deno.build.arch}" },
        help: () => console.log("HLVM - Type 'hlvm' to explore")
      };
      console.log("HLVM ready (fallback mode).");
  `);
}

// ANSI color codes - SICP book colors
const PURPLE = '\x1b[38;5;54m';  // SICP purple
const RED = '\x1b[38;5;160m';    // SICP red
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// Show HLVM banner
console.log(`
${PURPLE}╔══════════════════════════════╗
║       ╦ ╦╦  ╦  ╦╔╦╗         ║
║       ╠═╣║  ╚╗╔╝║║║         ║
║       ╩ ╩╩═╝ ╚╝ ╩ ╩         ║
║                              ║
║  High-Level Virtual Machine  ║
║         ${RED}Version 2.0${PURPLE}          ║
╚══════════════════════════════╝${RESET}

${DIM}Direct SQLite Edition - No Proxy Server${RESET}
`);

// Set REPL prompt color
Deno.env.set("DENO_REPL_PROMPT", `${PURPLE}> ${RESET}`);

// Show ready message only for REPL mode
console.log("HLVM ready. Type 'hlvm.help()' for help.");

// Create pipes for stdin interception
const repl = new Deno.Command(denoPath, {
  args: ["repl", "--quiet", "--allow-all", "--eval-file=" + initScriptPath],
  stdin: "piped",  // We control stdin
  stdout: "inherit", 
  stderr: "inherit",
  env: {
    ...Deno.env.toObject(),
    "FORCE_COLOR": "1",
    "HLVM_HISTORY_DB": dbPath()
  }
});

const replProcess = repl.spawn();

// Function to save to history directly
async function saveToHistory(command: string) {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(dbPath());
    
    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS repl_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
    
    // Don't save empty or duplicate consecutive commands
    const lastRow = db.prepare(
      "SELECT command FROM repl_history ORDER BY timestamp DESC LIMIT 1"
    ).get() as any;
    
    if (command.trim() && command !== lastRow?.command) {
      db.prepare(
        "INSERT INTO repl_history (command, timestamp) VALUES (?, ?)"
      ).run(command.trim(), Date.now());
    }
    
    db.close();
  } catch {
    // Ignore errors
  }
}

// Use stream tee to forward stdin while capturing for history
const [stream1, stream2] = Deno.stdin.readable.tee();

// Forward one stream directly to REPL (no processing, no delay)
stream1.pipeTo(replProcess.stdin);

// Use second stream for history capture (async, non-blocking)
(async () => {
  const decoder = new TextDecoder();
  const reader = stream2.getReader();
  let buffer = "";
  
  while (true) {
    try {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value, { stream: true });
      buffer += text;
      
      // Check for complete lines
      if (buffer.includes('\n')) {
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('>') && !trimmed.startsWith('✓')) {
            await saveToHistory(line);
          }
        }
      }
    } catch {
      // Ignore errors in history capture
    }
  }
})();

// Handle exit
replProcess.status.then(() => {
  if (ollamaProcess) {
    try { ollamaProcess.kill(); } catch {}
  }
});

// Wait for REPL
await replProcess.status;

// Cleanup
if (ollamaProcess) {
  try { ollamaProcess.kill(); } catch {}
}
