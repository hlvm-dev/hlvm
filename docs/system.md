# hlvm.system

System utilities and command execution.

## Functions

### exec(command)

Execute shell command.

```javascript
const result = await hlvm.system.exec("ls -la");
console.log(result.stdout);
console.log("Exit code:", result.code);
```

**Parameters:**
- `command` (string) - Shell command to execute

**Returns:** Promise<{stdout: string, stderr: string, code: number}>

---

### env(key)

Get environment variable.

```javascript
const path = hlvm.system.env("PATH");
console.log("PATH:", path);
```

**Parameters:**
- `key` (string) - Environment variable name

**Returns:** string | undefined

---

### sleep(ms)

Sleep for specified milliseconds.

```javascript
console.log("Waiting...");
await hlvm.system.sleep(2000); // 2 seconds
console.log("Done!");
```

**Parameters:**
- `ms` (number) - Milliseconds to sleep

**Returns:** Promise<void>

---

### cwd()

Get current working directory.

```javascript
const dir = hlvm.system.cwd();
console.log("Current directory:", dir);
```

**Returns:** string - Current directory path

---

### hostname()

Get system hostname.

```javascript
const host = hlvm.system.hostname();
console.log("Hostname:", host);
```

**Returns:** string - System hostname

## Examples

### Run Shell Commands

```javascript
// List files
const ls = await hlvm.system.exec("ls -la");
console.log(ls.stdout);

// Check git status
const git = await hlvm.system.exec("git status");
if (git.code === 0) {
  console.log("Git status:", git.stdout);
} else {
  console.log("Not a git repository");
}
```

### Environment Variables

```javascript
// Get single variable
const home = hlvm.system.env("HOME");
console.log("Home:", home);

// Get multiple
const env = {
  path: hlvm.system.env("PATH"),
  user: hlvm.system.env("USER"),
  shell: hlvm.system.env("SHELL")
};
console.log(env);
```

### Command with Error Handling

```javascript
async function runCommand(cmd) {
  try {
    const result = await hlvm.system.exec(cmd);
    
    if (result.code !== 0) {
      console.error("Command failed:", result.stderr);
      return false;
    }
    
    console.log("Output:", result.stdout);
    return true;
  } catch (error) {
    console.error("Execution error:", error);
    return false;
  }
}
```

### Delayed Actions

```javascript
async function countdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    console.log(`${i}...`);
    await hlvm.system.sleep(1000);
  }
  console.log("Go!");
}

await countdown(3);
```

### System Info

```javascript
async function getSystemInfo() {
  const info = {
    hostname: hlvm.system.hostname(),
    cwd: hlvm.system.cwd(),
    user: hlvm.system.env("USER"),
    shell: hlvm.system.env("SHELL"),
    os: hlvm.platform.os
  };
  
  // Get more info from commands
  const uptime = await hlvm.system.exec("uptime");
  info.uptime = uptime.stdout.trim();
  
  return info;
}
```

### Background Task Module

```javascript
await hlvm.app.spotlight.modules.add('backup', `
  export default async function() {
    await hlvm.notification.notify("Starting backup...", "Backup");
    
    // Run backup command
    const result = await hlvm.system.exec(
      "tar -czf /tmp/backup.tar.gz ~/Documents"
    );
    
    if (result.code === 0) {
      await hlvm.notification.alert("Backup complete!", "Success");
    } else {
      await hlvm.notification.alert(
        "Backup failed: " + result.stderr,
        "Error"
      );
    }
  }
`);
```

### Command Pipeline

```javascript
async function pipeline(...commands) {
  let input = "";
  
  for (const cmd of commands) {
    const result = await hlvm.system.exec(
      input ? `echo "${input}" | ${cmd}` : cmd
    );
    
    if (result.code !== 0) {
      throw new Error(`Command failed: ${cmd}`);
    }
    
    input = result.stdout;
  }
  
  return input;
}

// Usage
const result = await pipeline(
  "ls -la",
  "grep .js",
  "wc -l"
);
```

### Retry with Delay

```javascript
async function retryCommand(cmd, maxAttempts = 3, delay = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await hlvm.system.exec(cmd);
    
    if (result.code === 0) {
      return result;
    }
    
    console.log(`Attempt ${i + 1} failed, retrying...`);
    await hlvm.system.sleep(delay);
  }
  
  throw new Error(`Command failed after ${maxAttempts} attempts`);
}
```

## Shell Notes

- Commands run in default shell (`/bin/sh` on Unix, `cmd.exe` on Windows)
- Use quotes for paths with spaces
- Exit code 0 indicates success
- Large outputs may be truncated
- Commands run in HLVM's working directory

## Security

- Be careful with user input in commands
- Use quotes to prevent injection
- Validate command results
- Consider using HLVM APIs instead of shell commands when possible