# hlvm.computer.fs

File system operations.

## Functions

### read(path)

Read text file content.

```javascript
const content = await hlvm.computer.fs.read('/path/to/file.txt');
```

**Parameters:**
- `path` (string) - File path to read

**Returns:** Promise<string> - File content

---

### write(path, content)

Write text to file.

```javascript
await hlvm.computer.fs.write('/path/to/file.txt', 'Hello World');
```

**Parameters:**
- `path` (string) - File path to write
- `content` (string) - Text content to write

**Returns:** Promise<void>

---

### readBytes(path)

Read binary file as Uint8Array.

```javascript
const bytes = await hlvm.computer.fs.readBytes('/path/to/image.png');
```

**Parameters:**
- `path` (string) - File path to read

**Returns:** Promise<Uint8Array> - Binary data

---

### writeBytes(path, bytes)

Write binary data to file.

```javascript
const data = new Uint8Array([72, 101, 108, 108, 111]);
await hlvm.computer.fs.writeBytes('/path/to/file.bin', data);
```

**Parameters:**
- `path` (string) - File path to write
- `bytes` (Uint8Array) - Binary data to write

**Returns:** Promise<void>

---

### exists(path)

Check if file or directory exists.

```javascript
if (await hlvm.computer.fs.exists('/path/to/check')) {
  console.log('File exists');
}
```

**Parameters:**
- `path` (string) - Path to check

**Returns:** Promise<boolean>

---

### remove(path)

Delete file or directory.

```javascript
await hlvm.computer.fs.remove('/path/to/delete');
```

**Parameters:**
- `path` (string) - Path to delete

**Returns:** Promise<void>

---

### mkdir(path)

Create directory (including parent directories).

```javascript
await hlvm.computer.fs.mkdir('/path/to/new/dir');
```

**Parameters:**
- `path` (string) - Directory path to create

**Returns:** Promise<void>

---

### ls(path)

List directory contents.

```javascript
const files = await hlvm.computer.fs.ls('/path/to/dir');
// Returns: ['file1.txt', 'file2.js', 'subdirectory']
```

**Parameters:**
- `path` (string) - Directory path to list

**Returns:** Promise<string[]> - Array of file/directory names

---

### copy(src, dest)

Copy file or directory.

```javascript
await hlvm.computer.fs.copy('/source/file.txt', '/destination/file.txt');
```

**Parameters:**
- `src` (string) - Source path
- `dest` (string) - Destination path

**Returns:** Promise<void>

---

### move(src, dest)

Move or rename file/directory.

```javascript
await hlvm.computer.fs.move('/old/path', '/new/path');
```

**Parameters:**
- `src` (string) - Source path
- `dest` (string) - Destination path

**Returns:** Promise<void>

## Examples

### Read and Process JSON

```javascript
const data = await hlvm.computer.fs.read('/tmp/data.json');
const parsed = JSON.parse(data);
console.log(parsed);
```

### Backup File

```javascript
const source = '/important/file.txt';
const backup = `/tmp/backup-${Date.now()}.txt`;
await hlvm.computer.fs.copy(source, backup);
```

### List and Filter Files

```javascript
const files = await hlvm.computer.fs.ls('/tmp');
const txtFiles = files.filter(f => f.endsWith('.txt'));
console.log('Text files:', txtFiles);
```

### Safe File Write

```javascript
async function safeWrite(path, content) {
  const backup = `${path}.backup`;
  if (await hlvm.computer.fs.exists(path)) {
    await hlvm.computer.fs.copy(path, backup);
  }
  await hlvm.computer.fs.write(path, content);
}
```