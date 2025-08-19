// System module - Cross-platform system utilities

import * as platform from "./platform.js";
import { decode } from "./platform.js";

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
  const shell = platform.shell();
  const p = new Deno.Command(shell[0], { 
    args: [...shell.slice(1), cmd] 
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