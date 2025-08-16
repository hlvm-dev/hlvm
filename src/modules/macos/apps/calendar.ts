/**
 * Apple Calendar control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Calendar"]
    });
    await cmd.output();
    return "Opened Calendar";
  },
  
  showToday: async () => {
    const script = `tell application "Calendar"
      activate
      view calendar at current date
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Showing today in Calendar";
  },
  
  showDate: async (date: string) => {
    const script = `tell application "Calendar"
      activate
      view calendar at date "${date}"
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Showing ${date} in Calendar`;
  },
  
  createEvent: async (title: string, startDate: string, endDate: string, notes?: string) => {
    const script = `tell application "Calendar"
      tell calendar "Home"
        set newEvent to make new event with properties {summary:"${title}", start date:date "${startDate}", end date:date "${endDate}"${notes ? `, description:"${notes}"` : ''}}
      end tell
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Created event: ${title}`;
  },
  
  getTodayEvents: async () => {
    const script = `tell application "Calendar"
      set todayStart to current date
      set hours of todayStart to 0
      set minutes of todayStart to 0
      set seconds of todayStart to 0
      
      set todayEnd to todayStart + 1 * days
      
      set todayEvents to {}
      repeat with cal in calendars
        set calEvents to (every event of cal whose start date ≥ todayStart and start date < todayEnd)
        repeat with evt in calEvents
          set end of todayEvents to summary of evt
        end repeat
      end repeat
      
      return todayEvents
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    const output = await cmd.output();
    const events = new TextDecoder().decode(output.stdout).trim();
    return `Today's events: ${events || "None"}`;
  }
};