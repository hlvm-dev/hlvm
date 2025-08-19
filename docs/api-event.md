# HLVM Event Observation API

The event observation system allows you to observe and intercept HLVM function calls, property changes, and file modifications. This is useful for debugging, automation, and building custom developer workflows.

## API Overview

All event functions are available at `hlvm.core.event.*`:

- `observe(target, hooks)` - Start observing a target
- `unobserve(target?)` - Stop observing (all if no target)
- `list()` - List all active observers

## observe(target, hooks)

Observe function calls, property changes, or file modifications.

### Parameters

- `target` (string) - Path to observe. Can be:
  - HLVM path: `'hlvm.core.io.fs.write'`
  - Pattern with wildcard: `'hlvm.core.io.fs.*'`
  - File path: `'/tmp/watch.txt'`

- `hooks` (object) - Observation hooks:
  - `before(args, path)` - Called before function execution
  - `after(result, args, path)` - Called after function execution  
  - `error(error, args, path)` - Called on function error
  - `onChange(event, path)` - Called on property/file change

### Returns

Boolean - `true` if observer was added successfully

### Examples

#### Observe Function Calls

```javascript
// Observe a specific function
hlvm.core.event.observe('hlvm.core.io.fs.write', {
  before: (args) => console.log('Writing file:', args[0]),
  after: (result) => console.log('Write completed')
});

// Intercept and modify arguments
hlvm.core.event.observe('hlvm.core.io.fs.write', {
  before: (args) => {
    console.log('Original path:', args[0]);
    // Modify the path by returning new args
    return ['/tmp/intercepted.txt', args[1]];
  }
});
```

#### Observe File Changes

```javascript
// Watch a file for modifications
hlvm.core.event.observe('/tmp/config.json', {
  onChange: (event) => {
    console.log('File changed:', event.kind);
    // Reload configuration
  }
});
```

#### Observe Pattern (Wildcard)

```javascript
// Observe all filesystem functions
hlvm.core.event.observe('hlvm.core.io.fs.*', {
  before: (args, path) => {
    const funcName = path.split('.').pop();
    console.log(`FS operation: ${funcName}`);
  }
});

// Observe all clipboard operations
hlvm.core.event.observe('hlvm.core.io.clipboard.*', {
  after: (result, args, path) => {
    console.log('Clipboard operation completed');
  }
});
```

#### Error Handling

```javascript
hlvm.core.event.observe('hlvm.core.io.fs.read', {
  error: (error, args, path) => {
    console.error(`Failed to read ${args[0]}:`, error.message);
    // Log to error tracking service
  }
});
```

## unobserve(target?)

Stop observing a target or all targets.

### Parameters

- `target` (string, optional) - Path to stop observing
  - If omitted, removes ALL observers

### Returns

- If target specified: Boolean - `true` if observer was removed
- If no target: Number - Count of removed observers

### Examples

```javascript
// Remove specific observer
hlvm.core.event.unobserve('hlvm.core.io.fs.write');

// Remove pattern observers
hlvm.core.event.unobserve('hlvm.core.io.fs.*');

// Remove all observers
const count = hlvm.core.event.unobserve();
console.log(`Removed ${count} observers`);
```

## list()

List all active observers.

### Returns

Array of observer information objects:
- `path` (string) - The observed path
- `type` (string) - Type: 'function', 'property', or 'file'
- `hooks` (string[]) - Array of hook names

### Example

```javascript
const observers = hlvm.core.event.list();

observers.forEach(observer => {
  console.log(`${observer.path} (${observer.type})`);
  console.log('  Hooks:', observer.hooks.join(', '));
});

// Output:
// hlvm.core.io.fs.write (function)
//   Hooks: before, after
// /tmp/config.json (file)
//   Hooks: onChange
```

## Use Cases

### 1. Development Workflow Automation

```javascript
// Auto-save backups when files are written
hlvm.core.event.observe('hlvm.core.io.fs.write', {
  after: async (result, args) => {
    const [path, content] = args;
    if (path.endsWith('.js')) {
      const backup = path + '.backup';
      await hlvm.core.io.fs.write(backup, content);
      console.log(`Backup created: ${backup}`);
    }
  }
});
```

### 2. Debugging and Logging

```javascript
// Log all database operations
hlvm.core.event.observe('hlvm.core.storage.modules.*', {
  before: (args, path) => {
    const op = path.split('.').pop();
    console.log(`[DB] ${op}:`, args);
  },
  after: (result, args, path) => {
    console.log(`[DB] Result:`, result);
  }
});
```

### 3. Security Monitoring

```javascript
// Monitor sensitive operations
hlvm.core.event.observe('hlvm.core.system.exec', {
  before: (args) => {
    const [command] = args;
    console.warn('Executing command:', command);
    // Could check against allowlist
  }
});
```

### 4. Performance Monitoring

```javascript
// Track function execution time
const timings = new Map();

hlvm.core.event.observe('hlvm.core.io.fs.*', {
  before: (args, path) => {
    timings.set(path, Date.now());
  },
  after: (result, args, path) => {
    const duration = Date.now() - timings.get(path);
    console.log(`${path}: ${duration}ms`);
    timings.delete(path);
  }
});
```

## Limitations

1. **One observer per exact path** - You can only have one observer for a specific path. Setting a new observer overwrites the previous one.

2. **Property observation** - Only works for properties in the HLVM namespace, not arbitrary JavaScript objects.

3. **File watching** - Requires the file to exist when observation starts.

4. **Pattern matching** - Wildcard patterns only work at the end of the path (e.g., `hlvm.core.io.fs.*`).

## Best Practices

1. **Clean up observers** - Always remove observers when done to prevent memory leaks:
   ```javascript
   // In cleanup code
   hlvm.core.event.unobserve();
   ```

2. **Avoid heavy processing** - Keep observer hooks lightweight to avoid impacting performance.

3. **Error handling** - Always include error hooks for critical observations.

4. **Use patterns wisely** - Observing with wildcards can impact performance if many functions match.

## REPL Self-Documentation

All event functions include built-in documentation in the REPL:

```javascript
> hlvm.core.event.observe
// Displays full documentation with examples

> hlvm.core.event.list
// Shows current observer summary
```