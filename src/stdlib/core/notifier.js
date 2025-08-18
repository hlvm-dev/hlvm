// Cross-platform system notification module
// Notifies other processes about HLVM changes

import * as platform from "./platform.js";

/**
 * Notify system-wide that HLVM modules have changed
 * This allows GUI apps to refresh their module lists in real-time
 */
export async function notifyModulesChanged() {
  try {
    if (platform.isDarwin) {
      // macOS: Use Darwin distributed notifications via Swift
      const cmd = new Deno.Command("swift", {
        args: ["-e", `
          import Foundation
          CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName("com.hlvm.modules.changed" as CFString),
            nil,
            nil,
            true
          )
        `],
        stdout: "null",
        stderr: "null"
      });
      await cmd.output();
      console.log("📢 Notified system: modules changed");
      return true;
      
    } else if (platform.isWindows) {
      // Windows: Could use named pipes or registry events
      // For now, just log
      console.log("📢 Windows notification not implemented yet");
      return false;
      
    } else if (platform.isLinux) {
      // Linux: Could use D-Bus notifications
      try {
        const cmd = new Deno.Command("dbus-send", {
          args: [
            "--system",
            "--type=signal",
            "/com/hlvm/modules",
            "com.hlvm.modules.Changed"
          ],
          stdout: "null",
          stderr: "null"
        });
        await cmd.output();
        console.log("📢 Notified system via D-Bus: modules changed");
        return true;
      } catch {
        console.log("📢 Linux notification failed (D-Bus not available)");
        return false;
      }
      
    } else {
      console.log("📢 Platform notification not supported");
      return false;
    }
  } catch (error) {
    console.error("Failed to send system notification:", error.message);
    return false;
  }
}

/**
 * Notify system about a specific event
 * @param {string} event - Event name (e.g., "module.saved", "module.removed")
 * @param {object} data - Optional event data
 */
export async function notifyEvent(event, data = null) {
  try {
    if (platform.isDarwin) {
      // macOS: Send event-specific notification
      const notificationName = `com.hlvm.${event}`;
      const cmd = new Deno.Command("swift", {
        args: ["-e", `
          import Foundation
          CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName("${notificationName}" as CFString),
            nil,
            ${data ? `["data": "${JSON.stringify(data).replace(/"/g, '\\"')}"] as CFDictionary` : 'nil'},
            true
          )
        `],
        stdout: "null",
        stderr: "null"
      });
      await cmd.output();
      console.log(`📢 Notified system: ${event}`);
      return true;
    }
    // Add other platforms as needed
    return false;
  } catch (error) {
    console.error(`Failed to send ${event} notification:`, error.message);
    return false;
  }
}

// Export convenience functions for common events
export const notifyModuleSaved = (moduleName) => notifyEvent("module.saved", { name: moduleName });
export const notifyModuleRemoved = (moduleName) => notifyEvent("module.removed", { name: moduleName });
export const notifyDatabaseChanged = () => notifyEvent("database.changed");