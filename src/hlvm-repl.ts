#!/usr/bin/env -S deno run --allow-all

// HLVM REPL - Direct SQLite version (no proxy server needed)

import { embeddedStdlib, embeddedInit, embeddedBridge } from "./embedded-stdlib.ts";

const tempDir = Deno.env.get("TMPDIR") || Deno.env.get("TEMP") || Deno.env.get("TMP") || "/tmp";
const pathSep = Deno.build.os === "windows" ? "\\" : "/";
const exeExt = Deno.build.os === "windows" ? ".exe" : "";
const DENO_PATH = `${tempDir}${pathSep}hlvm-deno${exeExt}`;
const OLLAMA_PATH = `${tempDir}${pathSep}hlvm-ollama${exeExt}`;

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

// Extract binaries
const denoPath = await extractBinary('deno', DENO_PATH, '../resources/deno');
const ollamaPath = await extractBinary('ollama', OLLAMA_PATH, '../resources/ollama');

// CLI Mode - Parse arguments and execute commands
if (Deno.args.length > 0) {
  const [cmd, subcmd, ...args] = Deno.args;
  
  // Special case: Ollama server mode
  if (cmd === "ollama" && subcmd === "serve") {
    const port = Deno.env.get("OLLAMA_HOST") || "127.0.0.1:11434";
    const ollamaServerProcess = new Deno.Command(ollamaPath, {
      args: ["serve"],
      env: {
        "OLLAMA_HOST": port,
        "OLLAMA_MODELS": `${Deno.env.get("HOME")}/.ollama/models`,
        "OLLAMA_DEBUG": Deno.env.get("OLLAMA_DEBUG") || "0",
        "OLLAMA_FLASH_ATTENTION": Deno.env.get("OLLAMA_FLASH_ATTENTION") || "1",
      },
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    await ollamaServerProcess.status;
    Deno.exit(0);
  }
  
  // Initialize hlvm for CLI commands
  // Need to set up stdlib in temp directory first for imports to work
  const initScriptPath = `${tempDir}${pathSep}hlvm-init.js`;
  const stdlibPath = `${tempDir}${pathSep}stdlib`;
  
  // Quick setup of stdlib for CLI mode
  await Deno.mkdir(stdlibPath, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}core`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}fs`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}io`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}computer`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}ai`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}app`, { recursive: true });
  
  // Write embedded stdlib modules to temp
  for (const [modulePath, moduleCode] of Object.entries(embeddedStdlib)) {
    await Deno.writeTextFile(`${stdlibPath}${pathSep}${modulePath}`, moduleCode);
  }
  
  // Write embedded init script with corrected paths
  let initCode = embeddedInit;
  initCode = initCode.replace(/from "\.\/stdlib\//g, `from "${stdlibPath}/`);
  initCode = initCode.replace('"../src/hlvm-bridge.ts"', `"${tempDir}${pathSep}hlvm-bridge.ts"`);
  initCode = initCode.replace('"../hlvm-bridge.ts"', `"${tempDir}${pathSep}hlvm-bridge.ts"`);
  await Deno.writeTextFile(initScriptPath, initCode);
  
  try {
    // Commands that DON'T need HLVM environment
    if (cmd === "eval" || cmd === "e") {
      if (!subcmd) {
        console.error("Usage: hlvm eval <expression>");
        Deno.exit(1);
      }
      const result = await eval(args.length > 0 ? `${subcmd} ${args.join(' ')}` : subcmd);
      if (result !== undefined) console.log(result);
      Deno.exit(0);
    }
    
    if (cmd === "run" || cmd === "r") {
      if (!subcmd) {
        console.error("Usage: hlvm run <script.js>");
        Deno.exit(1);
      }
      const script = await Deno.readTextFile(subcmd);
      await eval(script);
      Deno.exit(0);
    }
    
    if (cmd === "help" || cmd === "h") {
      // Help doesn't need HLVM environment
      console.log(`HLVM CLI Commands

Basic:
  eval <expr>         Evaluate expression
  run <script.js>     Run JavaScript file
  help                Show this help
  
File System:
  fs read <path>      Read file
  fs write <p> <txt>  Write file
  fs exists <path>    Check if exists
  fs rm <path>        Remove file
  fs ls <path>        List directory

Database:
  db save <n> <code>  Save module
  db load <name>      Load module
  db list             List modules
  db rm <name>        Remove module

System:
  sys platform        Show OS platform
  sys arch            Show architecture
  sys hostname        Show hostname
  sys home            Show home directory
  
Other:
  ask <prompt>        Ask Ollama AI
  clip read           Read clipboard
  clip write <text>   Write clipboard
  screen capture <f>  Capture screenshot
  notify <t> <msg>    Show notification`);
      Deno.exit(0);
    }
    
    // Load HLVM environment for CLI commands
    await import(initScriptPath);
    
    // Now handle CLI commands directly (no subprocess needed!)
    switch(cmd) {
      
    case "ask":
    case "a":
      if (!subcmd) {
        console.error("Usage: hlvm ask <prompt>");
        Deno.exit(1);
      }
      const prompt = args.length > 0 ? `${subcmd} ${args.join(' ')}` : subcmd;
      const response = await globalThis.hlvm.ask(prompt);
      console.log(response);
      break;
        
    case "fs":
        switch(subcmd) {
          case "read":
        console.log(await globalThis.hlvm.fs.read(args[0]));
            break;
          case "write":
        await globalThis.hlvm.fs.write(args[0], args.slice(1).join(' '));
        console.log("Written");
            break;
          case "exists":
        console.log(await globalThis.hlvm.fs.exists(args[0]));
            break;
          case "rm":
          case "remove":
        await globalThis.hlvm.fs.remove(args[0]);
        console.log("Removed");
            break;
          case "cp":
          case "copy":
        await globalThis.hlvm.fs.copy(args[0], args[1]);
        console.log("Copied");
            break;
          case "mv":
          case "move":
        await globalThis.hlvm.fs.move(args[0], args[1]);
        console.log("Moved");
            break;
          case "ls":
          case "list":
        const dirPath = args[0] || ".";
        const entries = [];
        for await (const entry of globalThis.hlvm.fs.readdir(dirPath)) {
          entries.push(entry.name);
        }
        entries.forEach(f => console.log(f));
        break;
      default:
        console.error(`Unknown fs command: ${subcmd}`);
        console.error("Available: read, write, exists, rm, cp, mv, ls");
        Deno.exit(1);
    }
    break;
    
  case "db":
        switch(subcmd) {
          case "save":
            await globalThis.hlvm.save(args[0], args.slice(1).join(' '));
            console.log(`✅ Saved module: ${args[0]}`);
            break;
          case "load":
            // Get the raw code from database, not the loaded module
            const dbModule = globalThis.hlvm.db.prepare("SELECT source_code FROM modules WHERE key = ?").get(args[0]);
            if (dbModule) {
              console.log(dbModule.source_code);
            } else {
              throw new Error(`Module '${args[0]}' not found`);
            }
            break;
          case "list":
            const modules = globalThis.hlvm.list();
            modules.forEach(m => console.log(m));
            break;
          case "rm":
          case "remove":
            await globalThis.hlvm.remove(args[0]);
            console.log(`✅ Removed module: ${args[0]}`);
            break;
          default:
            console.error(`Unknown db command: ${subcmd}`);
            console.error("Available: save, load, list, rm");
            Deno.exit(1);
        }
        break;
        
      case "sys":
        switch(subcmd) {
          case "platform":
            console.log(globalThis.hlvm.platform.os);
            break;
          case "arch":
            console.log(Deno.build.arch);
            break;
          case "hostname":
            console.log(await globalThis.hlvm.system.hostname());
            break;
          case "home":
            console.log(globalThis.hlvm.platform.homeDir());
            break;
          case "info":
            console.log(`OS: ${globalThis.hlvm.platform.os}`);
            console.log(`Arch: ${Deno.build.arch}`);
            console.log(`Home: ${globalThis.hlvm.platform.homeDir()}`);
            console.log(`Hostname: ${await globalThis.hlvm.system.hostname()}`);
            break;
          default:
            console.error(`Unknown sys command: ${subcmd}`);
            console.error("Available: platform, arch, hostname, home, info");
            Deno.exit(1);
        }
        break;
        
      case "clip":
        switch(subcmd) {
          case "read":
            console.log(await globalThis.hlvm.clipboard.read());
            break;
          case "write":
            const text = args.length > 0 ? args.join(' ') : await Deno.stdin.readable.pipeThrough(new TextDecoderStream()).getReader().read().then(r => r.value);
            await globalThis.hlvm.clipboard.write(text || "");
            console.log("Written to clipboard");
            break;
          default:
            console.error(`Unknown clip command: ${subcmd}`);
            console.error("Available: read, write");
            Deno.exit(1);
        }
        break;
        
      case "screen":
        if (subcmd === "capture") {
          await globalThis.hlvm.screen.capture(args[0] || "screenshot.png");
          console.log(`Captured to ${args[0] || "screenshot.png"}`);
        } else {
          console.error("Usage: hlvm screen capture [filename]");
          Deno.exit(1);
        }
        break;
        
      case "notify":
        await globalThis.hlvm.notification.notify(subcmd || "Notification", args.join(' ') || "HLVM");
        break;
        
      case "help":
        console.log(`HLVM CLI Commands:
        
Core:
  eval <expr>         Evaluate JavaScript expression
  run <script.js>     Run JavaScript file  
  ask <prompt>        Query AI (Ollama)

File System:
  fs read <file>      Read file contents
  fs write <f> <txt>  Write text to file
  fs exists <path>    Check if path exists
  fs rm <path>        Remove file/directory
  fs cp <src> <dst>   Copy file/directory
  fs mv <src> <dst>   Move file/directory
  fs ls [dir]         List directory contents

Database:
  db save <name> <js> Save module code
  db load <name>      Load module
  db list             List saved modules
  db rm <name>        Remove module

System:
  sys platform        Show OS platform
  sys arch            Show architecture
  sys hostname        Show hostname
  sys home            Show home directory
  sys info            Show all system info

Clipboard:
  clip read           Read clipboard text
  clip write <text>   Write to clipboard

Other:
  screen capture <f>  Capture screenshot
  notify <t> <msg>    Show notification
  help                Show this help
  
No arguments starts REPL mode.`);
        break;
        
      case "repl":
        // Continue to REPL mode below
        break;
        
      default:
        console.error(`Unknown command: ${cmd}`);
        console.error("Run 'hlvm help' for available commands");
        Deno.exit(1);
    }
    
    Deno.exit(0);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  }
}

// Start Ollama service for REPL mode (no proxy server needed!)
const ollamaProcess = new Deno.Command(ollamaPath, {
  args: ["serve"],
  env: {
    "OLLAMA_HOST": "127.0.0.1:11434",
    "OLLAMA_MODELS": `${Deno.env.get("HOME")}/.ollama/models`
  },
  stdout: "null",
  stderr: "null",
}).spawn();

// Copy init script and stdlib to temp for REPL to load
const initScriptPath = `${tempDir}${pathSep}hlvm-init.js`;
const stdlibPath = `${tempDir}${pathSep}stdlib`;

// Extract stdlib to temp directory
try {
  // Create stdlib directory structure
  await Deno.mkdir(stdlibPath, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}core`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}fs`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}io`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}computer`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}ai`, { recursive: true });
  await Deno.mkdir(`${stdlibPath}${pathSep}app`, { recursive: true });
  
  // Write all embedded stdlib modules to temp
  for (const [modulePath, moduleCode] of Object.entries(embeddedStdlib)) {
    await Deno.writeTextFile(`${stdlibPath}${pathSep}${modulePath}`, moduleCode);
  }
  
  // Write embedded bridge module to temp
  await Deno.writeTextFile(`${tempDir}${pathSep}hlvm-bridge.ts`, embeddedBridge);
  
  // Write embedded init script with corrected paths
  let initCode = embeddedInit;
  // Fix import paths to use temp directory
  initCode = initCode.replace(/from "\.\/stdlib\//g, `from "${stdlibPath}/`);
  initCode = initCode.replace('"../src/hlvm-bridge.ts"', `"${tempDir}${pathSep}hlvm-bridge.ts"`);
  initCode = initCode.replace('"../hlvm-bridge.ts"', `"${tempDir}${pathSep}hlvm-bridge.ts"`);
  await Deno.writeTextFile(initScriptPath, initCode);
  
  console.log("✓ Extracted embedded stdlib modules to temp directory");
} catch (e) {
  console.error("Failed to extract stdlib:", e);
  // Fallback - write minimal init
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

// Run Deno REPL with init script
const repl = new Deno.Command(denoPath, {
  args: ["repl", "--quiet", "--allow-all", "--eval-file=" + initScriptPath],
  stdin: "inherit",
  stdout: "inherit", 
  stderr: "inherit",
  env: {
    ...Deno.env.toObject(),
    "FORCE_COLOR": "1",
  }
});

const replProcess = repl.spawn();

// Handle exit
replProcess.status.then(() => {
  try { ollamaProcess.kill(); } catch {}
});

// Wait for REPL
await replProcess.status;

// Cleanup
try { ollamaProcess.kill(); } catch {}// Test change at Sat 16 Aug 2025 16:25:03 EDT
