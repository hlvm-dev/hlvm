/**
 * Console app control (system logs viewer)
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Console"]
    });
    await cmd.output();
    return "Opened Console";
  },
  
  showAllMessages: async () => {
    const script = `tell application "Console"
      activate
    end tell
    
    tell application "System Events"
      keystroke "0" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing all messages";
  },
  
  showErrors: async () => {
    const script = `tell application "Console"
      activate
    end tell
    
    tell application "System Events"
      keystroke "1" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing errors only";
  },
  
  showFaults: async () => {
    const script = `tell application "Console"
      activate
    end tell
    
    tell application "System Events"
      keystroke "2" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing faults only";
  },
  
  clear: async () => {
    const script = `tell application "Console"
      activate
    end tell
    
    tell application "System Events"
      keystroke "k" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Cleared console";
  },
  
  search: async (query: string) => {
    const script = `tell application "Console"
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