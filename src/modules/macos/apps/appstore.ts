/**
 * Mac App Store control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "App Store"]
    });
    await cmd.output();
    return "Opened App Store";
  },
  
  search: async (query: string) => {
    const searchUrl = `macappstore://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?q=${encodeURIComponent(query)}`;
    const cmd = new Deno.Command("open", {
      args: [searchUrl]
    });
    await cmd.output();
    return `Searching App Store for: ${query}`;
  },
  
  openApp: async (appId: string) => {
    const appUrl = `macappstore://itunes.apple.com/app/id${appId}`;
    const cmd = new Deno.Command("open", {
      args: [appUrl]
    });
    await cmd.output();
    return `Opening app page: ${appId}`;
  },
  
  updates: async () => {
    const cmd = new Deno.Command("open", {
      args: ["macappstore://showUpdatesPage"]
    });
    await cmd.output();
    return "Opened App Store updates";
  },
  
  purchased: async () => {
    const cmd = new Deno.Command("open", {
      args: ["macappstore://showPurchasesPage"]
    });
    await cmd.output();
    return "Opened purchased apps";
  },
  
  checkForUpdates: async () => {
    const script = `tell application "App Store"
      activate
    end tell
    
    tell application "System Events"
      keystroke "r" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Checking for app updates";
  }
};