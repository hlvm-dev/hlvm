#!/bin/bash

# HLVM Test Suite - Tests REPL functions with new hlvm.core.* structure
# Tests actual functionality, not just type checks

echo "╔══════════════════════════════════════════╗"
echo "║         HLVM REPL TEST SUITE            ║"
echo "║      Testing All REPL Functions         ║"
echo "╚══════════════════════════════════════════╝"
echo

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

passed=0
failed=0
total=0

# Use REPL for testing
HLVM="./hlvm"

run_test() {
    local name="$1"
    local code="$2"
    local expected="$3"
    
    ((total++))
    printf "[%3d] %-45s" "$total" "$name"
    
    # Run test and capture output, skip all startup messages
    result=$(echo "$code; Deno.exit(0)" | $HLVM 2>&1 | grep -v "✓\|╔\|║\|╚\|HLVM\|Version\|Virtual Machine" | head -10)
    
    if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}✓${NC}"
        ((passed++))
    else
        echo -e "${RED}✗${NC}"
        echo "      Expected: $expected"
        echo "      Got: $(echo "$result" | head -1)"
        ((failed++))
    fi
}

echo "════════════════════════════════════════════"
echo "SYSTEM MODULE (18 functions)"
echo "════════════════════════════════════════════"

run_test "system.os" "console.log(hlvm.core.system.os)" "darwin\|linux\|windows"
run_test "system.arch" "console.log(hlvm.core.system.arch)" "x86_64\|aarch64\|arm64"
run_test "system.version" "console.log(typeof hlvm.core.system.version)" "string"
run_test "system.isDarwin" "console.log(typeof hlvm.core.system.isDarwin)" "boolean"
run_test "system.isWindows" "console.log(typeof hlvm.core.system.isWindows)" "boolean"
run_test "system.isLinux" "console.log(typeof hlvm.core.system.isLinux)" "boolean"
run_test "system.tempDir()" "console.log(hlvm.core.system.tempDir().includes('/'))" "true"
run_test "system.homeDir()" "console.log(hlvm.core.system.homeDir().startsWith('/'))" "true"
run_test "system.pathSep" "console.log(hlvm.core.system.pathSep)" "/\|\\\\\\\\"
run_test "system.exeExt" "console.log(hlvm.core.system.exeExt.length >= 0)" "true"
run_test "system.shell()" "console.log(Array.isArray(hlvm.core.system.shell()))" "true"
run_test "system.hostname()" "console.log((await hlvm.core.system.hostname()).length > 0)" "true"
run_test "system.exec()" "const r = await hlvm.core.system.exec('echo test'); console.log(r.stdout.trim())" "test"
run_test "system.exit (type)" "console.log(typeof hlvm.core.system.exit)" "function"
run_test "system.pid()" "console.log(hlvm.core.system.pid() > 0)" "true"
run_test "system.cwd()" "console.log(hlvm.core.system.cwd().includes('/'))" "true"
run_test "system.chdir()" "const orig = hlvm.core.system.cwd(); hlvm.core.system.chdir('/tmp'); const changed = hlvm.core.system.cwd(); hlvm.core.system.chdir(orig); console.log(changed)" "/tmp"
run_test "system.env()" "console.log(hlvm.core.system.env('HOME').startsWith('/'))" "true"

echo
echo "════════════════════════════════════════════"
echo "STORAGE ESM (6 functions)"
echo "════════════════════════════════════════════"

run_test "esm.set()" "await hlvm.core.storage.esm.set('testmod', 'export default 42'); console.log('saved')" "saved"
run_test "esm.load()" "const m = await hlvm.core.storage.esm.load('testmod'); console.log(m)" "42"
run_test "esm.list()" "const l = hlvm.core.storage.esm.list(); console.log(l.some(m => m.key === 'testmod'))" "true"
run_test "esm.has()" "console.log(await hlvm.core.storage.esm.has('testmod'))" "true"
run_test "esm.get()" "const src = await hlvm.core.storage.esm.get('testmod'); console.log(src.includes('42'))" "true"
run_test "esm.remove()" "await hlvm.core.storage.esm.remove('testmod'); console.log(await hlvm.core.storage.esm.has('testmod'))" "false"

echo
echo "════════════════════════════════════════════"
echo "IO FILESYSTEM (15 functions)"
echo "════════════════════════════════════════════"

TMP="/tmp/hlvm-test-$$"
run_test "fs.write()" "await hlvm.core.io.fs.write('$TMP.txt', 'hello'); console.log('written')" "written"
run_test "fs.read()" "console.log(await hlvm.core.io.fs.read('$TMP.txt'))" "hello"
run_test "fs.exists()" "console.log(await hlvm.core.io.fs.exists('$TMP.txt'))" "true"
run_test "fs.writeBytes()" "await hlvm.core.io.fs.writeBytes('$TMP.bin', new Uint8Array([72,73])); console.log('written')" "written"
run_test "fs.readBytes()" "const b = await hlvm.core.io.fs.readBytes('$TMP.bin'); console.log(b[0])" "72"
run_test "fs.copy()" "await hlvm.core.io.fs.copy('$TMP.txt', '$TMP-copy.txt'); console.log(await hlvm.core.io.fs.exists('$TMP-copy.txt'))" "true"
run_test "fs.move()" "await hlvm.core.io.fs.move('$TMP-copy.txt', '$TMP-moved.txt'); console.log(await hlvm.core.io.fs.exists('$TMP-moved.txt'))" "true"
run_test "fs.mkdir()" "await hlvm.core.io.fs.mkdir('$TMP-dir'); console.log(await hlvm.core.io.fs.exists('$TMP-dir'))" "true"
run_test "fs.readdir()" "const d = []; for await (const e of hlvm.core.io.fs.readdir('/tmp')) { d.push(e); break; } console.log(d.length > 0)" "true"
run_test "fs.stat()" "const s = await hlvm.core.io.fs.stat('$TMP.txt'); console.log(s.isFile)" "true"
run_test "fs.join()" "console.log(hlvm.core.io.fs.join('a', 'b', 'c'))" "a/b/c"
run_test "fs.dirname()" "console.log(hlvm.core.io.fs.dirname('/a/b/c.txt'))" "/a/b"
run_test "fs.basename()" "console.log(hlvm.core.io.fs.basename('/a/b/c.txt'))" "c.txt"
run_test "fs.extname()" "console.log(hlvm.core.io.fs.extname('file.txt'))" ".txt"
run_test "fs.remove()" "await hlvm.core.io.fs.remove('$TMP.txt'); console.log(await hlvm.core.io.fs.exists('$TMP.txt'))" "false"

# Cleanup
rm -rf $TMP* 2>/dev/null

echo
echo "════════════════════════════════════════════"
echo "IO CLIPBOARD (3 functions)"
echo "════════════════════════════════════════════"

run_test "clipboard.write()" "await hlvm.core.io.clipboard.write('test-clip'); console.log('written')" "written"
run_test "clipboard.read()" "const c = await hlvm.core.io.clipboard.read(); console.log(c.includes('test-clip'))" "true"
run_test "clipboard.isAvailable()" "console.log(await hlvm.core.io.clipboard.isAvailable())" "true"

echo
echo "════════════════════════════════════════════"
echo "COMPUTER CONTEXT (3 properties)"
echo "════════════════════════════════════════════"

# Test selection context - it should return null or string (can't test actual selection in CLI)
run_test "context.selection" "const sel = await hlvm.core.computer.context.selection; console.log(sel === null || typeof sel === 'string')" "true"

# Test screen context - REAL test: capture screen and verify it has actual data
run_test "context.screen.image" "const img = hlvm.core.computer.context.screen.image; console.log(img.length > 1000)" "true"

# Test screen context text returns string (OCR not implemented yet)
run_test "context.screen.text" "const txt = hlvm.core.computer.context.screen.text; console.log(txt.includes('[Screen text extraction pending'))" "true"

echo
echo "════════════════════════════════════════════"
echo "UI NOTIFICATION (4 functions)"
echo "════════════════════════════════════════════"

run_test "notification.notify()" "await hlvm.core.ui.notification.notify('Test', 'HLVM'); console.log('notified')" "notified"
run_test "notification.alert (type)" "console.log(typeof hlvm.core.ui.notification.alert)" "function"
run_test "notification.confirm (type)" "console.log(typeof hlvm.core.ui.notification.confirm)" "function"
run_test "notification.prompt (type)" "console.log(typeof hlvm.core.ui.notification.prompt)" "function"

echo
echo "════════════════════════════════════════════"
echo "COMPUTER SCREEN (2 functions)"
echo "════════════════════════════════════════════"

run_test "screen.capture()" "await hlvm.core.computer.screen.capture('/tmp/hlvm-screen.png'); console.log(await hlvm.core.io.fs.exists('/tmp/hlvm-screen.png'))" "true"
run_test "screen.getScreenSize()" "const sz = await hlvm.core.computer.screen.getScreenSize(); console.log(sz.width > 0)" "true"
rm -f /tmp/hlvm-screen.png

echo
echo "════════════════════════════════════════════"
echo "COMPUTER KEYBOARD (5 functions)"
echo "════════════════════════════════════════════"

run_test "keyboard.type (type)" "console.log(typeof hlvm.core.computer.keyboard.type)" "function"
run_test "keyboard.press (type)" "console.log(typeof hlvm.core.computer.keyboard.press)" "function"
run_test "keyboard.onKeyPress (type)" "console.log(typeof hlvm.core.computer.keyboard.onKeyPress)" "function"
run_test "keyboard.offKeyPress (type)" "console.log(typeof hlvm.core.computer.keyboard.offKeyPress)" "function"
run_test "keyboard.listKeyListeners (type)" "console.log(typeof hlvm.core.computer.keyboard.listKeyListeners)" "function"

# Test array format and listener functionality
run_test "keyboard.press array format" "await hlvm.core.computer.keyboard.press(['space']); console.log('ok')" "ok"
run_test "keyboard listener registration" "const cb = () => {}; hlvm.core.computer.keyboard.onKeyPress(['cmd', 's'], cb); const list = hlvm.core.computer.keyboard.listKeyListeners(); console.log(list.length > 0)" "true"
run_test "keyboard listener removal" "hlvm.core.computer.keyboard.offKeyPress(['cmd', 's']); const list = hlvm.core.computer.keyboard.listKeyListeners(); console.log(list.length === 0)" "true"

echo
echo "════════════════════════════════════════════"
echo "COMPUTER MOUSE (5 functions)"
echo "════════════════════════════════════════════"

run_test "mouse.move (type)" "console.log(typeof hlvm.core.computer.mouse.move)" "function"
run_test "mouse.click (type)" "console.log(typeof hlvm.core.computer.mouse.click)" "function"
run_test "mouse.position()" "const p = await hlvm.core.computer.mouse.position(); console.log(typeof p.x === 'number')" "true"
run_test "mouse.doubleClick (type)" "console.log(typeof hlvm.core.computer.mouse.doubleClick)" "function"
run_test "mouse.drag (type)" "console.log(typeof hlvm.core.computer.mouse.drag)" "function"

echo
echo "════════════════════════════════════════════"
echo "AI OLLAMA (12 functions)"
echo "════════════════════════════════════════════"

run_test "ollama.generate (type)" "console.log(typeof hlvm.core.ai.ollama.generate)" "function"
run_test "ollama.chat (type)" "console.log(typeof hlvm.core.ai.ollama.chat)" "function"
run_test "ollama.list (type)" "console.log(typeof hlvm.core.ai.ollama.list)" "function"
run_test "ollama.show (type)" "console.log(typeof hlvm.core.ai.ollama.show)" "function"
run_test "ollama.pull (type)" "console.log(typeof hlvm.core.ai.ollama.pull)" "function"
run_test "ollama.push (type)" "console.log(typeof hlvm.core.ai.ollama.push)" "function"
run_test "ollama.create (type)" "console.log(typeof hlvm.core.ai.ollama.create)" "function"
run_test "ollama.copy (type)" "console.log(typeof hlvm.core.ai.ollama.copy)" "function"
run_test "ollama.deleteModel (type)" "console.log(typeof hlvm.core.ai.ollama.deleteModel)" "function"
run_test "ollama.embeddings (type)" "console.log(typeof hlvm.core.ai.ollama.embeddings)" "function"
run_test "ollama.ps (type)" "console.log(typeof hlvm.core.ai.ollama.ps)" "function"
run_test "ollama.isRunning()" "console.log(await hlvm.core.ai.ollama.isRunning())" "true\|false"

# Test actual functionality with real model
# Get first available model or use default
MODEL_TEST='const m = (await hlvm.core.ai.ollama.list()).models[0]?.name || "qwen3:0.6b"'

run_test "ollama.isRunning check" "console.log(await hlvm.core.ai.ollama.isRunning())" "true\|false"

run_test "ollama.list() returns models" "const r = await hlvm.core.ai.ollama.list(); console.log(Array.isArray(r.models))" "true"

run_test "ollama.ps() returns models" "const r = await hlvm.core.ai.ollama.ps(); console.log(Array.isArray(r.models))" "true"

# Use actual available model for tests
run_test "ollama.generate() completion" "${MODEL_TEST}; const r = await hlvm.core.ai.ollama.generate({ model: m, prompt: 'OK', stream: false }); console.log(typeof r.response)" "string"

run_test "ollama.generate() streaming" "${MODEL_TEST}; const s = await hlvm.core.ai.ollama.generate({ model: m, prompt: 'Hi', stream: true }); console.log(typeof s.next)" "function"

run_test "ollama.chat() completion" "${MODEL_TEST}; const r = await hlvm.core.ai.ollama.chat({ model: m, messages: [{role: 'user', content: 'Hi'}], stream: false }); console.log(r.message ? true : false)" "true"

run_test "ollama.chat() streaming" "${MODEL_TEST}; const s = await hlvm.core.ai.ollama.chat({ model: m, messages: [{role: 'user', content: 'Hi'}], stream: true }); console.log(typeof s.next)" "function"

run_test "ollama.show() model info" "${MODEL_TEST}; const r = await hlvm.core.ai.ollama.show({ name: m }); console.log(r.license || r.modelfile || r.parameters ? true : false)" "true"

run_test "streaming yields chunks" "${MODEL_TEST}; const s = await hlvm.core.ai.ollama.generate({ model: m, prompt: 'Hi', stream: true }); let c = 0; for await (const chunk of s) { c++; if (c > 2) break; } console.log(c > 0)" "true"

run_test "error handling" "try { await hlvm.core.ai.ollama.generate({ model: 'fake-xyz', prompt: 'test', stream: false }); console.log(false); } catch(e) { console.log(e.message.includes('not found')); }" "true"

echo
echo "════════════════════════════════════════════"
echo "APP CONTROL (7 tests)"
echo "════════════════════════════════════════════"

run_test "app object exists" "console.log(typeof hlvm.app)" "object"
run_test "app.hlvm.connect exists" "console.log(typeof hlvm.app.hlvm.connect)" "function"
run_test "app.hlvm.spotlight exists" "console.log(typeof hlvm.app.hlvm.spotlight)" "object"
run_test "app.hlvm.chat exists" "console.log(typeof hlvm.app.hlvm.chat)" "object"
# New external app control tests
run_test "app.get exists" "console.log(typeof hlvm.app.get)" "function"
run_test "app.list exists" "console.log(typeof hlvm.app.list)" "function"
run_test "app.frontmost exists" "console.log(typeof hlvm.app.frontmost)" "function"

echo
echo "════════════════════════════════════════════"
echo "CUSTOM PROPERTY PERSISTENCE (5 tests)"
echo "════════════════════════════════════════════"

run_test "custom property assignment" "hlvm.mytest = {data: 'hello'}; console.log(hlvm.mytest.data)" "hello"
run_test "custom array assignment" "hlvm.myarray = [1, 2, 3]; console.log(hlvm.myarray[1])" "2"
run_test "custom property update" "hlvm.mytest = {data: 'updated'}; console.log(hlvm.mytest.data)" "updated"
run_test "custom property null removal" "hlvm.mytest = null; console.log(hlvm.mytest)" "null"
run_test "custom property delete" "hlvm.temp = 'test'; delete hlvm.temp; console.log(typeof hlvm.temp)" "undefined"

echo
# Test event observation system (3 functions)
echo "═══ Testing core.event (3 functions) ═══"
run_test "event.observe()" "hlvm.core.event.observe('hlvm.core.io.fs.write', {before: () => {}}); console.log(hlvm.core.event.list().length)" "1"
run_test "event.list()" "console.log(Array.isArray(hlvm.core.event.list()))" "true"
run_test "event.unobserve()" "hlvm.core.event.observe('hlvm.core.io.fs.read', {before: () => {}}); hlvm.core.event.unobserve('hlvm.core.io.fs.read'); console.log(hlvm.core.event.list().filter(o => o.path === 'hlvm.core.io.fs.read').length)" "0"

echo
echo "════════════════════════════════════════════"
echo "ENVIRONMENT SETTINGS (12 tests)"
echo "════════════════════════════════════════════"

# Test basic CRUD operations
run_test "env.set() valid number" "console.log(hlvm.env.set('ai.temperature', 1.2))" "1.2"
run_test "env.get() returns set value" "console.log(hlvm.env.get('ai.temperature'))" "1.2"
run_test "env.has() detects custom" "console.log(hlvm.env.has('ai.temperature'))" "true"

# Test validation - invalid values should be rejected
run_test "env.set() invalid string" "const v = hlvm.env.set('ai.temperature', 'hot'); console.log(v)" "1.2"  # Should keep current
run_test "env.set() out of range" "const v = hlvm.env.set('ai.temperature', 5); console.log(v)" "1.2"  # Should keep current
run_test "env.set() unknown key" "const v = hlvm.env.set('fake.key', 'value'); console.log(v)" "undefined"

# Test get with unknown key
run_test "env.get() unknown key" "console.log(hlvm.env.get('fake.key'))" "undefined"

# Test list returns all settings
run_test "env.list() has all keys" "const e = hlvm.env.list(); console.log(Object.keys(e).length)" "4"  # Should have 4 settings
run_test "env.list() shows defaults" "const e = hlvm.env.list(); console.log(e['ai.model'])" "qwen2.5-coder:1.5b"

# Test reset functionality  
run_test "env.reset() single key" "hlvm.env.reset('ai.temperature'); console.log(hlvm.env.get('ai.temperature'))" "0.7"  # Back to default
run_test "env.has() after reset" "console.log(hlvm.env.has('ai.temperature'))" "false"

# Test show is a function
run_test "env.show (type)" "console.log(typeof hlvm.env.show)" "function"

echo "╔════════════════════════════════════════════╗"
echo "║           TEST RESULTS                   ║"
echo "╚════════════════════════════════════════════╝"
echo
echo "Total tests: $total"
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"
echo -e "Coverage: $(( passed * 100 / total ))%"
echo

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       ✅ ALL TESTS PASSED               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║    ❌ FAILURES DETECTED - FIX REQUIRED    ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
    exit 1
fi