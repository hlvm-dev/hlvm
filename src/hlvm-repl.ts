#!/usr/bin/env -S deno run --allow-all

// HLVM REPL - Direct SQLite version (no proxy server needed)

import { embeddedStdlib, embeddedInit, embeddedBridge } from "./embedded-stdlib.ts";

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
    
    // Try embedded extraction
    const extracted = await this.extractEmbedded(targetPath, resourcePath);
    if (extracted) return extracted;
    
    // Fallback to development mode
    return this.getDevelopmentPath(resourcePath);
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
    
    await this.createDirectoryStructure(stdlibPath);
    await this.writeStdlibModules(stdlibPath);
    await this.writeBridge();
    await this.writeInitScript(initScriptPath, stdlibPath);
    
    return initScriptPath;
  }

  private static async createDirectoryStructure(stdlibPath: string): Promise<void> {
    await Deno.mkdir(stdlibPath, { recursive: true });
    const subdirs = ['core', 'fs', 'io', 'computer', 'ai', 'ui'];
    
    for (const dir of subdirs) {
      await Deno.mkdir(`${stdlibPath}${Config.pathSep}${dir}`, { recursive: true });
    }
  }

  private static async writeStdlibModules(stdlibPath: string): Promise<void> {
    for (const [modulePath, moduleCode] of Object.entries(embeddedStdlib)) {
      await Deno.writeTextFile(`${stdlibPath}${Config.pathSep}${modulePath}`, moduleCode);
    }
    
  }

  private static async writeBridge(): Promise<void> {
    await Deno.writeTextFile(`${Config.tempDir}${Config.pathSep}hlvm-bridge.ts`, embeddedBridge);
  }

  private static async writeInitScript(initScriptPath: string, stdlibPath: string): Promise<void> {
    let initCode = embeddedInit;
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
      case "--help":
      case "-h":
        this.showHelp();
        break;
      default:
        this.handleUnknown(cmd);
    }
  }

  private static async handleDeno(): Promise<void> {
    const denoPath = await BinaryExtractor.extract('deno', Config.denoPath, '../resources/deno');
    const denoArgs = Deno.args.slice(1);
    
    const process = new Deno.Command(denoPath, {
      args: denoArgs,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
      env: Deno.env.toObject(),
    }).spawn();
    
    const status = await process.status;
    Deno.exit(status.code);
  }

  private static async handleOllama(): Promise<void> {
    const ollamaPath = await BinaryExtractor.extract('ollama', Config.ollamaPath, '../resources/ollama');
    const ollamaArgs = Deno.args.slice(1);
    
    const process = new Deno.Command(ollamaPath, {
      args: ollamaArgs,
      env: this.getOllamaEnv(),
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    }).spawn();
    
    const status = await process.status;
    Deno.exit(status.code);
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
    
    if (!name || rest.length === 0) {
      console.error("Usage: hlvm save <name> <file-or-code>");
      Deno.exit(1);
    }
    
    const codeOrPath = rest.join(' ');
    const initScriptPath = await EnvironmentSetup.setup();
    await import(initScriptPath);
    
    try {
      await globalThis.hlvm.save(name, codeOrPath);
      console.log(`✅ Saved module: ${name}`);
    } catch (error) {
      console.error(`❌ Save failed: ${error.message}`);
      Deno.exit(1);
    }
    
    Deno.exit(0);
  }

  private static showHelp(): void {
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

  async start(): Promise<void> {
    const denoPath = await BinaryExtractor.extract('deno', Config.denoPath, '../resources/deno');
    const ollamaPath = await BinaryExtractor.extract('ollama', Config.ollamaPath, '../resources/ollama');
    
    this.startOllamaService(ollamaPath);
    const initScriptPath = await this.setupEnvironment();
    
    this.showBanner();
    await this.startREPL(denoPath, initScriptPath);
    await this.cleanup();
  }

  private startOllamaService(ollamaPath: string): void {
    this.ollamaProcess = new Deno.Command(ollamaPath, {
      args: ["serve"],
      env: {
        "OLLAMA_HOST": "127.0.0.1:11434",
        "OLLAMA_MODELS": `${Deno.env.get("HOME")}/.ollama/models`
      },
      stdout: "null",
      stderr: "null",
    }).spawn();
  }

  private async setupEnvironment(): Promise<string> {
    try {
      const path = await EnvironmentSetup.setup();
      console.log("✓ Extracted embedded stdlib modules to temp directory");
      return path;
    } catch (e) {
      console.error("Failed to extract stdlib:", e);
      return EnvironmentSetup.createFallbackInit();
    }
  }

  private showBanner(): void {
    const colors = {
      purple: '\x1b[38;5;54m',
      red: '\x1b[38;5;160m',
      dim: '\x1b[2m',
      reset: '\x1b[0m'
    };

    console.log(`
${colors.purple}╔══════════════════════════════╗
║       ╦ ╦╦  ╦  ╦╔╦╗         ║
║       ╠═╣║  ╚╗╔╝║║║         ║
║       ╩ ╩╩═╝ ╚╝ ╩ ╩         ║
║                              ║
║  High-Level Virtual Machine  ║
║         ${colors.red}Version 2.0${colors.purple}          ║
╚══════════════════════════════╝${colors.reset}

${colors.dim}Direct SQLite Edition - No Proxy Server${colors.reset}
`);
    
    Deno.env.set("DENO_REPL_PROMPT", `${colors.purple}> ${colors.reset}`);
    console.log("HLVM ready. Type 'hlvm.help()' for help.");
  }

  private async startREPL(denoPath: string, initScriptPath: string): Promise<void> {
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
    
    this.replProcess.status.then(() => this.cleanup());
    await this.replProcess.status;
  }

  private async cleanup(): Promise<void> {
    if (this.ollamaProcess) {
      try { 
        this.ollamaProcess.kill();
      } catch {}
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