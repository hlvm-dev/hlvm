# hlvm.platform

Platform and system information.

## Properties

### os

Operating system identifier.

```javascript
console.log(hlvm.platform.os);
// "darwin" (macOS), "windows", or "linux"
```

**Type:** string

---

### arch

CPU architecture.

```javascript
console.log(hlvm.platform.arch);
// "x64" or "arm64"
```

**Type:** string

---

### isDarwin

Check if running on macOS.

```javascript
if (hlvm.platform.isDarwin) {
  console.log("Running on macOS");
}
```

**Type:** boolean

---

### isWindows

Check if running on Windows.

```javascript
if (hlvm.platform.isWindows) {
  console.log("Running on Windows");
}
```

**Type:** boolean

---

### isLinux

Check if running on Linux.

```javascript
if (hlvm.platform.isLinux) {
  console.log("Running on Linux");
}
```

**Type:** boolean

## Functions

### homeDir()

Get user's home directory.

```javascript
const home = hlvm.platform.homeDir();
console.log(home); // "/Users/username" or "C:\Users\username"
```

**Returns:** string - Home directory path

---

### tempDir()

Get system temp directory.

```javascript
const temp = hlvm.platform.tempDir();
console.log(temp); // "/tmp" or "C:\Users\username\AppData\Local\Temp"
```

**Returns:** string - Temp directory path

---

### pathSep

Get platform-specific path separator.

```javascript
const sep = hlvm.platform.pathSep;
console.log(sep); // "/" on Unix, "\" on Windows
```

**Type:** string

## Examples

### Platform-Specific Paths

```javascript
function getConfigPath() {
  if (hlvm.platform.isDarwin) {
    return `${hlvm.platform.homeDir()}/Library/Preferences/myapp.json`;
  } else if (hlvm.platform.isWindows) {
    return `${hlvm.platform.homeDir()}\\AppData\\Roaming\\myapp.json`;
  } else {
    return `${hlvm.platform.homeDir()}/.config/myapp.json`;
  }
}
```

### Cross-Platform File Path

```javascript
function buildPath(...parts) {
  return parts.join(hlvm.platform.pathSep);
}

const path = buildPath(
  hlvm.platform.homeDir(),
  'Documents',
  'myfile.txt'
);
```

### Platform Detection

```javascript
function getPlatformName() {
  switch (hlvm.platform.os) {
    case 'darwin':
      return 'macOS';
    case 'windows':
      return 'Windows';
    case 'linux':
      return 'Linux';
    default:
      return 'Unknown';
  }
}

console.log(`Running on ${getPlatformName()}`);
```

### Architecture Check

```javascript
if (hlvm.platform.arch === 'arm64') {
  console.log("Running on Apple Silicon or ARM");
} else if (hlvm.platform.arch === 'x64') {
  console.log("Running on Intel/AMD 64-bit");
}
```

### Temp File Creation

```javascript
async function createTempFile(prefix = 'hlvm') {
  const tempDir = hlvm.platform.tempDir();
  const fileName = `${prefix}-${Date.now()}.txt`;
  const path = `${tempDir}${hlvm.platform.pathSep}${fileName}`;
  
  await hlvm.fs.write(path, '');
  return path;
}
```

### Platform-Specific Features

```javascript
async function openFile(path) {
  if (hlvm.platform.isDarwin) {
    await hlvm.system.exec(`open "${path}"`);
  } else if (hlvm.platform.isWindows) {
    await hlvm.system.exec(`start "${path}"`);
  } else {
    await hlvm.system.exec(`xdg-open "${path}"`);
  }
}
```

### System Info Module

```javascript
await hlvm.app.spotlight.modules.add('sysinfo', `
  export default async function() {
    const info = {
      OS: hlvm.platform.os,
      Architecture: hlvm.platform.arch,
      Home: hlvm.platform.homeDir(),
      Temp: hlvm.platform.tempDir(),
      Separator: hlvm.platform.pathSep
    };
    
    await hlvm.notification.alert(
      JSON.stringify(info, null, 2),
      "System Information"
    );
  }
`);
```

## Platform Values

### OS Values
- `"darwin"` - macOS
- `"windows"` - Windows
- `"linux"` - Linux
- `"freebsd"` - FreeBSD
- `"openbsd"` - OpenBSD

### Architecture Values
- `"x64"` - 64-bit Intel/AMD
- `"arm64"` - 64-bit ARM (Apple Silicon, etc.)
- `"x86"` - 32-bit Intel/AMD (rare)

## Notes

- Platform detection is done at startup
- Values are read-only
- Path separators are critical for cross-platform compatibility