/**
 * System module - Cross-platform system operations wrapper for Deno
 * Provides unified API for process execution, environment variables, system info, and process management
 */

// Platform detection
const platform = Deno.build.os;
const isWindows = platform === "windows";
const isMacOS = platform === "darwin";
const isLinux = platform === "linux";

/**
 * Process execution options
 */
export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdin?: "piped" | "inherit" | "null";
  stdout?: "piped" | "inherit" | "null";
  stderr?: "piped" | "inherit" | "null";
  signal?: AbortSignal;
}

/**
 * Process execution result
 */
export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
  signal?: string;
}

/**
 * Process information
 */
export interface ProcessInfo {
  pid: number;
  ppid?: number;
  name: string;
  cmd?: string;
  cpu?: number;
  memory?: number;
  user?: string;
}

/**
 * System information
 */
export interface SystemInfo {
  hostname: string;
  username: string;
  homedir: string;
  tmpdir: string;
  platform: typeof platform;
  arch: string;
  release?: string;
  cpus?: number;
  totalmem?: number;
  freemem?: number;
}

/**
 * Execute a command and return the result
 */
export async function exec(commandStr: string, options: ExecOptions = {}): Promise<ExecResult> {
  // For complex commands with pipes, redirects, etc., use shell
  const needsShell = commandStr.includes('|') || commandStr.includes('>') || commandStr.includes('<') || 
                     commandStr.includes('&&') || commandStr.includes('||') || commandStr.includes(';');
  
  let cmd: string;
  let args: string[];
  
  if (needsShell) {
    // Use shell for complex commands
    if (isWindows) {
      cmd = 'cmd';
      args = ['/c', commandStr];
    } else {
      // Use bash instead of sh for better PATH handling
      cmd = '/bin/bash';
      args = ['-c', commandStr];
    }
  } else {
    // Parse simple commands
    const parsed = parseCommand(commandStr);
    cmd = parsed.cmd;
    args = parsed.args;
  }
  
  const runOptions: Deno.CommandOptions = {
    args: args,
    cwd: options.cwd,
    env: options.env || Deno.env.toObject(), // Include current environment by default
    stdin: options.stdin || "null",
    stdout: options.stdout || "piped",
    stderr: options.stderr || "piped",
    signal: options.signal,
  };

  const command = new Deno.Command(cmd, runOptions);
  const output = await command.output();
  
  const decoder = new TextDecoder();
  return {
    code: output.code,
    stdout: output.stdout ? decoder.decode(output.stdout) : "",
    stderr: output.stderr ? decoder.decode(output.stderr) : "",
    signal: output.signal || undefined,
  };
}

/**
 * Spawn a process and return a handle to it
 */
export function spawn(commandStr: string, options: ExecOptions = {}): Deno.ChildProcess {
  const { cmd, args } = parseCommand(commandStr);
  
  const runOptions: Deno.CommandOptions = {
    args: args,
    cwd: options.cwd,
    env: options.env,
    stdin: options.stdin || "null",
    stdout: options.stdout || "piped",
    stderr: options.stderr || "piped",
    signal: options.signal,
  };

  const command = new Deno.Command(cmd, runOptions);
  return command.spawn();
}

/**
 * Parse command string into command and arguments
 * Handles cross-platform differences
 */
function parseCommand(command: string): { cmd: string; args: string[] } {
  // Simple parsing - for more complex scenarios, consider using a proper shell parser
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const cmd = parts[0] || "";
  const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ""));
  
  // Handle Windows-specific command resolution
  if (isWindows && !cmd.includes(".") && !cmd.includes("/") && !cmd.includes("\\")) {
    // Check common Windows executable extensions
    const extensions = ["", ".exe", ".cmd", ".bat"];
    for (const ext of extensions) {
      try {
        Deno.statSync(cmd + ext);
        return { cmd: cmd + ext, args };
      } catch {
        // Continue checking
      }
    }
  }
  
  return { cmd, args };
}

/**
 * Environment variable operations
 */
export const env = {
  /**
   * Get an environment variable
   */
  get(key: string): string | undefined {
    return Deno.env.get(key);
  },

  /**
   * Set an environment variable
   */
  set(key: string, value: string): void {
    Deno.env.set(key, value);
  },

  /**
   * Delete an environment variable
   */
  delete(key: string): void {
    Deno.env.delete(key);
  },

  /**
   * Get all environment variables
   */
  list(): Record<string, string> {
    return Deno.env.toObject();
  },

  /**
   * Check if an environment variable exists
   */
  has(key: string): boolean {
    return Deno.env.has(key);
  },
};

/**
 * Get system information
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const info: SystemInfo = {
    hostname: await getHostname(),
    username: await getUsername(),
    homedir: getHomedir(),
    tmpdir: getTmpdir(),
    platform,
    arch: Deno.build.arch,
  };

  // Try to get additional system info
  try {
    if (isMacOS || isLinux) {
      const release = await exec("uname -r");
      if (release.code === 0) {
        info.release = release.stdout.trim();
      }

      const cpuInfo = await exec("sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null");
      if (cpuInfo.code === 0) {
        info.cpus = parseInt(cpuInfo.stdout.trim());
      }

      if (isMacOS) {
        const memInfo = await exec("sysctl -n hw.memsize");
        if (memInfo.code === 0) {
          info.totalmem = parseInt(memInfo.stdout.trim());
        }
      } else if (isLinux) {
        const memInfo = await exec("grep MemTotal /proc/meminfo | awk '{print $2}'");
        if (memInfo.code === 0) {
          info.totalmem = parseInt(memInfo.stdout.trim()) * 1024; // Convert from KB to bytes
        }
      }
    } else if (isWindows) {
      const cpuInfo = await exec("wmic cpu get NumberOfCores /value");
      if (cpuInfo.code === 0) {
        const match = cpuInfo.stdout.match(/NumberOfCores=(\d+)/);
        if (match) {
          info.cpus = parseInt(match[1]);
        }
      }

      const memInfo = await exec("wmic computersystem get TotalPhysicalMemory /value");
      if (memInfo.code === 0) {
        const match = memInfo.stdout.match(/TotalPhysicalMemory=(\d+)/);
        if (match) {
          info.totalmem = parseInt(match[1]);
        }
      }
    }
  } catch {
    // Ignore errors for optional info
  }

  return info;
}

/**
 * Get hostname
 */
export async function getHostname(): Promise<string> {
  try {
    return Deno.hostname();
  } catch {
    // Fallback for permissions issues
    if (isMacOS || isLinux) {
      const result = await exec("hostname");
      if (result.code === 0) {
        return result.stdout.trim();
      }
    } else if (isWindows) {
      const result = await exec("hostname");
      if (result.code === 0) {
        return result.stdout.trim();
      }
    }
    return "unknown";
  }
}

/**
 * Get current username
 */
export async function getUsername(): Promise<string> {
  // Try environment variables first
  const envUser = env.get("USER") || env.get("USERNAME") || env.get("LOGNAME");
  if (envUser) {
    return envUser;
  }

  // Platform-specific fallbacks
  if (isMacOS || isLinux) {
    const result = await exec("whoami");
    if (result.code === 0) {
      return result.stdout.trim();
    }
  } else if (isWindows) {
    const result = await exec("echo %USERNAME%");
    if (result.code === 0) {
      return result.stdout.trim();
    }
  }

  return "unknown";
}

/**
 * Get home directory
 */
export function getHomedir(): string {
  // Try environment variables
  const home = env.get("HOME") || env.get("USERPROFILE");
  if (home) {
    return home;
  }

  // Platform-specific defaults
  if (isWindows) {
    const homedrive = env.get("HOMEDRIVE") || "C:";
    const homepath = env.get("HOMEPATH") || "\\Users\\Default";
    return homedrive + homepath;
  }

  return "/tmp"; // Fallback
}

/**
 * Get temporary directory
 */
export function getTmpdir(): string {
  // Try environment variables first (cross-platform)
  const tmp = env.get("TMPDIR") || env.get("TMP") || env.get("TEMP");
  if (tmp) {
    return tmp;
  }

  // Platform-specific defaults
  if (isWindows) {
    const userProfile = env.get("USERPROFILE");
    if (userProfile) {
      return `${userProfile}\\AppData\\Local\\Temp`;
    }
    // Fallback for Windows
    return "C:\\Windows\\Temp";
  }

  // Unix-like systems
  return "/tmp";
}

/**
 * Kill a process by PID
 */
export async function kill(pid: number, signal: Deno.Signal = "SIGTERM"): Promise<boolean> {
  try {
    Deno.kill(pid, signal);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.PermissionDenied) {
      // Try platform-specific kill command
      if (isWindows) {
        const result = await exec(`taskkill /F /PID ${pid}`);
        return result.code === 0;
      } else {
        const result = await exec(`kill -${signal.replace("SIG", "")} ${pid}`);
        return result.code === 0;
      }
    }
    return false;
  }
}

/**
 * List running processes
 */
export async function ps(): Promise<ProcessInfo[]> {
  const processes: ProcessInfo[] = [];

  try {
    if (isMacOS) {
      // Use ps with specific format for macOS
      const result = await exec("ps aux");
      if (result.code === 0) {
        const lines = result.stdout.split("\n").slice(1); // Skip header
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 11) {
            processes.push({
              user: parts[0],
              pid: parseInt(parts[1]),
              cpu: parseFloat(parts[2]),
              memory: parseFloat(parts[3]),
              name: parts[10],
              cmd: parts.slice(10).join(" "),
            });
          }
        }
      }
    } else if (isLinux) {
      // Similar to macOS but might need adjustments
      const result = await exec("ps aux");
      if (result.code === 0) {
        const lines = result.stdout.split("\n").slice(1);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 11) {
            processes.push({
              user: parts[0],
              pid: parseInt(parts[1]),
              cpu: parseFloat(parts[2]),
              memory: parseFloat(parts[3]),
              name: parts[10],
              cmd: parts.slice(10).join(" "),
            });
          }
        }
      }
    } else if (isWindows) {
      // Use wmic for Windows
      const result = await exec("wmic process get ProcessId,ParentProcessId,Name,CommandLine,WorkingSetSize /format:csv");
      if (result.code === 0) {
        const lines = result.stdout.split("\n").slice(2); // Skip headers
        for (const line of lines) {
          const parts = line.split(",");
          if (parts.length >= 5) {
            processes.push({
              pid: parseInt(parts[3]),
              ppid: parseInt(parts[2]),
              name: parts[1],
              cmd: parts[0],
              memory: parts[4] ? parseInt(parts[4]) / 1024 : undefined, // Convert to KB
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error listing processes:", error);
  }

  return processes;
}

/**
 * Find processes by name
 */
export async function findProcessesByName(name: string): Promise<ProcessInfo[]> {
  const allProcesses = await ps();
  return allProcesses.filter(p => 
    p.name.toLowerCase().includes(name.toLowerCase()) ||
    (p.cmd && p.cmd.toLowerCase().includes(name.toLowerCase()))
  );
}

/**
 * Check if a process is running
 */
export async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    if (isWindows) {
      const result = await exec(`tasklist /FI "PID eq ${pid}" /NH`);
      return result.code === 0 && !result.stdout.includes("No tasks");
    } else {
      const result = await exec(`ps -p ${pid}`);
      return result.code === 0;
    }
  } catch {
    return false;
  }
}

// Export all functions and interfaces for convenience
export default {
  exec,
  spawn,
  env,
  getSystemInfo,
  getHostname,
  getUsername,
  getHomedir,
  getTmpdir,
  kill,
  ps,
  findProcessesByName,
  isProcessRunning,
  platform,
  isWindows,
  isMacOS,
  isLinux,
};