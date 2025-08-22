# HLVM Architecture & Design Philosophy

## Three-Layer Architecture

HLVM follows a strict three-layer architecture that separates concerns by user type and access level:

### Layer 1: Global Functions (Everyday Users)
**Purpose:** Simple, direct commands for daily use  
**Target:** All users  
**Access:** Global scope - just type and run

```javascript
// AI Operations
ask("What's the weather?")
revise("fix this text")
draw("flowchart of login")
refactor(code)
judge(code)

// Future module operations
save("myTool", code)
load("myTool")
share("myTool")
```

These are blessed functions promoted from deeper layers. Users don't need to know namespaces or navigate complex APIs.

### Layer 2: Standard Library (Power Users)
**Purpose:** High-level, user-facing APIs  
**Target:** Developers who need more control  
**Access:** `hlvm.stdlib.*`

```javascript
// AI functions with options
hlvm.stdlib.ai.ask(prompt, {temperature: 0.9})
hlvm.stdlib.ai.revise(text, {tone: "professional"})

// Future user-facing modules
hlvm.stdlib.modules.save(name, code)
hlvm.stdlib.modules.load(name)
hlvm.stdlib.modules.share(name)
hlvm.stdlib.modules.publish(name)
```

Clean, documented APIs that wrap complex core functionality. This is the public interface of HLVM.

### Layer 3: Core System (Founder/System Level)
**Purpose:** Low-level system access and implementation details  
**Target:** HLVM creator and system internals  
**Access:** `hlvm.core.*`

```javascript
// Raw system access
hlvm.core.storage.db          // Direct SQLite access
hlvm.core.storage.esm.*        // Internal module system
hlvm.core.storage.user.*       // User data persistence
hlvm.core.system.exec()        // System calls
hlvm.core.alias.set()          // Create global functions
```

This layer is NOT meant for end users. It contains implementation details, raw database access, and system internals. Think of it as kernel space - necessary for the system but not for users.

## Design Principles

### 1. Namespace Principle
Every function must exist in a proper namespace first, then optionally be promoted to global:

```javascript
// Step 1: Function exists in proper namespace
hlvm.stdlib.ai.ask = function(prompt) { /* implementation */ }

// Step 2: If useful enough, promote to global
globalThis.ask = hlvm.stdlib.ai.ask

// Step 3: Users can just use the global
ask("Hello")
```

### 2. Progressive Disclosure
Users should discover functionality progressively:
- Start with globals (`ask()`)
- Explore stdlib for more options (`hlvm.stdlib.ai.*`)
- Core is only for system-level needs

### 3. Clear Separation of Concerns

| Layer | For | Example | Mental Model |
|-------|-----|---------|--------------|
| Global | Everyone | `ask()` | Shell commands |
| Stdlib | Developers | `hlvm.stdlib.*` | User libraries |
| Core | System/Founder | `hlvm.core.*` | Kernel/syscalls |

### 4. Different Data Types, Different APIs
Not everything should be unified. Different types need different handling:

```javascript
// User data: Direct property access with auto-persistence
hlvm.myApiKey = "sk-123"
console.log(hlvm.myApiKey)

// Modules: Explicit API for code management
hlvm.stdlib.modules.save("tool", code)
const tool = await hlvm.stdlib.modules.load("tool")

// Settings: Configuration management
hlvm.env.set("ai.model", "gpt-4")
```

## Module System Design

### Current State (Local Only)
Modules are currently stored locally in SQLite with file backing:

```javascript
// Save locally
hlvm.core.storage.esm.set("weather", weatherCode)

// Load from local
hlvm.core.storage.esm.load("weather")
```

### Future Vision (Distributed)

```javascript
// Local (current)
save("weather", code)
load("weather")

// Share via Gist (planned)
share("weather") // → "https://gist.github.com/..."
load("https://gist.github.com/...")

// Registry (planned)
publish("weather") // → Available as @username/weather
load("@username/weather")

// Direct URL (planned)
load("https://example.com/module.js")
```

The module system will support multiple sources while maintaining the same simple API.

## Why This Architecture?

### The OS Analogy
Think of HLVM like an operating system:
- **Globals** = Shell commands (ls, cd, cat)
- **Stdlib** = System libraries (libc, stdlib)
- **Core** = Kernel syscalls (raw system access)

Users don't call kernel syscalls directly - they use commands or libraries!

### The Revelation
Core was never meant for users. The initial confusion came from exposing core APIs to users when they should have been using stdlib or globals. This architecture ensures each user type has the appropriate level of access.

## Implementation Status

### Currently Implemented
- ✅ Global functions (ask, revise, draw, etc.)
- ✅ Core system (all internals)
- ✅ Basic stdlib structure

### Needs Migration
- 🔄 Module operations from core to stdlib
- 🔄 File operations from core.io to stdlib
- 🔄 Proper hiding of internal core APIs

### Future Additions
- 📝 Module sharing via Gist
- 📝 Module registry system
- 📝 URL-based module loading
- 📝 More stdlib APIs wrapping core

## Guidelines for Contributors

1. **Never expose core to users** - Wrap in stdlib first
2. **Follow the namespace principle** - Proper location first, then promote
3. **Keep globals minimal** - Only the most useful functions
4. **Document stdlib extensively** - This is the public API
5. **Hide implementation details** - Users don't need to see internals

## Examples

### Bad (exposing core to users)
```javascript
// User documentation says:
await hlvm.core.storage.esm.set("tool", code)
await hlvm.core.io.fs.read("/file")
```

### Good (proper layering)
```javascript
// User documentation says:
save("tool", code)  // Global for common use
await hlvm.stdlib.fs.read("/file")  // Stdlib for power users
```

The architecture ensures HLVM remains simple for beginners while powerful for advanced users, without exposing unnecessary complexity.