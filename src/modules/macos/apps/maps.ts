/**
 * Maps app control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Maps"]
    });
    await cmd.output();
    return "Opened Maps";
  },
  
  search: async (location: string) => {
    const mapsUrl = `maps://?q=${encodeURIComponent(location)}`;
    const cmd = new Deno.Command("open", {
      args: [mapsUrl]
    });
    await cmd.output();
    return `Searching for: ${location}`;
  },
  
  directions: async (from: string, to: string, mode: "driving" | "walking" | "transit" = "driving") => {
    const mapsUrl = `maps://?saddr=${encodeURIComponent(from)}&daddr=${encodeURIComponent(to)}&dirflg=${mode[0]}`;
    const cmd = new Deno.Command("open", {
      args: [mapsUrl]
    });
    await cmd.output();
    return `Getting ${mode} directions from ${from} to ${to}`;
  },
  
  showLocation: async (latitude: number, longitude: number) => {
    const mapsUrl = `maps://?ll=${latitude},${longitude}`;
    const cmd = new Deno.Command("open", {
      args: [mapsUrl]
    });
    await cmd.output();
    return `Showing location: ${latitude}, ${longitude}`;
  },
  
  showCurrentLocation: async () => {
    const script = `tell application "Maps"
      activate
    end tell
    
    tell application "System Events"
      keystroke "0" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing current location";
  }
};