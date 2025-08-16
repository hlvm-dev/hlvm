/**
 * Apple Reminders control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Reminders"]
    });
    await cmd.output();
    return "Opened Reminders";
  },
  
  create: async (title: string, list: string = "Reminders", dueDate?: string) => {
    let script = `tell application "Reminders"
      tell list "${list}"
        set newReminder to make new reminder with properties {name:"${title}"`;
    
    if (dueDate) {
      script += `, due date:date "${dueDate}"`;
    }
    
    script += `}
      end tell
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Created reminder: ${title}`;
  },
  
  complete: async (title: string) => {
    const script = `tell application "Reminders"
      set targetReminder to first reminder whose name is "${title}" and completed is false
      set completed of targetReminder to true
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Completed reminder: ${title}`;
  },
  
  getIncomplete: async () => {
    const script = `tell application "Reminders"
      set incompleteReminders to reminders whose completed is false
      set reminderNames to {}
      repeat with r in incompleteReminders
        set end of reminderNames to name of r
      end repeat
      return reminderNames
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    const output = await cmd.output();
    const reminders = new TextDecoder().decode(output.stdout).trim();
    return `Incomplete reminders: ${reminders || "None"}`;
  },
  
  getDueToday: async () => {
    const script = `tell application "Reminders"
      set todayStart to current date
      set hours of todayStart to 0
      set minutes of todayStart to 0
      set seconds of todayStart to 0
      
      set todayEnd to todayStart + 1 * days
      
      set dueToday to reminders whose due date ≥ todayStart and due date < todayEnd and completed is false
      set reminderNames to {}
      repeat with r in dueToday
        set end of reminderNames to name of r
      end repeat
      return reminderNames
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    const output = await cmd.output();
    const reminders = new TextDecoder().decode(output.stdout).trim();
    return `Due today: ${reminders || "None"}`;
  }
};