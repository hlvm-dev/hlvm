export default {
  open: async (projectPath?: string) => {
    const args = ["-a", "Xcode"];
    if (projectPath) {
      args.push(projectPath);
    }
    const cmd = new Deno.Command("open", { args });
    await cmd.output();
    return projectPath ? `Opened ${projectPath} in Xcode` : `Opened Xcode`;
  },
  
  build: async (scheme: string) => {
    const cmd = new Deno.Command("xcodebuild", {
      args: ["-scheme", scheme, "build"]
    });
    const output = await cmd.output();
    const success = output.code === 0;
    return success ? `Built scheme ${scheme} successfully` : `Failed to build scheme ${scheme}`;
  },
  
  test: async (scheme: string) => {
    const cmd = new Deno.Command("xcodebuild", {
      args: ["-scheme", scheme, "test"]
    });
    const output = await cmd.output();
    const success = output.code === 0;
    return success ? `Tests for ${scheme} passed` : `Tests for ${scheme} failed`;
  },
  
  clean: async (scheme: string) => {
    const cmd = new Deno.Command("xcodebuild", {
      args: ["-scheme", scheme, "clean"]
    });
    await cmd.output();
    return `Cleaned scheme ${scheme}`;
  }
};