# HLVM Architecture Assessment & Recommendations

## Current State

### 1. HLVM Binary (Standalone)
- **Size**: 208MB self-contained binary
- **Components**:
  - Embedded Deno runtime (~70MB)
  - Embedded Ollama (~56MB)
  - SQLite persistence layer
  - Modular stdlib (all cross-platform)
- **Works**: ✅ Fully functional as standalone REPL

### 2. macOS App
- **Purpose**: GUI wrapper around HLVM operations
- **Current Integration**: Uses `__HLVM_*__` command strings
- **Problem**: One-way communication via stdout parsing

### 3. Current Command Flow
```
User → macOS App → Sends command → HLVM Binary
                                   ↓
                    HLVM prints __HLVM_COMMAND__
                                   ↓
                    macOS App parses stdout
                                   ↓
                    App performs action
```

## Problems with Current Approach

1. **Fragile**: String parsing is error-prone
2. **One-way**: No real bidirectional communication
3. **Limited**: Can't return values to HLVM
4. **Coupling**: App and binary tightly coupled via magic strings

## Smart Solution: IPC-Based Control API

### Option 1: HTTP Server in HLVM (Recommended)
```javascript
// In HLVM binary
hlvm.app = {
  // Start control server
  server: await startControlServer(port: 11435),
  
  // Control functions that send HTTP requests to macOS app
  spotlight: {
    toggle: () => fetch('http://localhost:11436/spotlight/toggle'),
    show: () => fetch('http://localhost:11436/spotlight/show'),
    hide: () => fetch('http://localhost:11436/spotlight/hide')
  },
  
  chat: {
    toggle: () => fetch('http://localhost:11436/chat/toggle'),
    list: () => fetch('http://localhost:11436/chat/list').then(r => r.json()),
    send: (msg) => fetch('http://localhost:11436/chat/send', {
      method: 'POST',
      body: JSON.stringify({message: msg})
    })
  },
  
  playground: {
    toggle: () => fetch('http://localhost:11436/playground/toggle'),
    eval: (code) => fetch('http://localhost:11436/playground/eval', {
      method: 'POST', 
      body: JSON.stringify({code})
    })
  }
}
```

**Pros**:
- Clean API design
- Bidirectional communication
- Returns values/errors properly
- Works even if app isn't running (graceful failure)
- Can work with other apps/tools

### Option 2: Unix Domain Socket
```javascript
// More efficient for local communication
hlvm.app = {
  socket: new Deno.UnixConnector('/tmp/hlvm.sock'),
  send: (cmd) => socket.write(JSON.stringify(cmd)),
  receive: () => socket.read()
}
```

**Pros**: 
- Faster than HTTP
- More secure (local only)

**Cons**: 
- macOS specific
- More complex implementation

### Option 3: Named Pipes (FIFO)
```javascript
// Simple message passing
hlvm.app = {
  send: (cmd) => Deno.writeTextFile('/tmp/hlvm.fifo', JSON.stringify(cmd)),
  receive: () => Deno.readTextFile('/tmp/hlvm.response.fifo')
}
```

**Pros**: 
- Simple
- Works on all Unix systems

**Cons**: 
- Not as robust as HTTP

## Recommended Implementation Plan

### Phase 1: Keep Current Commands (Compatibility)
- Keep `__HLVM_*__` commands working
- Add deprecation notice

### Phase 2: Add HTTP Control API
```javascript
// src/stdlib/app/control.js
export async function startServer(port = 11435) {
  const server = Deno.serve({port}, (req) => {
    // Handle incoming control requests from macOS app
    const url = new URL(req.url);
    
    if (url.pathname === '/status') {
      return Response.json({
        running: true,
        version: '2.0',
        capabilities: ['spotlight', 'chat', 'playground']
      });
    }
    
    // Handle app events/notifications
    if (url.pathname === '/event') {
      const event = await req.json();
      // Emit to HLVM event system
      hlvm.events.emit(event.type, event.data);
    }
    
    return new Response('OK');
  });
  
  return server;
}

// Control API that talks to macOS app
export const control = {
  async request(endpoint, data = null) {
    try {
      const response = await fetch(`http://localhost:11436${endpoint}`, {
        method: data ? 'POST' : 'GET',
        body: data ? JSON.stringify(data) : null,
        headers: {'Content-Type': 'application/json'}
      });
      return response.json();
    } catch (e) {
      // App not running or not responding
      return {error: 'App not available', message: e.message};
    }
  },
  
  spotlight: {
    toggle: () => control.request('/spotlight/toggle'),
    show: () => control.request('/spotlight/show'),
    hide: () => control.request('/spotlight/hide'),
    search: (query) => control.request('/spotlight/search', {query})
  },
  
  chat: {
    toggle: () => control.request('/chat/toggle'),
    list: () => control.request('/chat/list'),
    send: (message) => control.request('/chat/send', {message}),
    createRoom: (name) => control.request('/chat/room/create', {name}),
    selectRoom: (id) => control.request('/chat/room/select', {id})
  },
  
  playground: {
    toggle: () => control.request('/playground/toggle'),
    eval: (code) => control.request('/playground/eval', {code}),
    fontSize: (delta) => control.request('/playground/font', {delta})
  },
  
  app: {
    preferences: () => control.request('/app/preferences'),
    quit: () => control.request('/app/quit'),
    minimize: () => control.request('/app/minimize'),
    focus: () => control.request('/app/focus')
  }
};
```

### Phase 3: Update macOS App
- Add HTTP server in Swift app (port 11436)
- Keep command parser for compatibility
- Implement new endpoints

### Phase 4: Enhanced Testing
```javascript
// test/test-app-control.js
async function testAppControl() {
  // Check if app is running
  const status = await hlvm.app.control.request('/status');
  if (status.error) {
    console.log('⚠️  App control tests skipped (app not running)');
    return;
  }
  
  // Test each control
  const tests = [
    ['Spotlight toggle', await hlvm.app.spotlight.toggle()],
    ['Chat list', await hlvm.app.chat.list()],
    ['Playground status', await hlvm.app.playground.status()]
  ];
  
  // Verify responses
  for (const [name, result] of tests) {
    console.log(`${result.success ? '✓' : '✗'} ${name}`);
  }
}
```

## Benefits of New Approach

1. **Clean API**: `hlvm.app.spotlight.toggle()` instead of printing magic strings
2. **Bidirectional**: Can get lists, statuses, results
3. **Testable**: Can mock/stub for testing
4. **Decoupled**: App and binary can evolve independently
5. **Multi-app**: Other apps can control HLVM too
6. **Graceful**: Works even if app isn't running

## Migration Path

1. **Now**: Document current command strings
2. **Next**: Implement HTTP control API in HLVM
3. **Then**: Update macOS app to provide HTTP server
4. **Finally**: Deprecate string commands after transition period

## Summary

The best approach is to:
1. Keep HLVM binary as the **brain** (logic, execution)
2. Make macOS app the **UI layer** (visualization, interaction)
3. Connect them via **HTTP API** (clean, testable, extensible)

This makes HLVM truly standalone while allowing rich GUI integration when needed.