# Module Management

HLVM provides generic module management functions that can be used by any UI, including Spotlight.

## Core APIs

### hlvm.modules.save(name, code)

Save a module.

```javascript
// From code string
await hlvm.modules.save('hello', `
  export default function() {
    return "Hello World";
  }
`);

// From file path
await hlvm.modules.save('myapp', '/path/to/app.js');
```

**Parameters:**
- `name` (string) - Module identifier
- `code` (string | filepath) - JavaScript/TypeScript code or path to file

**Returns:** Promise<boolean>

---

### hlvm.modules.remove(name?)

Remove a module or ALL modules.

```javascript
// Remove specific module
await hlvm.modules.remove('oldmodule');

// NUKE: Remove ALL modules (be careful!)
await hlvm.modules.remove();  // No argument = remove everything
```

**Parameters:**
- `name` (string, optional) - Module identifier. If omitted, removes ALL modules.

**Returns:** Promise<boolean>

**Warning:** Calling without arguments removes ALL modules permanently!

---

### hlvm.modules.list()

List all modules.

```javascript
const modules = hlvm.modules.list();
modules.forEach(m => console.log(m.key, m.updatedAt));
```

**Returns:** Array<{key, namespace, filePath, updatedAt}>

---

### hlvm.modules.load(name)

Load and return a module's executable function.

```javascript
// Simple usage - returns the function directly
const fn = await hlvm.modules.load('mymodule');
await fn();  // Execute it

// With parameters
const greet = await hlvm.modules.load('greeter');
await greet('John');
```

**Parameters:**
- `name` (string) - Module identifier

**Returns:** Promise<Function> - The module's default export function, or the module itself if no default

**Note:** If the module has `export default function`, that function is returned directly. Otherwise, the entire module is returned.

---

### hlvm.modules.get(name)

Get module source code.

```javascript
const source = await hlvm.modules.get('mymodule');
console.log(source);
```

**Parameters:**
- `name` (string) - Module identifier

**Returns:** Promise<string> - The bundled source code

---

### hlvm.modules.has(name)

Check if a module exists.

```javascript
if (await hlvm.modules.has('mymodule')) {
  console.log('Module exists');
}
```

**Parameters:**
- `name` (string) - Module identifier

**Returns:** Promise<boolean>

## Module Patterns

### Pattern 1: Export Default Function

```javascript
await hlvm.modules.save('greet', `
  export default async function(name = 'World') {
    await hlvm.notification.alert(\`Hello \${name}!\`);
    return \`Greeted \${name}\`;
  }
`);

// Load and execute
const greet = await hlvm.modules.load('greet');
await greet('John');  // Shows alert "Hello John!"
```

### Pattern 2: Direct Execution

```javascript
await hlvm.modules.save('notify', `
  // This runs immediately when loaded
  await hlvm.notification.notify("Task complete!", "HLVM");
  console.log("Notification sent");
`);

// Loading executes the code
await hlvm.modules.load('notify');  // Shows notification
```

### Pattern 3: Mixed Pattern

```javascript
await hlvm.modules.save('mixed', `
  // Runs on load
  console.log("Module initializing...");
  const config = { version: "1.0" };
  
  // Exported function
  export default function() {
    return config;
  }
`);

// Load and use
const getConfig = await hlvm.modules.load('mixed');  // Logs "Module initializing..."
const config = await getConfig();  // Returns config object
```

## Examples

### Quick Module Creation

```javascript
// Calculator module
await hlvm.modules.save('calc', `
  export default function(a, b, op = '+') {
    switch(op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
    }
  }
`);

// Use it
const calc = await hlvm.modules.load('calc');
console.log(calc(10, 5, '+'));  // 15
console.log(calc(10, 5, '*'));  // 50
```

### Module Management

```javascript
// List all modules
const modules = hlvm.modules.list();
console.log(`${modules.length} modules found`);

// Remove old test modules
for (const mod of modules) {
  if (mod.key.startsWith('test_')) {
    await hlvm.modules.remove(mod.key);
  }
}

// Nuclear option - remove everything
// await hlvm.modules.remove();  // BE CAREFUL!
```

### Error Handling

```javascript
try {
  await hlvm.modules.save('broken', 'invalid {{ syntax');
} catch (error) {
  console.error('Failed to save module:', error.message);
}

try {
  const fn = await hlvm.modules.load('nonexistent');
} catch (error) {
  console.error('Module not found:', error.message);
}
```

## TypeScript Support

```javascript
await hlvm.modules.save('typed', `
  interface User {
    name: string;
    age: number;
  }
  
  export default function(user: User): string {
    return \`\${user.name} is \${user.age} years old\`;
  }
`);

const typed = await hlvm.modules.load('typed');
console.log(typed({ name: 'John', age: 30 }));
```

## Multi-file Projects

When saving from a file path, all imports are bundled:

```javascript
// main.js with imports
await hlvm.modules.save('project', '/path/to/main.js');
// All dependencies are automatically bundled
```

## Storage

Modules are stored in:
- **macOS**: `~/Library/Application Support/HLVM/modules/`
- **Windows**: `%APPDATA%\HLVM\modules\`
- **Linux**: `~/.local/share/HLVM/modules/`

## Integration

Modules saved with `hlvm.modules.save()` are:
- Available to all HLVM UIs (Spotlight, custom apps, etc.)
- Immediately searchable in Spotlight on macOS
- Persistent across HLVM restarts
- Bundled with all dependencies