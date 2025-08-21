/**
 * OS-specific utilities for HLVM
 * Handles platform-specific operations in a clean, modular way
 */

interface OSUtils {
  removeQuarantine(path: string): Promise<void>;
  removeQuarantineOnStartup(): Promise<void>;
  isQuarantined(path: string): Promise<boolean>;
}

/**
 * macOS-specific utilities
 */
class MacOSUtils implements OSUtils {
  /**
   * Remove quarantine attribute from a specific file or directory
   */
  async removeQuarantine(path: string): Promise<void> {
    try {
      const xattr = new Deno.Command("xattr", {
        args: ["-d", "com.apple.quarantine", path],
        stdout: "null",
        stderr: "null"
      });
      await xattr.output();
    } catch {
      // Silently ignore - file might not exist or already be clean
    }
  }

  /**
   * Remove quarantine from all embedded resources on startup
   */
  async removeQuarantineOnStartup(): Promise<void> {
    try {
      const execPath = Deno.execPath();
      const execDir = execPath.substring(0, execPath.lastIndexOf('/'));
      const resourcesPath = `${execDir}/resources`;
      
      // Remove quarantine from specific binaries and entire resources folder
      const paths = [
        `${resourcesPath}/deno`,
        `${resourcesPath}/ollama`,
        resourcesPath // Recursive removal on entire folder
      ];
      
      for (const path of paths) {
        await this.removeQuarantine(path);
        
        // Also try recursive removal for directories
        if (path === resourcesPath) {
          try {
            const xattr = new Deno.Command("xattr", {
              args: ["-cr", path],
              stdout: "null",
              stderr: "null"
            });
            await xattr.output();
          } catch {
            // Silently ignore
          }
        }
      }
    } catch {
      // Silently ignore all errors
    }
  }

  /**
   * Check if a file has quarantine attribute
   */
  async isQuarantined(path: string): Promise<boolean> {
    try {
      const xattr = new Deno.Command("xattr", {
        args: ["-l", path],
        stdout: "piped",
        stderr: "null"
      });
      const output = await xattr.output();
      const text = new TextDecoder().decode(output.stdout);
      return text.includes("com.apple.quarantine");
    } catch {
      return false;
    }
  }
}

/**
 * Generic/fallback implementation for non-macOS platforms
 */
class GenericOSUtils implements OSUtils {
  async removeQuarantine(_path: string): Promise<void> {
    // No-op on non-macOS platforms
  }

  async removeQuarantineOnStartup(): Promise<void> {
    // No-op on non-macOS platforms
  }

  async isQuarantined(_path: string): Promise<boolean> {
    return false;
  }
}

/**
 * Factory function to get the appropriate OS utilities
 */
export function getOSUtils(): OSUtils {
  if (Deno.build.os === "darwin") {
    return new MacOSUtils();
  }
  return new GenericOSUtils();
}

/**
 * Convenience function to remove quarantine on startup
 * Call this at the beginning of your application
 */
export async function initializeOSSecurity(): Promise<void> {
  const osUtils = getOSUtils();
  await osUtils.removeQuarantineOnStartup();
}

/**
 * Convenience function to remove quarantine from extracted binaries
 */
export async function cleanExtractedBinary(path: string): Promise<void> {
  const osUtils = getOSUtils();
  await osUtils.removeQuarantine(path);
}