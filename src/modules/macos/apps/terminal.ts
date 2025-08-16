export default {
  open: async (directory?: string) => {
    const args = ["-a", "Terminal"];
    if (directory) {
      args.push(directory);
    }
    const cmd = new Deno.Command("open", { args });
    await cmd.output();
    return directory ? `Opened Terminal at ${directory}` : `Opened Terminal`;
  },
  
  execute: async (command: string) => {
    const script = `tell application "Terminal"
      activate
      do script "${command.replace(/"/g, '\\"')}"
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Executed command in Terminal: ${command}`;
  },
  
  newTab: async () => {
    const script = `tell application "Terminal"
      activate
      tell application "System Events" to keystroke "t" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Opened new Terminal tab`;
  }
};