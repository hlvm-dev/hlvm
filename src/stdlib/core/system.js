// System module - Cross-platform system utilities

import { decode, isWindows } from "./platform.js";

// Shell access helper
function shell() {
  if (isWindows) {
    return ["cmd", "/c"];
  }
  return ["sh", "-c"];
}

export async function hostname() {
  try {
    return Deno.hostname();
  } catch {
    const p = new Deno.Command("hostname");
    const { stdout } = await p.output();
    return decode(stdout).trim();
  }
}

export async function exec(cmd) {
  const shellCmd = shell();
  const p = new Deno.Command(shellCmd[0], { 
    args: [...shellCmd.slice(1), cmd] 
  });
  const { stdout, stderr, code } = await p.output();
  return {
    stdout: decode(stdout),
    stderr: decode(stderr),
    code
  };
}

// Direct exports from Deno
export const exit = Deno.exit;
export const pid = () => Deno.pid;
export const cwd = Deno.cwd;
export const chdir = Deno.chdir;

export function env(key, value) {
  if (value !== undefined) {
    Deno.env.set(key, value);
  }
  return Deno.env.get(key);
}