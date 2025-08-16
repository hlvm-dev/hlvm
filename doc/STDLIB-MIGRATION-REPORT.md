# HLVM Stdlib Migration Report

## Current Architecture

### macOS App Architecture
The macOS HLVM app uses a **command-based communication pattern**:

1. **JavaScript (hlvm-stdlib.ts)** sends special commands through stdout:
   - Commands like `__HLVM_CHAT_TOGGLE__`, `__HLVM_SPOTLIGHT_SHOW__`
   - Sent via `Deno.stdout.writeSync()`

2. **Swift (CommandHandler.swift)** intercepts these commands:
   - Parses stdout for command patterns
   - Executes native macOS operations
   - Returns results back to JavaScript context

3. **Platform-specific operations** handled by macOS app:
   - UI operations (chat, spotlight, settings)
   - Screenshot capture
   - Clipboard operations
   - App launching
   - Text editor

## Standalone HLVM Status

### Currently Working ✅
- **Basic modules** that don't require macOS app:
  - `fs` - File system operations (via Deno APIs)
  - `clipboard` - Basic clipboard (via pbcopy/pbpaste)
  - `keyboard` - Keyboard simulation (via AppleScript)
  - `mouse` - Mouse control (via AppleScript)
  - `screen` - Screenshot (via screencapture CLI)

### Not Working ❌ (Requires macOS App)
Commands that output `__HLVM_*__` strings but have no handler:
- `hlvm.chat.*` - Chat UI operations
- `hlvm.spotlight.*` - Spotlight UI
- `hlvm.app.textEdit()` - Text editor UI
- `hlvm.settings()` - Settings UI
- `hlvm.playground.*` - Playground operations

## Migration Options

### Option 1: Full Native Implementation (Recommended)
Replace command strings with actual implementations:

```typescript
// Instead of:
hlvm.chat.toggle = () => sendCommand('__HLVM_CHAT_TOGGLE__')

// Implement:
hlvm.chat.toggle = () => {
  // Launch native chat UI or terminal-based chat
  const chatProcess = new Deno.Command("open", {
    args: ["-a", "Terminal", "chat-ui.sh"]
  }).spawn();
}
```

### Option 2: Hybrid Approach
Detect if running standalone vs in macOS app:

```typescript
const IS_MACOS_APP = Deno.env.get("HLVM_MACOS_APP") === "true";

hlvm.chat.toggle = () => {
  if (IS_MACOS_APP) {
    sendCommand('__HLVM_CHAT_TOGGLE__'); // macOS app handles
  } else {
    // Standalone implementation
    console.log("Chat not available in standalone mode");
  }
}
```

### Option 3: Server-based Architecture
Run a local server that handles UI operations:

```typescript
hlvm.chat.toggle = async () => {
  await fetch('http://localhost:11438/chat/toggle', { method: 'POST' });
}
```

## Implementation Priority

### High Priority (Core Functionality)
1. **Chat integration** - Connect to Ollama for AI chat
2. **File operations** - Already working
3. **Clipboard** - Already working

### Medium Priority (Nice to Have)
1. **Screenshot** - Already working via CLI
2. **App launcher** - Can use `open` command
3. **Keyboard/Mouse** - Already working via AppleScript

### Low Priority (UI-specific)
1. **Spotlight UI** - macOS app specific
2. **Settings UI** - macOS app specific
3. **Playground UI** - macOS app specific

## Recommended Next Steps

1. **Implement native chat**:
   ```typescript
   hlvm.chat.ask = async (prompt: string) => {
     const response = await fetch('http://localhost:11434/api/generate', {
       method: 'POST',
       body: JSON.stringify({ model: 'llama2', prompt })
     });
     return response.json();
   }
   ```

2. **Add environment detection**:
   ```typescript
   const RUNTIME = {
     isStandalone: !Deno.env.get("HLVM_MACOS_APP"),
     hasOllama: await checkOllamaConnection(),
     hasEvalProxy: await checkEvalProxyConnection()
   };
   ```

3. **Create fallback implementations** for UI operations:
   - Terminal-based menus for settings
   - Console output for notifications
   - File-based storage for preferences

## Current Module Comparison

| Module | macOS App | Standalone | Implementation |
|--------|-----------|------------|----------------|
| platform | ✅ Full | ⚠️ Partial | Missing `info()` method |
| system | ✅ Full | ⚠️ Partial | Missing `info()` method |
| fs | ✅ Full | ✅ Full | Deno APIs |
| clipboard | ✅ Full | ✅ Full | pbcopy/pbpaste |
| keyboard | ✅ Full | ✅ Full | AppleScript |
| mouse | ✅ Full | ✅ Full | AppleScript |
| screen | ✅ Full | ✅ Full | screencapture CLI |
| notification | ✅ Full | ❌ None | Needs osascript |
| app | ✅ Full | ❌ None | Needs open command |
| chat | ✅ Full | ❌ None | Needs Ollama integration |
| spotlight | ✅ Full | ❌ None | macOS app only |
| settings | ✅ Full | ❌ None | macOS app only |

## Conclusion

The standalone HLVM can achieve **~70% functionality** without the macOS app by:
1. Using native CLI tools (screencapture, pbcopy, open)
2. Implementing direct Ollama integration for chat
3. Using AppleScript for system automation

Full parity requires either:
- Running alongside the macOS app (current design)
- Implementing native UI components (significant work)
- Creating a local server for UI operations (recommended for standalone)