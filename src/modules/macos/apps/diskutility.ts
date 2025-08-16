/**
 * Disk Utility control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Disk Utility"]
    });
    await cmd.output();
    return "Opened Disk Utility";
  },
  
  verifyDisk: async (diskName: string) => {
    const script = `tell application "Disk Utility"
      activate
    end tell
    
    tell application "System Events"
      tell process "Disk Utility"
        select row 1 of outline 1 of scroll area 1 of splitter group 1 of window 1 whose value of static text 1 contains "${diskName}"
        click button "First Aid" of toolbar 1 of window 1
      end tell
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Verifying disk: ${diskName}`;
  },
  
  showAllDevices: async () => {
    const script = `tell application "Disk Utility"
      activate
    end tell
    
    tell application "System Events"
      tell process "Disk Utility"
        click menu item "Show All Devices" of menu "View" of menu bar 1
      end tell
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing all devices";
  }
};