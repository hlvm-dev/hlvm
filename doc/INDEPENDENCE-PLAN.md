# HLVM Independence Plan

## What We Have
- ✅ Ollama binary embedded in HLVM
- ✅ Eval-proxy server for module persistence  
- ✅ Deno runtime embedded
- ✅ All stdlib modules

## What Can Be Made Independent

### 1. Chat Operations (HIGH PRIORITY)
**Currently:** Sends `__HLVM_CHAT_ASK__` command to macOS app
**Make Independent:** Direct Ollama API calls

```typescript
// REPLACE THIS:
hlvm.chat.ask = (text) => sendCommand('__HLVM_CHAT_ASK__', text)

// WITH THIS:
hlvm.chat.ask = async (prompt) => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama3.2', // or whatever model is available
      prompt: prompt,
      stream: false
    })
  });
  const data = await response.json();
  return data.response;
}

// Stream version:
hlvm.chat.stream = async function*(prompt) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: prompt,
      stream: true
    })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line) {
        const json = JSON.parse(line);
        yield json.response;
      }
    }
  }
}
```

### 2. Model Management
**Currently:** No model management
**Make Independent:** Add Ollama model operations

```typescript
hlvm.models = {
  list: async () => {
    const res = await fetch('http://localhost:11434/api/tags');
    return (await res.json()).models;
  },
  
  pull: async (model) => {
    const res = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      body: JSON.stringify({ name: model })
    });
    return res.json();
  },
  
  current: 'llama3.2' // configurable default
}
```

### 3. App Launcher
**Currently:** Sends `__HLVM_APP_*__` commands
**Make Independent:** Use `open` command

```typescript
hlvm.app.launch = async (appName) => {
  const cmd = new Deno.Command('open', {
    args: ['-a', appName]
  });
  await cmd.output();
  return `Launched ${appName}`;
}

hlvm.app.openFile = async (path) => {
  const cmd = new Deno.Command('open', {
    args: [path]
  });
  await cmd.output();
}
```

### 4. Notification
**Currently:** Not working
**Make Independent:** Use osascript

```typescript
hlvm.notification.send = async (title, message) => {
  const script = `display notification "${message}" with title "${title}"`;
  const cmd = new Deno.Command('osascript', {
    args: ['-e', script]
  });
  await cmd.output();
}
```

### 5. System Info
**Currently:** Missing `info()` method
**Make Independent:** Gather system data

```typescript
hlvm.system.info = async () => {
  const hostname = await Deno.hostname();
  const memory = Deno.systemMemoryInfo();
  const cpus = navigator.hardwareConcurrency;
  
  return {
    hostname,
    platform: Deno.build.os,
    arch: Deno.build.arch,
    version: Deno.osRelease(),
    memory: memory,
    cpus: cpus,
    homeDir: Deno.env.get("HOME"),
    tempDir: await Deno.makeTempDir(),
    uptime: Deno.osUptime?.() || 'N/A'
  };
}
```

## What MUST Remain macOS App Dependent

### UI Operations (Can't be independent)
- `hlvm.chat.toggle()` - Opens chat panel UI
- `hlvm.spotlight.*` - Spotlight UI window
- `hlvm.settings()` - Settings window
- `hlvm.playground.toggle()` - Playground UI

### Proposed Solution for UI Commands
```typescript
// Detect if running in macOS app or standalone
const IS_STANDALONE = !Deno.env.get("HLVM_MACOS_APP");

hlvm.chat.toggle = () => {
  if (IS_STANDALONE) {
    console.log("💬 Chat UI not available in standalone mode. Use hlvm.chat.ask() directly.");
    return false;
  } else {
    sendCommand('__HLVM_CHAT_TOGGLE__');
    return true;
  }
}
```

## Implementation Priority

### Phase 1: Core Chat (Do First)
1. Replace `hlvm.chat.ask()` with direct Ollama API
2. Add `hlvm.chat.stream()` for streaming responses
3. Add `hlvm.models.*` for model management

### Phase 2: System Integration
1. Fix `hlvm.system.info()`
2. Fix `hlvm.platform.info()`
3. Add `hlvm.notification.send()`
4. Improve `hlvm.app.launch()`

### Phase 3: Graceful Degradation
1. Add environment detection
2. Provide helpful messages for UI operations
3. Document standalone vs macOS app features

## Testing Checklist
- [ ] `hlvm.chat.ask("Hello")` returns Ollama response
- [ ] `hlvm.models.list()` shows available models
- [ ] `hlvm.system.info()` returns system data
- [ ] `hlvm.app.launch("Terminal")` opens Terminal
- [ ] `hlvm.notification.send("Test", "Message")` shows notification
- [ ] UI commands show helpful message in standalone

## Expected Outcome
- **80% independent** - Most operations work standalone
- **20% macOS app** - UI operations only
- **Graceful fallback** - Clear messages when features unavailable