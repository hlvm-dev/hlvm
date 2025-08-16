/**
 * Photos app control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Photos"]
    });
    await cmd.output();
    return "Opened Photos";
  },
  
  import: async (filePath: string) => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Photos", filePath]
    });
    await cmd.output();
    return `Importing: ${filePath}`;
  },
  
  showLibrary: async () => {
    const script = `tell application "Photos"
      activate
      set visible of every album to false
      set visible of album "Library" to true
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing photo library";
  },
  
  showRecents: async () => {
    const script = `tell application "Photos"
      activate
      set visible of album "Recents" to true
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing recent photos";
  },
  
  showFavorites: async () => {
    const script = `tell application "Photos"
      activate
      set visible of album "Favorites" to true
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing favorite photos";
  },
  
  createAlbum: async (name: string) => {
    const script = `tell application "Photos"
      make new album named "${name}"
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Created album: ${name}`;
  },
  
  startSlideshow: async () => {
    const script = `tell application "Photos"
      activate
      start slideshow
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Started slideshow";
  }
};