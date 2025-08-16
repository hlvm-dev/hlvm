#!/usr/bin/env -S deno run --allow-all

// HLVM REPL - Direct SQLite version (no proxy server needed)

// Cross-platform temp directory
function getTempDir(): string {
  const envTemp = Deno.env.get("TMPDIR") || Deno.env.get("TEMP") || Deno.env.get("TMP");
  if (envTemp) return envTemp;
  
  if (Deno.build.os === "windows") {
    const userProfile = Deno.env.get("USERPROFILE");
    if (userProfile) {
      return `${userProfile}\\AppData\\Local\\Temp`;
    }
    return "C:\\Windows\\Temp";
  }
  
  return "/tmp";
}

const tempDir = getTempDir();
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

// Start Ollama service only (no proxy server needed!)
const ollamaProcess = new Deno.Command(ollamaPath, {
  args: ["serve"],
  env: {
    "OLLAMA_HOST": "127.0.0.1:11434",
    "OLLAMA_MODELS": `${Deno.env.get("HOME")}/.ollama/models`
  },
  stdout: "null",
  stderr: "null",
}).spawn();

// Check if running as compiled binary
const isCompiled = !import.meta.url.startsWith("file:///Users");

// Copy init script and stdlib to temp for REPL to load
const initScriptPath = `${tempDir}${pathSep}hlvm-init.js`;
const stdlibPath = `${tempDir}${pathSep}stdlib`;

// Always extract stdlib for compiled binary
if (true) {  // Always extract to temp
  // When compiled, extract all embedded files
  try {
    // Create stdlib directory structure
    await Deno.mkdir(stdlibPath, { recursive: true });
    await Deno.mkdir(`${stdlibPath}${pathSep}core`, { recursive: true });
    await Deno.mkdir(`${stdlibPath}${pathSep}fs`, { recursive: true });
    await Deno.mkdir(`${stdlibPath}${pathSep}io`, { recursive: true });
    await Deno.mkdir(`${stdlibPath}${pathSep}computer`, { recursive: true });
    await Deno.mkdir(`${stdlibPath}${pathSep}ai`, { recursive: true });
    await Deno.mkdir(`${stdlibPath}${pathSep}app`, { recursive: true });
    
    // Copy all stdlib modules to their organized locations
    const stdlibModules = [
      { path: 'core/platform.js', src: './stdlib/core/platform.js' },
      { path: 'core/system.js', src: './stdlib/core/system.js' },
      { path: 'core/database.js', src: './stdlib/core/database.js' },
      { path: 'fs/filesystem.js', src: './stdlib/fs/filesystem.js' },
      { path: 'io/clipboard.js', src: './stdlib/io/clipboard.js' },
      { path: 'computer/notification.js', src: './stdlib/computer/notification.js' },
      { path: 'computer/screen.js', src: './stdlib/computer/screen.js' },
      { path: 'computer/keyboard.js', src: './stdlib/computer/keyboard.js' },
      { path: 'computer/mouse.js', src: './stdlib/computer/mouse.js' },
      { path: 'ai/ollama.js', src: './stdlib/ai/ollama.js' },
      { path: 'app/control.js', src: './stdlib/app/control.js' }
    ];
    
    for (const module of stdlibModules) {
      const moduleCode = await Deno.readTextFile(new URL(module.src, import.meta.url));
      await Deno.writeTextFile(`${stdlibPath}${pathSep}${module.path}`, moduleCode);
    }
    
    // Copy bridge module to temp
    const bridgeCode = await Deno.readTextFile(new URL('./hlvm-bridge.ts', import.meta.url));
    await Deno.writeTextFile(`${tempDir}${pathSep}hlvm-bridge.ts`, bridgeCode);
    
    // Copy init script with corrected paths
    let initCode = await Deno.readTextFile(new URL('./hlvm-init.js', import.meta.url));
    // Fix import paths to use temp directory
    initCode = initCode.replace(/from "\.\/stdlib\//g, `from "${stdlibPath}/`);
    initCode = initCode.replace('"../src/hlvm-bridge.ts"', `"${tempDir}${pathSep}hlvm-bridge.ts"`);
    await Deno.writeTextFile(initScriptPath, initCode);
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
try { ollamaProcess.kill(); } catch {}