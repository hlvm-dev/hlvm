/**
 * Keychain Access control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Keychain Access"]
    });
    await cmd.output();
    return "Opened Keychain Access";
  },
  
  showPasswords: async () => {
    const script = `tell application "Keychain Access"
      activate
    end tell
    
    tell application "System Events"
      tell process "Keychain Access"
        click button "Passwords" of toolbar 1 of window 1
      end tell
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing passwords";
  },
  
  showCertificates: async () => {
    const script = `tell application "Keychain Access"
      activate
    end tell
    
    tell application "System Events"
      tell process "Keychain Access"
        click button "Certificates" of toolbar 1 of window 1
      end tell
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing certificates";
  },
  
  lockKeychain: async (keychainName: string = "login") => {
    const cmd = new Deno.Command("security", {
      args: ["lock-keychain", keychainName]
    });
    await cmd.output();
    return `Locked keychain: ${keychainName}`;
  },
  
  search: async (query: string) => {
    const script = `tell application "Keychain Access"
      activate
    end tell
    
    tell application "System Events"
      keystroke "f" using command down
      delay 0.3
      keystroke "${query}"
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Searching for: ${query}`;
  }
};