/**
 * Apple Notes control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Notes"]
    });
    await cmd.output();
    return "Opened Notes";
  },
  
  create: async (title: string, body: string) => {
    const script = `tell application "Notes"
      activate
      set newNote to make new note with properties {name:"${title}", body:"${body}"}
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Created note: ${title}`;
  },
  
  search: async (query: string) => {
    const script = `tell application "Notes"
      activate
      set searchResults to notes whose name contains "${query}" or body contains "${query}"
      set resultCount to count of searchResults
      return resultCount
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    const output = await cmd.output();
    const count = new TextDecoder().decode(output.stdout).trim();
    return `Found ${count} notes matching "${query}"`;
  },
  
  append: async (noteTitle: string, text: string) => {
    const script = `tell application "Notes"
      set targetNote to first note whose name is "${noteTitle}"
      set body of targetNote to body of targetNote & "\\n\\n" & "${text}"
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Appended to note: ${noteTitle}`;
  },
  
  listRecent: async (count: number = 5) => {
    const script = `tell application "Notes"
      set recentNotes to notes 1 thru ${count}
      set noteNames to {}
      repeat with n in recentNotes
        set end of noteNames to name of n
      end repeat
      return noteNames
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    const output = await cmd.output();
    const notes = new TextDecoder().decode(output.stdout).trim();
    return `Recent notes: ${notes}`;
  }
};