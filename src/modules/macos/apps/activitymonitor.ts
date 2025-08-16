/**
 * Activity Monitor control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Activity Monitor"]
    });
    await cmd.output();
    return "Opened Activity Monitor";
  },
  
  showCPU: async () => {
    const script = `tell application "Activity Monitor"
      activate
    end tell
    
    tell application "System Events"
      keystroke "1" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing CPU usage";
  },
  
  showMemory: async () => {
    const script = `tell application "Activity Monitor"
      activate
    end tell
    
    tell application "System Events"
      keystroke "2" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing Memory usage";
  },
  
  showEnergy: async () => {
    const script = `tell application "Activity Monitor"
      activate
    end tell
    
    tell application "System Events"
      keystroke "3" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing Energy usage";
  },
  
  showDisk: async () => {
    const script = `tell application "Activity Monitor"
      activate
    end tell
    
    tell application "System Events"
      keystroke "4" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing Disk usage";
  },
  
  showNetwork: async () => {
    const script = `tell application "Activity Monitor"
      activate
    end tell
    
    tell application "System Events"
      keystroke "5" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing Network usage";
  },
  
  quitProcess: async (processName: string) => {
    const script = `tell application "Activity Monitor"
      activate
    end tell
    
    tell application "System Events"
      keystroke "f" using {option down, command down}
      delay 0.5
      keystroke "${processName}"
      delay 1
      key code 36
      delay 0.5
      click button "Quit" of sheet 1 of window 1 of process "Activity Monitor"
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Attempting to quit process: ${processName}`;
  }
};