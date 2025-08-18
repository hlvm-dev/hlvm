# hlvm.db

Direct SQLite database access and module loading.

## Properties

### path

Get database file path.

```javascript
console.log(hlvm.db.path);
// Output: /Users/username/Library/Application Support/HLVM/HLVM.sqlite
```

**Type:** string

## Functions

### exec(sql)

Execute SQL statement.

```javascript
hlvm.db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");
```

**Parameters:**
- `sql` (string) - SQL statement to execute

**Returns:** void

---

### prepare(sql)

Prepare SQL statement for execution.

```javascript
const stmt = hlvm.db.prepare("SELECT * FROM modules WHERE key = ?");
const row = stmt.get("moduleName");
```

**Parameters:**
- `sql` (string) - SQL statement with optional placeholders (?)

**Returns:** Statement object with methods:
- `get(...params)` - Get single row
- `all(...params)` - Get all rows
- `run(...params)` - Execute statement

---

### load(name)

Load a module from database.

```javascript
const module = await hlvm.db.load("mymodule");
if (module.default) {
  await module.default();
}
```

**Parameters:**
- `name` (string) - Module name

**Returns:** Promise<Module> - Loaded module

---

### list()

List all modules (alias for app.spotlight.modules.list).

```javascript
const modules = hlvm.db.list();
console.log(modules);
```

**Returns:** Array<Module>

---

### remove(name)

Remove module (alias for app.spotlight.modules.remove).

```javascript
await hlvm.db.remove("oldmodule");
```

**Parameters:**
- `name` (string) - Module name

**Returns:** Promise<boolean>

---

### getSource(name)

Get module source code.

```javascript
const source = await hlvm.db.getSource("mymodule");
console.log(source);
```

**Parameters:**
- `name` (string) - Module name

**Returns:** Promise<string> - Module source code

## Database Schema

### modules table

```sql
CREATE TABLE modules (
  key TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  file_path TEXT NOT NULL,
  entry_point TEXT DEFAULT 'default',
  metadata TEXT DEFAULT '{}',
  type TEXT DEFAULT 'javascript',
  updated_at INTEGER NOT NULL,
  spotlight BOOLEAN DEFAULT 1
)
```

### custom_properties table

```sql
CREATE TABLE custom_properties (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)
```

## Examples

### Query Modules

```javascript
// Get all modules
const stmt = hlvm.db.prepare("SELECT * FROM modules");
const modules = stmt.all();
console.log(`Found ${modules.length} modules`);

// Find specific module
const module = hlvm.db.prepare(
  "SELECT * FROM modules WHERE key = ?"
).get("mymodule");
```

### Custom Tables

```javascript
// Create custom table
hlvm.db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Insert data
const insert = hlvm.db.prepare(
  "INSERT INTO tasks (title) VALUES (?)"
);
insert.run("Learn HLVM");

// Query data
const tasks = hlvm.db.prepare(
  "SELECT * FROM tasks WHERE completed = 0"
).all();
```

### Module Management

```javascript
// Get module metadata
const stmt = hlvm.db.prepare(`
  SELECT key, metadata, updated_at 
  FROM modules 
  WHERE spotlight = 1
  ORDER BY updated_at DESC
`);

const recent = stmt.all();
recent.forEach(m => {
  const meta = JSON.parse(m.metadata);
  console.log(`${m.key}: ${meta.createdAt}`);
});
```

### Transaction Example

```javascript
// Use transaction for multiple operations
hlvm.db.exec("BEGIN TRANSACTION");

try {
  hlvm.db.prepare("INSERT INTO table1 VALUES (?)").run("value1");
  hlvm.db.prepare("INSERT INTO table2 VALUES (?)").run("value2");
  hlvm.db.exec("COMMIT");
} catch (error) {
  hlvm.db.exec("ROLLBACK");
  throw error;
}
```

### Custom Properties Access

```javascript
// View all custom properties
const props = hlvm.db.prepare(
  "SELECT * FROM custom_properties"
).all();

props.forEach(p => {
  console.log(`${p.key}: ${p.type} (updated: ${new Date(p.updated_at)})`);
});
```

### Database Statistics

```javascript
function getDatabaseStats() {
  const stats = {
    modules: hlvm.db.prepare(
      "SELECT COUNT(*) as count FROM modules"
    ).get().count,
    
    properties: hlvm.db.prepare(
      "SELECT COUNT(*) as count FROM custom_properties"
    ).get().count,
    
    dbSize: hlvm.computer.fs.exists(hlvm.db.path) ? 
      "File size check" : "Not found",
    
    lastModule: hlvm.db.prepare(
      "SELECT key, updated_at FROM modules ORDER BY updated_at DESC LIMIT 1"
    ).get()
  };
  
  return stats;
}
```

## Storage Location

- **macOS**: `~/Library/Application Support/HLVM/HLVM.sqlite`
- **Windows**: `%APPDATA%\HLVM\HLVM.sqlite`
- **Linux**: `~/.local/share/HLVM/HLVM.sqlite`

## Notes

- Database uses WAL mode for better concurrency
- All module metadata stored as JSON strings
- Timestamps stored as Unix milliseconds
- Database created automatically on first use