// Platform module - Cross-platform OS information

export const os = Deno.build.os;
export const arch = Deno.build.arch;
export const version = Deno.osRelease();
export const isDarwin = os === "darwin";
export const isWindows = os === "windows";
export const isLinux = os === "linux";
export function tempDir() {
  const envTemp = Deno.env.get("TMPDIR") || 
                  Deno.env.get("TEMP") || 
                  Deno.env.get("TMP");
  if (envTemp) return envTemp;
  
  if (isWindows) {
    const userProfile = Deno.env.get("USERPROFILE");
    if (userProfile) {
      return `${userProfile}\\AppData\\Local\\Temp`;
    }
    return "C:\\Windows\\Temp";
  }
  
  return "/tmp";
}

export function homeDir() {
  if (isWindows) {
    return Deno.env.get("USERPROFILE") || Deno.env.get("HOMEDRIVE") + Deno.env.get("HOMEPATH");
  }
  return Deno.env.get("HOME") || "/";
}

// Path and executable info
export const pathSep = isWindows ? "\\" : "/";
export const exeExt = isWindows ? ".exe" : "";

// Shell access
export function shell() {
  if (isWindows) {
    return ["cmd", "/c"];
  }
  return ["sh", "-c"];
}