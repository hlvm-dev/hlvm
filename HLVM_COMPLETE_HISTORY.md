# HLVM Complete History & Architecture Documentation

## Table of Contents
1. [Vision & Motivation](#vision--motivation)
2. [Timeline & Evolution](#timeline--evolution)
3. [Technical Architecture](#technical-architecture)
4. [Migration Journey](#migration-journey)
5. [Problems Solved](#problems-solved)
6. [Current State](#current-state)
7. [ASCII Flow Diagrams](#ascii-flow-diagrams)

---

## Vision & Motivation

### The Core Vision
"I want ONE place where I can _programmatically_ control EVERYTHING on my computer - files, AI, system, clipboard, everything - and the programmable abstraction should be accessible from anywhere, anytime."

### Why HLVM?
The user's vision was to create a single, self-contained binary that could:
1. **Eliminate dependency hell** - No more managing separate Deno installations, eval-proxy servers, magic strings
2. **Universal access** - "all hlvm binary api interface must be fully also accessible from macOS app and monaco and while macOS app is running overall as background everywhere"
3. **Self-hosted AI** - Include Ollama directly for local LLM capabilities
4. **Simple deployment** - One `make` command to build and deploy everything

---

## Timeline & Evolution

### Phase 1: Initial Architecture (Before Migration)
```
┌─────────────────────────────────────────────────┐
│                 macOS HLVM App                   │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ Deno.swift│  │eval-proxy.ts │  │ stdlib/  │  │
│  └──────────┘  └──────────────┘  └──────────┘  │
│        ↓              ↓                ↓        │
│  ┌──────────────────────────────────────────┐  │
│  │         Magic String Communication       │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Problems with this approach:**
- Deno.swift managing external Deno process
- eval-proxy-server.ts running as separate WebSocket server
- Magic strings for command communication
- Stdlib files loaded at runtime (failed in compiled binary)
- Complex dependency management

### Phase 2: Unified Binary Vision
User's requirement: "can you make script to copy new binary to macOS project and add target so by executing the script, we can test new binary immediately"

The vision evolved to create a single 207MB binary containing:
- HLVM code (~1MB)
- Deno runtime (81MB)
- Ollama (56MB)
- All stdlib modules embedded

### Phase 3: The Stdlib Loading Crisis

**The Breaking Point:**
When running HLVM from terminal: ✅ All 18 stdlib modules available
When running from macOS app: ❌ Only `platform` and `help` available

**Root Cause Discovery:**
```javascript
// hlvm-repl.ts was trying to:
Deno.readTextFile(new URL('./stdlib/...', import.meta.url))
// This worked in development but failed in compiled binary!
```

**User's Frustration:**
- "hlvm spits out only those limited number which is wrong. we have tons of stdlib through hlvm namespace"
- "what? binary is too small.. don't fucking remove ollama and deno in one bundle"
- "I used to have it successfully but you did break it"

### Phase 4: The Embedding Solution

Created `embed-stdlib.ts` to solve the runtime loading issue:
```typescript
// Read all stdlib files at build time
for (const module of stdlibModules) {
  const content = await Deno.readTextFile(fullPath);
  embeddedModules[module.name] = content;
}
// Generate embedded-stdlib.ts with all modules as strings
```

### Phase 5: Build System Simplification

**User's Demand:** "leave only one option: one script only. that's all"

Evolution of build system:
1. Started with multiple scripts (deploy.sh, test-deploy.sh, BUILD.md)
2. User rejected complexity
3. Settled on single Makefile
4. Further simplified by removing timestamp tracking

**Final Makefile:**
```makefile
make        # Builds and deploys everything
make clean  # Cleans build artifacts
make test   # Tests deployed binary
```

---

## Technical Architecture

### Current HLVM Binary Architecture
```
┌──────────────────────────────────────────────────────┐
│                  HLVM Binary (207MB)                 │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │           Embedded Deno Runtime (81MB)         │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │           Embedded Ollama (56MB)               │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │         HLVM Core + Embedded Stdlib            │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │ hlvm-repl.ts - Main entry point          │  │  │
│  │  ├──────────────────────────────────────────┤  │  │
│  │  │ embedded-stdlib.ts (auto-generated)      │  │  │
│  │  ├──────────────────────────────────────────┤  │  │
│  │  │ 18 stdlib modules as embedded strings:   │  │  │
│  │  │ - fs, clipboard, notification, screen    │  │  │
│  │  │ - keyboard, mouse, ollama, system        │  │  │
│  │  │ - platform, database, app controls, etc. │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  Runtime Behavior:                                    │
│  1. Extract Deno & Ollama to temp directory          │
│  2. Write embedded stdlib modules to temp            │
│  3. Start REPL with full hlvm object initialized     │
└──────────────────────────────────────────────────────┘
```

### Integration with macOS App
```
┌─────────────────────────────────────────────────────┐
│                   macOS HLVM App                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │            HLVMBinary.swift                    │ │
│  │  - Replaces old Deno.swift                    │ │
│  │  - Direct stdin/stdout communication           │ │
│  │  - No more magic strings                       │ │
│  └────────────────────────────────────────────────┘ │
│                      ↓                               │
│  ┌────────────────────────────────────────────────┐ │
│  │         HLVM Binary Process                    │ │
│  │    (Resources/hlvm - 207MB)                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Features:                                          │
│  • Monaco Editor with HLVM autocomplete             │
│  • REPL UI with markdown rendering                  │
│  • Full access to all 18 stdlib modules             │
│  • Local Ollama for AI capabilities                 │
└─────────────────────────────────────────────────────┘
```

---

## Migration Journey

### What Was Deleted (Intentionally)
```
D HLVM/Feature/Domain/HlvmPlayground/Eval/Deno.swift
D HLVM/Feature/Domain/HlvmPlayground/Eval/EvalProxy/eval-proxy-server.ts
D HLVM/Feature/Domain/HlvmPlayground/Eval/CommandHandling/CommandHandler.swift
D HLVM/Feature/Domain/HlvmPlayground/Eval/CommandHandling/HLVMCommands.swift
D HLVM/Feature/Domain/HlvmPlayground/Eval/stdlib/HlvmStandardLibrary.swift
D HLVM/Resources/JavaScript/hlvm-stdlib.ts
D HLVM/Resources/JavaScript/modules/*.ts (all individual module files)
```

### What Was Added
```
A HLVM/Feature/Domain/HlvmPlayground/Eval/HLVMBinary.swift
A HLVM/Resources/hlvm (207MB binary)
A /Users/seoksoonjang/Desktop/hlvm/ (build project)
  - Makefile
  - src/hlvm-repl.ts
  - src/embed-stdlib.ts
  - src/stdlib/* (source modules)
  - resources/deno (81MB)
  - resources/ollama (56MB)
```

### Key Technical Decisions

1. **Embedding vs Runtime Loading**
   - Problem: `Deno.readTextFile()` failed in compiled binary
   - Solution: Embed all stdlib as TypeScript strings at compile time

2. **Binary Size (207MB)**
   - User insisted: "don't fucking remove ollama and deno in one bundle"
   - Used `--include resources/deno --include resources/ollama` flags

3. **Build System**
   - User demanded: "leave only one option: one script only"
   - Solution: Single Makefile with simple `make` command

4. **Timestamp Removal**
   - User: "if verified already, timestamp is not needed"
   - Removed all timestamp tracking code

---

## Problems Solved

### 1. Multiline Output Display Issue
**Problem:** When typing `hlvm` in Monaco editor, only showed `=> {` instead of full object

**Investigation Flow:**
```
HLVM Binary (hlvm-repl.ts)
    ↓ Returns full multiline object
HLVMBinary.swift eval()
    ↓ Was only taking first line: "{"
BaseCodeEditorModel makeEvalMessage()
    ↓ Adds "=> " prefix
UI displays: "=> {"
```

**Solution:** Modified HLVMBinary.swift to collect complete multiline objects:
```swift
// Track brace count to collect complete objects
if !collectingObject && (trimmed == "{" || trimmed.hasPrefix("{")) {
    collectingObject = true
    // Keep collecting until braceCount == 0
}
```

### 2. HLVM Object Not Loading in macOS App
**Symptoms:**
- Terminal: ✅ 18 properties available
- macOS app: ❌ Only platform and help

**Root Cause:** Timing issue - eval called before REPL fully initialized

**Solution:** Added initialization delay and verification:
```swift
// Wait for REPL to fully initialize
try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
// Verify hlvm object properties are loaded
let properties = await self?.eval(javascript: "Object.keys(hlvm).length")
```

### 3. WebSocket vs stdin/stdout
**Original:** Complex WebSocket + JSON-RPC communication
**Current:** Simple stdin/stdout pipe communication
**Benefit:** Eliminated entire proxy server layer

---

## Current State

### What Works
✅ Single 207MB self-contained HLVM binary
✅ All 18 stdlib modules accessible everywhere
✅ One-command build/deploy: `make`
✅ Multiline object display in UI
✅ Local Ollama integration
✅ No external dependencies

### File Structure
```
/Users/seoksoonjang/Desktop/hlvm/
├── Makefile              # Single build script
├── resources/
│   ├── deno             # Deno binary (81MB)
│   └── ollama           # Ollama binary (56MB)
└── src/
    ├── hlvm-repl.ts     # Main entry point
    ├── embed-stdlib.ts  # Embedding script
    ├── hlvm-init.js     # Initialization
    ├── hlvm-bridge.ts   # Bridge functionality
    └── stdlib/          # Source modules
        ├── core/
        ├── fs/
        ├── io/
        ├── computer/
        ├── ai/
        └── app/

/Users/seoksoonjang/dev/HLVM/
└── HLVM/
    ├── Resources/
    │   └── hlvm         # Deployed binary (207MB)
    └── Feature/Domain/HlvmPlayground/Eval/
        └── HLVMBinary.swift  # Swift integration
```

### The 18 HLVM Stdlib Modules
1. **save** - Save modules to database
2. **load** - Load saved modules
3. **list** - List saved modules
4. **remove** - Remove modules
5. **db** - Direct SQLite access
6. **platform** - OS information
7. **system** - System operations
8. **fs** - File system operations
9. **clipboard** - Clipboard access
10. **notification** - System notifications
11. **screen** - Screen capture
12. **keyboard** - Keyboard control
13. **mouse** - Mouse control
14. **ollama** - Local LLM
15. **ask** - AI chat shortcut
16. **app** - macOS app control
17. **startBridge** - WebSocket bridge
18. **help** - Help information
19. **status** - System status

---

## ASCII Flow Diagrams

### Build Flow
```
┌─────────────┐
│   make      │
└──────┬──────┘
       ↓
┌──────────────────────────────┐
│  1. Run embed-stdlib.ts      │
│     → Read all stdlib files  │
│     → Generate embedded.ts   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  2. Deno compile              │
│     --include resources/deno │
│     --include resources/ollama│
│     → Creates 207MB binary   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  3. Deploy to macOS project  │
│     cp hlvm → Resources/hlvm │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  4. Verify deployment         │
│     Test stdlib availability │
└──────────────────────────────┘
```

### Runtime Flow
```
User Types in Monaco Editor
            ↓
    HLVMBinary.swift
            ↓
    Process.stdin.write()
            ↓
    hlvm binary (REPL)
            ↓
    JavaScript Evaluation
            ↓
    Process.stdout.read()
            ↓
    Parse Output
    (Handle multiline)
            ↓
    BaseCodeEditorModel
    (Add "=> " prefix)
            ↓
    NotificationCenter
            ↓
    ReplLogViewModel
            ↓
    MarkdownView (UI)
```

### Communication Flow (Before vs After)
```
BEFORE:
Monaco → Deno.swift → Magic Strings → eval-proxy → WebSocket → Response

AFTER:
Monaco → HLVMBinary.swift → stdin/stdout → hlvm binary → Response
```

---

## Lessons Learned

1. **User's Requirements Are Absolute**
   - "don't touch what I didn't ask. touch what I ask only"
   - "leave only one option: one script only"
   - "don't fucking remove ollama and deno in one bundle"

2. **Simplicity Wins**
   - Removed timestamp tracking when not needed
   - Single Makefile instead of multiple scripts
   - Direct stdin/stdout instead of WebSocket complexity

3. **Test Everything**
   - Binary size verification (must be 207MB)
   - Module count verification (must be 18+)
   - Both terminal and app contexts

4. **Embedding Is Reliable**
   - Runtime file loading fails in compiled binaries
   - Embedding as strings always works
   - Trade-off: Larger binary but guaranteed availability

---

## For Future AI/Developers

### Quick Start
```bash
cd /Users/seoksoonjang/Desktop/hlvm
make  # Builds and deploys everything
```

### If You Need To:
- **Add new stdlib module**: Add to `src/stdlib/`, update `embed-stdlib.ts`
- **Debug output issues**: Check HLVMBinary.swift parsing logic
- **Change binary location**: Update paths in Makefile
- **Test binary directly**: `/Users/seoksoonjang/dev/HLVM/HLVM/Resources/hlvm`

### Critical Files
1. `/Users/seoksoonjang/Desktop/hlvm/Makefile` - Build system
2. `/Users/seoksoonjang/Desktop/hlvm/src/hlvm-repl.ts` - Main binary
3. `/Users/seoksoonjang/dev/HLVM/HLVM/Feature/Domain/HlvmPlayground/Eval/HLVMBinary.swift` - macOS integration

### Don't Break These
- Binary must be 207MB (contains Deno + Ollama)
- All 18 stdlib modules must be accessible
- `make` must be the only command needed
- Multiline object parsing must work

---

## Final Note

This entire journey was about creating a truly unified, self-contained runtime that brings together JavaScript execution, AI capabilities, and native macOS integration into a single binary. The vision has been achieved: **one binary, one command, everything included**.

The user's mantra throughout: **"Simple is best. Don't over-engineer."**