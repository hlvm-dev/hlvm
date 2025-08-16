// System module - Cross-platform system utilities

import * as platform from "./platform.js";

export async function hostname() {
  try {
    // Deno.hostname() works on all platforms since Deno 1.10
    return Deno.hostname();
  } catch {
    // Fallback for older Deno or permission issues
    const p = new Deno.Command("hostname");
    const { stdout } = await p.output();
    return new TextDecoder().decode(stdout).trim();
  }
}

// Remove unused exports - use platform.tempDir() and platform.homeDir() directly

export async function exec(cmd) {
  const shell = platform.shell();
  const p = new Deno.Command(shell[0], { 
    args: [...shell.slice(1), cmd] 
  });
  const { stdout, stderr, code } = await p.output();
  return {
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
    code
  };
}

// Cross-platform process utilities
export function exit(code = 0) {
  Deno.exit(code);
}

export function pid() {
  return Deno.pid;
}

export function cwd() {
  return Deno.cwd();
}

export function chdir(dir) {
  Deno.chdir(dir);
}

export function env(key, value) {
  if (value !== undefined) {
    Deno.env.set(key, value);
  }
  return Deno.env.get(key);
}