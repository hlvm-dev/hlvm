/**
 * Shortcuts app control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Shortcuts"]
    });
    await cmd.output();
    return "Opened Shortcuts";
  },
  
  run: async (shortcutName: string, input?: string) => {
    const args = ["run-shortcut", shortcutName];
    if (input) {
      args.push("-i", input);
    }
    
    const cmd = new Deno.Command("shortcuts", { args });
    const output = await cmd.output();
    const result = new TextDecoder().decode(output.stdout).trim();
    return result || `Ran shortcut: ${shortcutName}`;
  },
  
  list: async () => {
    const cmd = new Deno.Command("shortcuts", {
      args: ["list"]
    });
    const output = await cmd.output();
    const shortcuts = new TextDecoder().decode(output.stdout).trim();
    return `Available shortcuts:\n${shortcuts}`;
  },
  
  view: async (shortcutName: string) => {
    const cmd = new Deno.Command("shortcuts", {
      args: ["view", shortcutName]
    });
    const output = await cmd.output();
    const details = new TextDecoder().decode(output.stdout).trim();
    return details;
  },
  
  create: async () => {
    const script = `tell application "Shortcuts"
      activate
      make new shortcut
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Creating new shortcut";
  }
};