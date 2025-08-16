/**
 * Books app control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Books"]
    });
    await cmd.output();
    return "Opened Books";
  },
  
  openBook: async (filePath: string) => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Books", filePath]
    });
    await cmd.output();
    return `Opening book: ${filePath}`;
  },
  
  showLibrary: async () => {
    const script = `tell application "Books"
      activate
    end tell
    
    tell application "System Events"
      keystroke "l" using {command down, option down}
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing library";
  },
  
  showCollections: async () => {
    const script = `tell application "Books"
      activate
    end tell
    
    tell application "System Events"
      keystroke "l" using {shift down, command down}
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing collections";
  },
  
  search: async (query: string) => {
    const script = `tell application "Books"
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