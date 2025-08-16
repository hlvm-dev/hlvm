/**
 * System Preferences / System Settings control
 */

export default {
  open: async (pane?: string) => {
    const cmd = new Deno.Command("open", {
      args: pane ? ["-b", "com.apple.preferences", pane] : ["-b", "com.apple.preferences"]
    });
    await cmd.output();
    return pane ? `Opened System Preferences: ${pane}` : "Opened System Preferences";
  },
  
  // Common preference panes
  general: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.preference.general"]
    });
    await cmd.output();
    return "Opened General preferences";
  },
  
  display: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.preference.displays"]
    });
    await cmd.output();
    return "Opened Display preferences";
  },
  
  sound: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.preference.sound"]
    });
    await cmd.output();
    return "Opened Sound preferences";
  },
  
  network: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.preference.network"]
    });
    await cmd.output();
    return "Opened Network preferences";
  },
  
  bluetooth: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.BluetoothSettings"]
    });
    await cmd.output();
    return "Opened Bluetooth preferences";
  },
  
  security: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.preference.security"]
    });
    await cmd.output();
    return "Opened Security & Privacy preferences";
  },
  
  keyboard: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.preference.keyboard"]
    });
    await cmd.output();
    return "Opened Keyboard preferences";
  },
  
  mouse: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.preference.mouse"]
    });
    await cmd.output();
    return "Opened Mouse preferences";
  },
  
  trackpad: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.preference.trackpad"]
    });
    await cmd.output();
    return "Opened Trackpad preferences";
  },
  
  accessibility: async () => {
    const cmd = new Deno.Command("open", {
      args: ["x-apple.systempreferences:com.apple.preference.universalaccess"]
    });
    await cmd.output();
    return "Opened Accessibility preferences";
  }
};