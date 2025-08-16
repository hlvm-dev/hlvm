/**
 * Safari browser control
 */

export default {
  open: async (url: string) => {
    const cmd = new Deno.Command("open", { 
      args: ["-a", "Safari", url] 
    });
    await cmd.output();
    return `Opened ${url} in Safari`;
  },
  
  // Future Safari methods will go here:
  // newTab, getCurrentUrl, reload, etc.
};