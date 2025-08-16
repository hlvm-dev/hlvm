/**
 * Preview app control (for PDFs, images, etc.)
 */

export default {
  open: async (filePath: string) => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Preview", filePath]
    });
    await cmd.output();
    return `Opened ${filePath} in Preview`;
  },
  
  openMultiple: async (filePaths: string[]) => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Preview", ...filePaths]
    });
    await cmd.output();
    return `Opened ${filePaths.length} files in Preview`;
  },
  
  print: async () => {
    const script = `tell application "Preview"
      activate
    end tell
    
    tell application "System Events"
      keystroke "p" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Opened print dialog";
  },
  
  exportAsPDF: async () => {
    const script = `tell application "Preview"
      activate
    end tell
    
    tell application "System Events"
      keystroke "p" using command down
      delay 1
      click menu button "PDF" of sheet 1 of window 1 of process "Preview"
      delay 0.5
      click menu item "Save as PDF…" of menu 1 of menu button "PDF" of sheet 1 of window 1 of process "Preview"
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Exporting as PDF";
  },
  
  rotate: async (direction: "left" | "right") => {
    const shortcut = direction === "left" ? "l" : "r";
    const script = `tell application "Preview"
      activate
    end tell
    
    tell application "System Events"
      keystroke "${shortcut}" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Rotated ${direction}`;
  },
  
  zoom: async (level: "fit" | "actual" | "in" | "out") => {
    let shortcut: string;
    switch (level) {
      case "fit": shortcut = "9"; break;
      case "actual": shortcut = "0"; break;
      case "in": shortcut = "+"; break;
      case "out": shortcut = "-"; break;
    }
    
    const script = `tell application "Preview"
      activate
    end tell
    
    tell application "System Events"
      keystroke "${shortcut}" using command down
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Zoom: ${level}`;
  }
};