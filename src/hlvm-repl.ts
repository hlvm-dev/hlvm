#!/usr/bin/env -S deno run --allow-all

// HLVM REPL - Direct SQLite version (no proxy server needed)

import { embeddedStdlib, embeddedInit, embeddedBridge, EMBEDDED_MODEL } from "./embedded-stdlib.ts";
import { HLVM_VERSION } from "./version.ts";
import { initializeOSSecurity, cleanExtractedBinary } from "./os-utils.ts";

// Initialize OS-specific security settings on startup
await initializeOSSecurity();

// Configuration constants
class Config {
  static readonly tempDir = Deno.env.get("TMPDIR") || Deno.env.get("TEMP") || Deno.env.get("TMP") || "/tmp";
  static readonly pathSep = Deno.build.os === "windows" ? "\\" : "/";
  static readonly exeExt = Deno.build.os === "windows" ? ".exe" : "";
  static readonly denoPath = `${Config.tempDir}${Config.pathSep}hlvm-deno${Config.exeExt}`;
  static readonly ollamaPath = `${Config.tempDir}${Config.pathSep}hlvm-ollama${Config.exeExt}`;
}

// Binary extraction manager
class BinaryExtractor {
  static async extract(name: string, targetPath: string, resourcePath: string): Promise<string> {
    // Check if already extracted
    if (await this.isValidBinary(targetPath)) {
      return targetPath;
    }
    
    // Show progress only when actually extracting
    console.log(`\x1b[36m⏳ Extracting ${name} runtime...\x1b[0m`);
    
    // Try embedded extraction
    const extracted = await this.extractEmbedded(targetPath, resourcePath);
    if (extracted) {
      console.log(`\x1b[32m✓ ${name} ready\x1b[0m`);
      return extracted;
    }
    
    // Fallback to development mode
    const devPath = this.getDevelopmentPath(resourcePath);
    if (await this.isValidBinary(devPath)) {
      console.log(`\x1b[33m⚠ Using development ${name} binary\x1b[0m`);
      return devPath;
    }
    
    throw new Error(`Failed to extract ${name} binary. Neither embedded nor development binary found.`);
  }

  private static async isValidBinary(path: string): Promise<boolean> {
    try {
      const info = await Deno.stat(path);
      return info.isFile;
    } catch {
      return false;
    }
  }

  private static async extractEmbedded(targetPath: string, resourcePath: string): Promise<string | null> {
    try {
      const binaryBytes = await Deno.readFile(new URL(resourcePath, import.meta.url));
      const tempPath = `${targetPath}.tmp.${Date.now()}`;
      await Deno.writeFile(tempPath, binaryBytes);
      await Deno.chmod(tempPath, 0o755);
      await Deno.rename(tempPath, targetPath);
      
      // Clean extracted binary from OS security restrictions
      await cleanExtractedBinary(targetPath);
      
      return targetPath;
    } catch {
      return null;
    }
  }

  private static getDevelopmentPath(resourcePath: string): string {
    return resourcePath.replace('../', './');
  }
}

// Environment setup manager
class EnvironmentSetup {
  static async setup(): Promise<string> {
    const initScriptPath = `${Config.tempDir}${Config.pathSep}hlvm-init.js`;
    const stdlibPath = `${Config.tempDir}${Config.pathSep}stdlib`;
    
    // ALWAYS extract fresh - no cache
    await this.createDirectoryStructure(stdlibPath);
    await this.writeStdlibModules(stdlibPath);
    await this.writeBridge();
    await this.writeInitScript(initScriptPath, stdlibPath);
    
    return initScriptPath;
  }


  private static async createDirectoryStructure(stdlibPath: string): Promise<void> {
    await Deno.mkdir(stdlibPath, { recursive: true });
    const subdirs = ['core', 'fs', 'io', 'computer', 'ai', 'ui', 'app'];
    
    for (const dir of subdirs) {
      await Deno.mkdir(`${stdlibPath}${Config.pathSep}${dir}`, { recursive: true });
    }
  }

  private static async writeStdlibModules(stdlibPath: string): Promise<void> {
    for (const [modulePath, moduleCode] of Object.entries(embeddedStdlib)) {
      const filePath = `${stdlibPath}${Config.pathSep}${modulePath}`;
      await Deno.writeTextFile(filePath, moduleCode);
    }
  }

  private static async writeBridge(): Promise<void> {
    await Deno.writeTextFile(`${Config.tempDir}${Config.pathSep}hlvm-bridge.ts`, embeddedBridge);
  }

  private static async writeInitScript(initScriptPath: string, stdlibPath: string): Promise<void> {
    // Set global EMBEDDED_MODEL at the beginning of init code
    let initCode = `globalThis.EMBEDDED_MODEL = "${EMBEDDED_MODEL}";\n` + embeddedInit;
    initCode = initCode.replace(/from "\.\/stdlib\//g, `from "${stdlibPath}/`);
    initCode = initCode.replace(/"..\/(src\/)?hlvm-bridge\.ts"/g, `"${Config.tempDir}${Config.pathSep}hlvm-bridge.ts"`);
    await Deno.writeTextFile(initScriptPath, initCode);
  }

  static async createFallbackInit(): Promise<string> {
    const initScriptPath = `${Config.tempDir}${Config.pathSep}hlvm-init.js`;
    await Deno.writeTextFile(initScriptPath, `
      globalThis.hlvm = { 
        platform: { os: "${Deno.build.os}", arch: "${Deno.build.arch}" },
        help: () => console.log("HLVM - Type 'hlvm' to explore")
      };
      console.log("HLVM ready (fallback mode).");
    `);
    return initScriptPath;
  }
}

// Command handlers
class CommandHandler {
  static async handle(): Promise<void> {
    if (Deno.args.length === 0) return;
    
    const [cmd] = Deno.args;
    
    switch(cmd) {
      case "deno":
        await this.handleDeno();
        break;
      case "ollama":
        await this.handleOllama();
        break;
      case "save":
        await this.handleSave();
        break;
      case "revise":
        await this.handleRevise();
        break;
      case "list":
      case "commands":
        this.showCommands();
        break;
      case "--help":
      case "-h":
        this.showHelp();
        break;
      default:
        this.handleUnknown(cmd);
    }
  }

  private static async spawnAndExit(binaryPath: string, args: string[], env?: Record<string, string>): Promise<void> {
    const process = new Deno.Command(binaryPath, {
      args,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
      env: env || Deno.env.toObject(),
    }).spawn();
    
    const status = await process.status;
    Deno.exit(status.code);
  }

  private static async handleDeno(): Promise<void> {
    try {
      const denoPath = await BinaryExtractor.extract('deno', Config.denoPath, '../resources/deno');
      await this.spawnAndExit(denoPath, Deno.args.slice(1));
    } catch (error) {
      console.error(`\x1b[31m✗ Failed to run Deno: ${error.message}\x1b[0m`);
      Deno.exit(1);
    }
  }

  private static async handleOllama(): Promise<void> {
    try {
      const ollamaPath = await BinaryExtractor.extract('ollama', Config.ollamaPath, '../resources/ollama');
      await this.spawnAndExit(ollamaPath, Deno.args.slice(1), this.getOllamaEnv());
    } catch (error) {
      console.error(`\x1b[31m✗ Failed to run Ollama: ${error.message}\x1b[0m`);
      Deno.exit(1);
    }
  }

  private static getOllamaEnv(): Record<string, string> {
    return {
      "OLLAMA_HOST": Deno.env.get("OLLAMA_HOST") || "127.0.0.1:11434",
      "OLLAMA_MODELS": Deno.env.get("OLLAMA_MODELS") || `${Deno.env.get("HOME")}/.ollama/models`,
      "OLLAMA_DEBUG": Deno.env.get("OLLAMA_DEBUG") || "0",
      "OLLAMA_FLASH_ATTENTION": Deno.env.get("OLLAMA_FLASH_ATTENTION") || "1",
    };
  }

  private static async handleSave(): Promise<void> {
    const [, name, ...rest] = Deno.args;
    
    // Check for help flag
    if (name === '--help' || name === '-h' || rest.includes('--help')) {
      this.showSaveHelp();
      return;
    }
    
    if (!name || rest.length === 0) {
      console.error("Usage: hlvm save <name> <file-or-code>");
      console.error("Run 'hlvm save --help' for more information");
      Deno.exit(1);
    }
    
    const codeOrPath = rest.join(' ');
    const initScriptPath = await EnvironmentSetup.setup();
    await import(initScriptPath);
    
    try {
      await globalThis.hlvm.core.storage.esm.set(name, codeOrPath);
      console.log(`✅ Saved module: ${name}`);
    } catch (error) {
      console.error(`❌ Save failed: ${error.message}`);
      Deno.exit(1);
    }
    
    Deno.exit(0);
  }

  private static async handleRevise(): Promise<void> {
    const [, ...rest] = Deno.args;
    
    // Check for help flag
    if (rest.includes('--help') || rest.includes('-h')) {
      this.showReviseHelp();
      return;
    }
    
    const args = rest.join(' ').trim();
    
    // Parse tone option if provided
    let tone = 'default';
    let text = args;
    
    // Check for tone flags
    if (args.startsWith('--')) {
      const match = args.match(/^--(\w+)\s+(.*)/);
      if (match) {
        tone = match[1];
        text = match[2];
      }
    }
    
    // Setup environment and load hlvm
    const initScriptPath = await EnvironmentSetup.setup();
    await import(initScriptPath);
    
    try {
      // If no text provided, use clipboard
      if (!text) {
        text = await globalThis.hlvm.core.io.clipboard.read();
        if (!text) {
          console.error("No text provided and clipboard is empty");
          console.error("Usage: hlvm revise [--tone] <text>");
          console.error("       hlvm revise [--tone]  (uses clipboard)");
          console.error("Tones: --professional, --casual, --friendly, --concise, --formal");
          Deno.exit(1);
        }
      }
      
      // Call the revise function
      const revised = await globalThis.hlvm.stdlib.ai.revise(text, { tone });
      
      // Output the revised text
      console.log(revised);
      
      // Also copy to clipboard for convenience
      await globalThis.hlvm.core.io.clipboard.write(revised);
      
    } catch (error) {
      console.error(`❌ Revision failed: ${error.message}`);
      Deno.exit(1);
    }
    
    Deno.exit(0);
  }

  private static showSaveHelp(): void {
    console.log(`hlvm save - Save JavaScript module to registry

Usage:
  hlvm save <name> <file>         Save a file as a module
  hlvm save <name> "<code>"       Save inline code as a module
  
Options:
  --help, -h                      Show this help
  
Description:
  Saves JavaScript code or files to HLVM's ESM module registry for reuse.
  Modules can be loaded in REPL with hlvm.core.storage.esm.load(name)
  
Examples:
  hlvm save utils ./utils.js
  hlvm save greet "export default (name) => 'Hello ' + name"
  hlvm save cleanup ./scripts/cleanup.js
  
In REPL:
  const utils = await hlvm.core.storage.esm.load('utils')
  hlvm.core.storage.esm.list()  // List all saved modules`);
    Deno.exit(0);
  }

  private static showReviseHelp(): void {
    console.log(`hlvm revise - AI-powered text revision

Usage:
  hlvm revise [--tone] <text>     Revise the provided text
  hlvm revise [--tone]             Revise text from clipboard
  
Tone Options:
  --professional                   Business/formal communication
  --casual                         Relaxed and conversational  
  --friendly                       Warm and approachable
  --concise                        Brief and to the point
  --formal                         Academic/formal style
  
Options:
  --help, -h                       Show this help
  
Description:
  Uses AI to improve text clarity, fix grammar/spelling, and adjust tone.
  If no text is provided, reads from clipboard.
  Revised text is automatically copied to clipboard.
  
Examples:
  hlvm revise "thx for ur help"
  hlvm revise --professional "hey can u send me the files"
  hlvm revise --concise              # Revises clipboard content
  echo "text" | pbcopy && hlvm revise --friendly`);
    Deno.exit(0);
  }

  private static showCommands(): void {
    console.log(`HLVM CLI Commands
═══════════════════

Core Commands:
  hlvm                    Start REPL interactive session
  hlvm save               Save JavaScript module to registry
  hlvm revise             AI-powered text revision
  hlvm list/commands      Show this command list
  hlvm --help/-h          Show detailed help

Pass-through Commands:
  hlvm deno <cmd>         Execute any Deno command
  hlvm ollama <cmd>       Execute any Ollama command

Examples:
  hlvm                                      # Start REPL
  hlvm save utils ./utils.js                # Save module
  hlvm revise "thx 4 ur help"              # Revise text
  hlvm revise --professional                # Revise clipboard with tone
  hlvm deno run --allow-all script.ts      # Run TypeScript
  hlvm ollama pull llama3.2                # Download model
  hlvm ollama list                         # List models

Documentation:
  Deno commands: https://docs.deno.com/runtime/manual
  Ollama commands: https://github.com/ollama/ollama/blob/main/docs/api.md`);
    Deno.exit(0);
  }

  private static showHelp(): void {
    console.log(`HLVM - High-Level Virtual Machine
    
Usage: hlvm <command> [options]

Commands:
  hlvm                    Start REPL interactive session
  hlvm save               Save JavaScript module to registry  
  hlvm revise             AI-powered text revision
  hlvm list               Show all available commands
  hlvm deno <cmd>         Run Deno commands
  hlvm ollama <cmd>       Run Ollama commands
  
Options:
  --help, -h              Show help for a command
  
Get Help:
  hlvm <command> --help   Show detailed help for specific command
  hlvm list               List all available commands
  
Examples:
  hlvm                    Start REPL
  hlvm save --help        Show save command help
  hlvm revise --help      Show revise command help
  hlvm revise "text"      Revise text with AI`);
    Deno.exit(0);
  }

  private static handleUnknown(cmd: string): void {
    console.error(`Unknown command: ${cmd}`);
    console.error("Run 'hlvm --help' for usage");
    Deno.exit(1);
  }
}

// REPL manager
class REPLManager {
  private ollamaProcess?: Deno.ChildProcess;
  private replProcess?: Deno.ChildProcess;
  private isOllamaExternal = false;

  async start(): Promise<void> {
    try {
      const denoPath = await BinaryExtractor.extract('deno', Config.denoPath, '../resources/deno');
      const ollamaPath = await BinaryExtractor.extract('ollama', Config.ollamaPath, '../resources/ollama');
      
      // Setup cleanup on exit signals
      Deno.addSignalListener("SIGINT", () => this.cleanup().then(() => Deno.exit(0)));
      Deno.addSignalListener("SIGTERM", () => this.cleanup().then(() => Deno.exit(0)));
      
      await this.startOllamaService(ollamaPath);
      const initScriptPath = await this.setupEnvironment();
      
      this.showBanner();
      await this.startREPL(denoPath, initScriptPath);
      await this.cleanup();
    } catch (error) {
      console.error(`\x1b[31m✗ Failed to start HLVM: ${error.message}\x1b[0m`);
      await this.cleanup();
      Deno.exit(1);
    }
  }

  private async startOllamaService(ollamaPath: string): Promise<void> {
    // Only start if not already running
    try {
      const response = await fetch("http://127.0.0.1:11434/api/tags");
      if (response.ok) {
        this.isOllamaExternal = true;
        return; // Already running, nothing to do
      }
    } catch {}
    
    // Start our own Ollama service
    this.ollamaProcess = new Deno.Command(ollamaPath, {
      args: ["serve"],
      env: {
        "OLLAMA_HOST": "127.0.0.1:11434",
        "OLLAMA_MODELS": `${Deno.env.get("HOME")}/.ollama/models`
      },
      stdout: "null",
      stderr: "null",
    }).spawn();
    
    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async setupEnvironment(): Promise<string> {
    try {
      const path = await EnvironmentSetup.setup();
      return path;
    } catch (e) {
      console.error("Failed to extract stdlib:", e);
      return EnvironmentSetup.createFallbackInit();
    }
  }

  private showBanner(): void {
    const colors = {
      purple: '\x1b[38;5;91m',
      darkPurple: '\x1b[38;5;54m',
      red: '\x1b[38;5;197m',
      gray: '\x1b[38;5;240m',
      bright: '\x1b[38;5;255m',
      reset: '\x1b[0m'
    };
  
    // Helper to measure visible width (ignore ANSI)
    const stripAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*m/g, '');
  
    // Lines INSIDE the box (no borders). Use colors freely here.
    const lines = [
      '',
      `${colors.purple}██╗  ██╗ ██╗     ██╗   ██╗ ███╗   ███╗`,
      `${colors.purple}██║  ██║ ██║     ██║   ██║ ████╗ ████║`,
      `${colors.purple}███████║ ██║     ██║   ██║ ██╔████╔██║`,
      `${colors.purple}██╔══██║ ██║     ╚██╗ ██╔╝ ██║╚██╔╝██║`,
      `${colors.purple}██║  ██║ ███████╗ ╚████╔╝  ██║ ╚═╝ ██║`,
      `${colors.purple}╚═╝  ╚═╝ ╚══════╝  ╚═══╝   ╚═╝     ╚═╝`,
      '',
      `${colors.bright}HIGH-LEVEL VIRTUAL MACHINE     ${colors.red}v${HLVM_VERSION}`,
      `${colors.gray}Powered by Deno (github.com/denoland/deno)`,
      `${colors.gray}& Ollama (github.com/ollama/ollama)`
    ];
  
    // Compute max visible width and build borders with 1 space padding on each side
    const contentWidth = Math.max(...lines.map(l => stripAnsi(l).length));
    const top    = `${colors.darkPurple}╔${'═'.repeat(contentWidth + 2)}╗`;
    const bottom = `${colors.darkPurple}╚${'═'.repeat(contentWidth + 2)}╝${colors.reset}`;
  
    // Render each line with proper right padding (switch back to border color for spaces)
    const boxed = [
      top,
      ...lines.map(line => {
        const visible = stripAnsi(line).length;
        const pad = contentWidth - visible;
        return `${colors.darkPurple}║ ${line}${colors.darkPurple}${' '.repeat(pad)} ║`;
      }),
      bottom
    ].join('\n');
  
    console.log(`\n${boxed}\n`);
    Deno.env.set("DENO_REPL_PROMPT", "> ");
    console.log("HLVM ready. Type 'help()' for general help or 'help(function)' for docs.");
  }
  

  private async startREPL(denoPath: string, initScriptPath: string): Promise<void> {
    try {
      const repl = new Deno.Command(denoPath, {
        args: ["repl", "--quiet", "--allow-all", `--eval-file=${initScriptPath}`],
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
        env: {
          ...Deno.env.toObject(),
          "FORCE_COLOR": "1",
        }
      });

      this.replProcess = repl.spawn();
      const status = await this.replProcess.status;
      
      if (!status.success) {
        console.error(`\x1b[31m✗ REPL exited with code ${status.code}\x1b[0m`);
      }
    } catch (error) {
      console.error(`\x1b[31m✗ Failed to start REPL: ${error.message}\x1b[0m`);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    // Only kill Ollama if we started it (not external)
    if (this.ollamaProcess && !this.isOllamaExternal) {
      try {
        this.ollamaProcess.kill("SIGTERM");
        await new Promise(resolve => setTimeout(resolve, 100));
        this.ollamaProcess.kill("SIGKILL");
      } catch {
        // Process already dead, that's fine
      }
    }
  }
}

// Handle CLI commands
await CommandHandler.handle();

// Start REPL if no command arguments
if (Deno.args.length === 0) {
  const repl = new REPLManager();
  await repl.start();
}