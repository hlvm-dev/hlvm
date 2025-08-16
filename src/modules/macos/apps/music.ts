/**
 * Apple Music control
 */

export default {
  open: async () => {
    const cmd = new Deno.Command("open", {
      args: ["-a", "Music"]
    });
    await cmd.output();
    return "Opened Music";
  },
  
  play: async () => {
    const script = `tell application "Music" to play`;
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Playing music";
  },
  
  pause: async () => {
    const script = `tell application "Music" to pause`;
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Paused music";
  },
  
  next: async () => {
    const script = `tell application "Music" to next track`;
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Skipped to next track";
  },
  
  previous: async () => {
    const script = `tell application "Music" to previous track`;
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return "Went to previous track";
  },
  
  getCurrentTrack: async () => {
    const script = `tell application "Music"
      if player state is playing then
        set trackName to name of current track
        set artistName to artist of current track
        return trackName & " by " & artistName
      else
        return "Not playing"
      end if
    end tell`;
    
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    const output = await cmd.output();
    const track = new TextDecoder().decode(output.stdout).trim();
    return `Now playing: ${track}`;
  },
  
  setVolume: async (level: number) => {
    const volume = Math.max(0, Math.min(100, level));
    const script = `tell application "Music" to set sound volume to ${volume}`;
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Set volume to ${volume}%`;
  },
  
  shuffle: async (enabled: boolean) => {
    const script = `tell application "Music" to set shuffle enabled to ${enabled}`;
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Shuffle ${enabled ? "enabled" : "disabled"}`;
  },
  
  repeat: async (mode: "off" | "all" | "one") => {
    const script = `tell application "Music" to set song repeat to ${mode}`;
    const cmd = new Deno.Command("osascript", {
      args: ["-e", script]
    });
    await cmd.output();
    return `Repeat mode: ${mode}`;
  }
};