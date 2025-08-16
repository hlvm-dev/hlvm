#!/usr/bin/env -S deno run --allow-all

// Start services
const ollamaProcess = new Deno.Command("./resources/ollama", {
  args: ["serve"],
  env: {
    "OLLAMA_HOST": "127.0.0.1:11434",
    "OLLAMA_MODELS": `${Deno.env.get("HOME")}/.ollama/models`
  },
  stdout: "null",
  stderr: "null",
}).spawn();

const evalProxyProcess = new Deno.Command("./resources/deno", {
  args: ["run", "--allow-all", "./src/eval-proxy-server.ts"],
  stdout: "null",
  stderr: "null",
}).spawn();

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

// Run Deno REPL directly
const repl = new Deno.Command("./resources/deno", {
  args: ["repl", "--quiet"],
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