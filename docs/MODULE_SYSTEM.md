# HLVM Module System

## Overview

The HLVM module system provides a unified way to save, load, and share JavaScript code across different storage backends and distribution methods.

## Current Features

### Local Module Storage

Save and load JavaScript modules locally using SQLite database with file backing:

```javascript
// Save a module
await save("weather", `
  export default async function(city) {
    const response = await fetch(\`https://wttr.in/\${city}?format=j1\`)
    return response.json()
  }
`)

// Load and use the module
const weather = await load("weather")
const data = await weather("Toronto")
```

### Supported Input Types

The module system intelligently handles different input types:

```javascript
// Function
save("greet", function(name) { 
  return `Hello, ${name}!` 
})

// Arrow function
save("add", (a, b) => a + b)

// String containing code
save("module", "export default () => 'Hello World'")

// File path
save("tool", "./my-tool.js")
```

### Module Management

```javascript
// List all saved modules
const modules = hlvm.core.storage.esm.list()
// Returns: [{key: "weather", namespace: "hlvm.weather", ...}]

// Get source code
const source = await hlvm.core.storage.esm.get("weather")

// Remove a module
await hlvm.core.storage.esm.remove("weather")

// Check if exists
const exists = await hlvm.core.storage.esm.has("weather")
```

## Planned Features

### 1. URL-Based Loading

Load modules directly from any URL:

```javascript
// Load from any URL
const lib = await load("https://esm.sh/lodash")
const tool = await load("https://raw.githubusercontent.com/user/repo/main/tool.js")

// ESM modules work seamlessly
const { utils } = await load("https://unpkg.com/my-utils/index.js")
```

### 2. Gist-Based Sharing

Share modules via GitHub Gist for decentralized distribution:

```javascript
// Share a module (uploads to Gist)
const url = await share("weather")
// → "https://gist.githubusercontent.com/username/abc123/raw/weather.js"

// Others can load it
const weather = await load("https://gist.githubusercontent.com/username/abc123/raw/weather.js")
```

Implementation approach:
- Use GitHub API with user's token
- Create gists with descriptive names
- Return raw URL for direct importing

### 3. Registry System

Centralized registry for discovering and sharing modules:

```javascript
// Publish to registry
await publish("weather")
// Now available as @username/weather

// Load from registry
const weather = await load("@username/weather")

// Search registry
const results = await search("weather")
// → [{name: "@user1/weather", downloads: 1523}, ...]

// Install with version
const tool = await load("@username/tool@1.2.0")
```

Registry features:
- Namespaced packages (`@username/package`)
- Version management
- Download statistics
- Search and discovery
- Documentation hosting

### 4. Smart Loading

Single `load()` function that handles all sources:

```javascript
async function load(identifier) {
  // URL: https://...
  if (identifier.startsWith('http')) {
    return await import(identifier)
  }
  
  // Registry: @user/module
  if (identifier.startsWith('@')) {
    const url = await resolveFromRegistry(identifier)
    return await import(url)
  }
  
  // Local file: ./file.js or /path/to/file
  if (identifier.startsWith('./') || identifier.startsWith('/')) {
    return await import(identifier)
  }
  
  // Local saved module
  if (await hlvm.core.storage.esm.has(identifier)) {
    return await hlvm.core.storage.esm.load(identifier)
  }
  
  throw new Error(`Cannot find '${identifier}'`)
}
```

### 5. Module Bundling

Automatic bundling and dependency resolution using esbuild:

```javascript
// Save with dependencies
save("app", `
  import lodash from "https://esm.sh/lodash"
  import { helper } from "./helper.js"
  
  export default function() {
    return lodash.uniq(helper())
  }
`)

// Dependencies are bundled automatically
const app = await load("app") // Works even offline!
```

## Architecture

### Storage Backends

1. **Local SQLite** (current)
   - Path: `~/Library/Application Support/HLVM/HLVM.sqlite` (macOS)
   - Stores metadata and file references
   - Files saved to `modules/` directory

2. **GitHub Gist** (planned)
   - Decentralized sharing
   - No server required
   - Version history via Git

3. **Registry Server** (planned)
   - Centralized discovery
   - Package management
   - Statistics and analytics

### Module Resolution Order

When loading a module, HLVM checks in this order:

1. **URL** - Direct HTTP/HTTPS imports
2. **Registry** - `@namespace/module` format
3. **Local** - Saved modules in database
4. **File** - Local filesystem paths

### Security Considerations

- **Sandboxing**: Modules run in Deno's secure sandbox
- **Permissions**: Network/filesystem access controlled by Deno
- **Validation**: Code is validated before execution
- **HTTPS Only**: Registry and URL imports require HTTPS

## API Reference

### Current API (Core Level)

```javascript
// Module operations (internal - will be wrapped in stdlib)
hlvm.core.storage.esm.set(name, code)    // Save module
hlvm.core.storage.esm.load(name)         // Load & execute
hlvm.core.storage.esm.get(name)          // Get source code
hlvm.core.storage.esm.list()             // List all modules
hlvm.core.storage.esm.remove(name)       // Delete module
hlvm.core.storage.esm.has(name)          // Check existence
```

### Future API (User Level)

```javascript
// Global functions (promoted from stdlib)
save(name, code)           // Save locally
load(identifier)           // Load from anywhere
share(name)               // Share via Gist
publish(name)             // Publish to registry
search(query)             // Search registry
remove(name)              // Remove local module

// Stdlib functions (more control)
hlvm.stdlib.modules.save(name, code, options)
hlvm.stdlib.modules.load(identifier, options)
hlvm.stdlib.modules.share(name, options)
hlvm.stdlib.modules.publish(name, metadata)
hlvm.stdlib.modules.search(query, filters)
hlvm.stdlib.modules.list(type)
hlvm.stdlib.modules.remove(name)
```

## Examples

### Creating a Reusable Tool

```javascript
// Save a text processing tool
save("slugify", `
  export default function(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
`)

// Use it anywhere
const slugify = await load("slugify")
console.log(slugify("Hello World!")) // → "hello-world"
```

### Sharing with the Community

```javascript
// Create a useful module
save("validator", `
  export function isEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  
  export function isURL(url) {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
`)

// Share it
const url = await share("validator")
console.log(`Shared at: ${url}`)

// Publish to registry
await publish("validator")
console.log("Published as @yourname/validator")
```

### Loading from Multiple Sources

```javascript
// Load from various sources
const lodash = await load("https://esm.sh/lodash")
const myTool = await load("myTool")  // Local
const sharedLib = await load("https://gist.github.com/.../lib.js")
const registryPkg = await load("@user/package")  // Registry

// They all work the same way!
```

## Roadmap

### Phase 1: Foundation (Current)
- ✅ Local module storage
- ✅ Basic save/load operations
- ✅ ESM module support

### Phase 2: Sharing (Q1 2025)
- ⏳ GitHub Gist integration
- ⏳ URL-based loading
- ⏳ Share function

### Phase 3: Registry (Q2 2025)
- 📝 Registry server
- 📝 Publish/search functions
- 📝 Version management

### Phase 4: Advanced (Q3 2025)
- 📝 Dependency management
- 📝 Module bundling optimization
- 📝 Offline mode with caching

## Migration Guide

### From Current Core API to Future Stdlib API

```javascript
// Old (core level)
await hlvm.core.storage.esm.set("tool", code)
const tool = await hlvm.core.storage.esm.load("tool")

// New (user level)
save("tool", code)
const tool = await load("tool")
```

The core API will remain for backward compatibility but users should migrate to the simpler global functions.