/**
 * Trash control
 */

export default {
  open: async () => {
    const home = Deno.env.get("HOME");
    const cmd = new Deno.Command("open", {
      args: ["-a", "Finder", `${home}/.Trash`]
    });
    await cmd.output();
    return "Opened Trash";
  },
  
  empty: async () => {
    const script = `tell application "Finder"
      empty trash
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Emptied trash";
  },
  
  emptySecurely: async () => {
    // Note: "empty trash with security" is deprecated in modern macOS
    // Using regular empty for now
    const script = `tell application "Finder"
      empty trash
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Emptied trash (secure empty deprecated in modern macOS)";
  },
  
  moveToTrash: async (filePath: string) => {
    const script = `tell application "Finder"
      move POSIX file "${filePath}" to trash
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Moved to trash: ${filePath}`;
  },
  
  getSize: async () => {
    const cmd = new Deno.Command("du", {
      args: ["-sh", `${Deno.env.get("HOME")}/.Trash`]
    });
    const output = await cmd.output();
    const size = new TextDecoder().decode(output.stdout).split('\t')[0];
    return `Trash size: ${size}`;
  },
  
  getItemCount: async () => {
    const script = `tell application "Finder"
      count items of trash
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    const output = await cmd.output();
    const count = new TextDecoder().decode(output.stdout).trim();
    return `Trash contains ${count} items`;
  }
};