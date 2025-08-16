/**
 * Apple Messages (iMessage) control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Messages"]
    });
    await cmd.output();
    return "Opened Messages";
  },
  
  send: async (recipient: string, message: string) => {
    const script = `tell application "Messages"
      set targetService to 1st service whose service type = iMessage
      set targetBuddy to buddy "${recipient}" of targetService
      send "${message}" to targetBuddy
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Sent message to ${recipient}`;
  },
  
  openChat: async (contact: string) => {
    const script = `tell application "Messages"
      activate
      set targetService to 1st service whose service type = iMessage
      set targetBuddy to buddy "${contact}" of targetService
      set targetChat to make new chat with properties {participants:{targetBuddy}}
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Opened chat with ${contact}`;
  },
  
  getUnreadCount: async () => {
    const script = `tell application "Messages"
      set unreadCount to count of chats whose unread is true
      return unreadCount
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    const output = await cmd.output();
    const count = new TextDecoder().decode(output.stdout).trim();
    return `Unread chats: ${count}`;
  },
  
  markAllAsRead: async () => {
    const script = `tell application "Messages"
      repeat with c in chats
        set read status of c to read
      end repeat
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Marked all messages as read";
  }
};