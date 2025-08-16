/**
 * Apple Mail control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Mail"]
    });
    await cmd.output();
    return "Opened Mail";
  },
  
  compose: async (to?: string, subject?: string, body?: string) => {
    let mailto = "mailto:";
    if (to) mailto += to;
    
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    
    if (params.length > 0) {
      mailto += "?" + params.join("&");
    }
    
    const cmd = new Deno.Command("open", {
      args: [mailto]
    });
    await cmd.output();
    return `Opened Mail compose window`;
  },
  
  checkMail: async () => {
    const script = `tell application "Mail"
      activate
      check for new mail
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Checking for new mail";
  },
  
  getUnreadCount: async () => {
    const script = `tell application "Mail"
      set unreadCount to 0
      repeat with acc in accounts
        set unreadCount to unreadCount + (unread count of inbox of acc)
      end repeat
      return unreadCount
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    const output = await cmd.output();
    const count = new TextDecoder().decode(output.stdout).trim();
    return `Unread emails: ${count}`;
  },
  
  markAllAsRead: async () => {
    const script = `tell application "Mail"
      set every message of inbox whose read status is false to read status true
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Marked all emails as read";
  }
};