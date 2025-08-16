#!/usr/bin/env -S deno run --allow-all

// Extract embedded binaries to temp if running as compiled binary
// Cross-platform temp directory
function getTempDir(): string {
  // Try environment variables first
  const envTemp = Deno.env.get("TMPDIR") || Deno.env.get("TEMP") || Deno.env.get("TMP");
  if (envTemp) return envTemp;
  
  // Platform-specific defaults
  if (Deno.build.os === "windows") {
    const userProfile = Deno.env.get("USERPROFILE");
    if (userProfile) {
      return `${userProfile}\\AppData\\Local\\Temp`;
    }
    return "C:\\Windows\\Temp";
  }
  
  // Unix-like systems (macOS, Linux, BSD, etc.)
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

// Start services
const ollamaProcess = new Deno.Command(ollamaPath, {
  args: ["serve"],
  env: {
    "OLLAMA_HOST": "127.0.0.1:11434",
    "OLLAMA_MODELS": `${Deno.env.get("HOME")}/.ollama/models`
  },
  stdout: "null",
  stderr: "null",
}).spawn();

// Start eval-proxy server
// When compiled, we need to extract and run the eval-proxy code
// Check if running as compiled binary
const isCompiled = denoPath === DENO_PATH; // If we extracted Deno, we're compiled

let evalProxyProcess;
if (isCompiled) {
  // Write eval-proxy to temp and run it
  const evalProxyPath = `${tempDir}${pathSep}hlvm-eval-proxy.ts`;
  try {
    const evalProxyCode = await Deno.readTextFile(new URL('./eval-proxy-server.ts', import.meta.url));
    await Deno.writeTextFile(evalProxyPath, evalProxyCode);
  } catch {
    // Already exists or can't write, that's ok
  }
  
  evalProxyProcess = new Deno.Command(denoPath, {
    args: ["run", "--allow-all", evalProxyPath],
    stdout: "null",
    stderr: "null",
  }).spawn();
} else {
  // Development mode - run as subprocess
  evalProxyProcess = new Deno.Command(denoPath, {
    args: ["run", "--allow-all", "./src/eval-proxy-server.ts"],
    stdout: "null",
    stderr: "null",
  }).spawn();
}

// Wait for services
await new Promise(r => setTimeout(r, 2000));

// ANSI color codes - SICP book colors
const PURPLE = '\x1b[38;5;54m';  // SICP purple
const RED = '\x1b[38;5;160m';    // SICP red
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// Show HLVM banner with SICP colors
console.log(`
${PURPLE}╔══════════════════════════════╗
║       ╦ ╦╦  ╦  ╦╔╦╗         ║
║       ╠═╣║  ╚╗╔╝║║║         ║
║       ╩ ╩╩═╝ ╚╝ ╩ ╩         ║
║                              ║
║  High-Level Virtual Machine  ║
║         ${RED}Version 1.0${PURPLE}          ║
╚══════════════════════════════╝${RESET}

${DIM}Powered by Deno and Ollama${RESET}
`);

// Import stdlib  
await import('./hlvm-stdlib.ts').catch(() => {});

// Set REPL prompt color
Deno.env.set("DENO_REPL_PROMPT", `${PURPLE}> ${RESET}`);

// Run Deno REPL directly with full permissions
const repl = new Deno.Command(denoPath, {
  args: ["repl", "--quiet", "--allow-all"],
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
  try { evalProxyProcess.kill(); } catch {}
});

// Wait for REPL
await replProcess.status;

// Cleanup
try { ollamaProcess.kill(); } catch {}
try { evalProxyProcess.kill(); } catch {}