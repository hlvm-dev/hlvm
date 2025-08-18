# Custom Property Persistence

HLVM provides automatic persistence for any custom properties you add to the `hlvm` namespace. This is completely separate from the module system and provides a powerful way to store persistent data.

## How It Works

Any property you assign to `hlvm.*` (except system properties) is automatically saved to SQLite and persists across HLVM sessions.

```javascript
// Save data - automatically persisted
hlvm.myData = { name: "John", age: 30 };
hlvm.settings = { theme: "dark", fontSize: 14 };
hlvm.counter = 42;

// Quit and restart HLVM...

// Data is still there!
console.log(hlvm.myData);   // { name: "John", age: 30 }
console.log(hlvm.settings); // { theme: "dark", fontSize: 14 }
console.log(hlvm.counter);  // 42
```

## Supported Types

### Objects and Arrays
```javascript
hlvm.userProfile = {
  name: "Alice",
  preferences: {
    notifications: true,
    autoSave: false
  }
};

hlvm.todoList = [
  { task: "Write docs", done: true },
  { task: "Test feature", done: false }
];
```

### Primitives
```javascript
hlvm.apiKey = "sk-abc123...";        // String
hlvm.maxRetries = 3;                 // Number
hlvm.debugMode = true;               // Boolean
hlvm.lastRun = new Date().toISOString(); // Date as string
```

### Functions
```javascript
// Even functions can be persisted!
hlvm.greet = function(name) {
  return `Hello, ${name}!`;
};

// After restart:
console.log(hlvm.greet("World")); // "Hello, World!"
```

**Note:** Functions are serialized as strings and recreated with `eval`, so they lose their closure scope.

## Updating Data

```javascript
// Initial save
hlvm.config = { version: 1 };

// Update - automatically persisted
hlvm.config = { version: 2, newField: "value" };

// Modify nested properties (requires reassignment)
const conf = hlvm.config;
conf.version = 3;
hlvm.config = conf; // Reassign to trigger persistence
```

## Deleting Properties

```javascript
// Method 1: Set to null or undefined
hlvm.tempData = null;

// Method 2: Use delete operator
delete hlvm.tempData;

// Both methods remove from database
```

## System Properties (Protected)

These properties cannot be overridden:
- `hlvm.modules`
- `hlvm.db`
- `hlvm.platform`
- `hlvm.system`
- `hlvm.fs`
- `hlvm.clipboard`
- `hlvm.notification`
- `hlvm.screen`
- `hlvm.keyboard`
- `hlvm.mouse`
- `hlvm.ai` (includes `ollama`)
- `hlvm.ui`
- `hlvm.context`
- `hlvm.help`
- `hlvm.status`

Attempting to override them will show an error:
```javascript
hlvm.fs = "something"; // Error: Cannot override system property: hlvm.fs
```

## Storage Details

- **Database**: SQLite at `~/Library/Application Support/HLVM/HLVM.sqlite`
- **Table**: `custom_properties`
- **Schema**: `key`, `value` (JSON), `type`, `updated_at`

## Use Cases

### Application Settings
```javascript
hlvm.appSettings = {
  theme: "dark",
  language: "en",
  shortcuts: {
    save: "Cmd+S",
    open: "Cmd+O"
  }
};
```

### User Preferences
```javascript
hlvm.userPrefs = {
  defaultModel: "llama2",
  maxTokens: 2000,
  temperature: 0.7
};
```

### Cache/State
```javascript
hlvm.cache = {
  lastQuery: "How to use HLVM",
  results: ["result1", "result2"],
  timestamp: Date.now()
};
```

### API Keys and Secrets
```javascript
hlvm.apiKeys = {
  openai: process.env.OPENAI_KEY || "sk-...",
  anthropic: process.env.ANTHROPIC_KEY || "sk-..."
};
```

### Statistics and Counters
```javascript
// Initialize if not exists
if (!hlvm.stats) {
  hlvm.stats = { runs: 0, errors: 0 };
}

// Increment
const stats = hlvm.stats;
stats.runs++;
hlvm.stats = stats; // Reassign to persist
```

## Examples

### Simple Key-Value Store
```javascript
// Save
hlvm.kv = hlvm.kv || {};
const kv = hlvm.kv;
kv["user:123"] = { name: "John", role: "admin" };
hlvm.kv = kv;

// Retrieve
const user = hlvm.kv["user:123"];
```

### Persistent Function Library
```javascript
hlvm.utils = {
  formatDate: function(date) {
    return new Date(date).toLocaleDateString();
  },
  capitalize: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

// Use after restart
console.log(hlvm.utils.capitalize("hello")); // "Hello"
```

### Session Management
```javascript
hlvm.session = {
  user: "alice@example.com",
  token: "jwt-token-here",
  expires: Date.now() + 3600000
};

// Check session
if (hlvm.session && hlvm.session.expires > Date.now()) {
  console.log("Session valid for:", hlvm.session.user);
} else {
  delete hlvm.session;
  console.log("Session expired");
}
```

## Best Practices

1. **Use descriptive names** to avoid conflicts
   ```javascript
   hlvm.myApp_settings = {}; // Good
   hlvm.s = {};              // Bad
   ```

2. **Check existence before using**
   ```javascript
   if (!hlvm.myData) {
     hlvm.myData = { initialized: true };
   }
   ```

3. **Clean up unused properties**
   ```javascript
   delete hlvm.tempWorkspace;
   delete hlvm.debugLogs;
   ```

4. **Reassign after modifying objects**
   ```javascript
   const data = hlvm.myData || {};
   data.newField = "value";
   hlvm.myData = data; // Triggers persistence
   ```

## Limitations

- Functions lose closure scope when persisted
- Large objects may impact performance
- Property names must be valid JavaScript identifiers
- Cannot override system properties
- Maximum SQLite string length applies (1 billion bytes)

## Comparison with Modules

| Feature | Custom Properties | Modules |
|---------|------------------|---------|
| Purpose | Data persistence | Executable code |
| API | `hlvm.myData = ...` | `hlvm.modules.save()` |
| Storage | SQLite table | File system + SQLite |
| Spotlight | ❌ Not searchable | ✅ Searchable |
| Types | Any JSON + functions | JavaScript/TypeScript |
| Use Case | Settings, cache, state | Apps, scripts, tools |

## Debugging

View all custom properties:
```javascript
// In HLVM REPL
Object.keys(hlvm).filter(k => 
  !['modules', 'db', 'platform', 'system', 'fs', 'clipboard', 
   'notification', 'screen', 'keyboard', 'mouse', 'ollama', 
   'ui', 'context', 'help', 'status'].includes(k)
);
```

Clear all custom properties:
```javascript
// WARNING: This removes ALL custom data
const customKeys = Object.keys(hlvm).filter(k => 
  !['modules', 'db', 'platform', 'system', 'fs', 'clipboard', 
   'notification', 'screen', 'keyboard', 'mouse', 'ollama', 
   'ui', 'context', 'help', 'status'].includes(k)
);

customKeys.forEach(key => delete hlvm[key]);
```