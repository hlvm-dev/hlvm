export default {
  open: async (path?: string) => {
    const cmd = new Deno.Command("open", { 
      args: path ? [path] : ["."]
    });
    await cmd.output();
    return path ? `Opened ${path} in Finder` : `Opened current directory in Finder`;
  },
  
  reveal: async (path: string) => {
    const cmd = new Deno.Command("open", { 
      args: ["-R", path]
    });
    await cmd.output();
    return `Revealed ${path} in Finder`;
  },
  
  newWindow: async () => {
    const cmd = new Deno.Command("open", { 
      args: ["-n", "/System/Library/CoreServices/Finder.app"]
    });
    await cmd.output();
    return `Opened new Finder window`;
  }
};