#!/bin/bash

# HLVM Test Suite - Tests REPL functions
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
echo "PLATFORM MODULE (11 functions)"
echo "════════════════════════════════════════════"

run_test "platform.os" "console.log(hlvm.platform.os)" "darwin\|linux\|windows"
run_test "platform.arch" "console.log(hlvm.platform.arch)" "x86_64\|aarch64\|arm64"
run_test "platform.version" "console.log(typeof hlvm.platform.version)" "string"
run_test "platform.isDarwin" "console.log(typeof hlvm.platform.isDarwin)" "boolean"
run_test "platform.isWindows" "console.log(typeof hlvm.platform.isWindows)" "boolean"
run_test "platform.isLinux" "console.log(typeof hlvm.platform.isLinux)" "boolean"
run_test "platform.tempDir()" "console.log(hlvm.platform.tempDir().includes('/'))" "true"
run_test "platform.homeDir()" "console.log(hlvm.platform.homeDir().startsWith('/'))" "true"
run_test "platform.pathSep" "console.log(hlvm.platform.pathSep)" "/\|\\\\\\\\"
run_test "platform.exeExt" "console.log(hlvm.platform.exeExt.length >= 0)" "true"
run_test "platform.shell()" "console.log(Array.isArray(hlvm.platform.shell()))" "true"

echo
echo "════════════════════════════════════════════"
echo "SYSTEM MODULE (7 functions)"
echo "════════════════════════════════════════════"

run_test "system.hostname()" "console.log((await hlvm.system.hostname()).length > 0)" "true"
run_test "system.exec()" "const r = await hlvm.system.exec('echo test'); console.log(r.stdout.trim())" "test"
run_test "system.exit (type)" "console.log(typeof hlvm.system.exit)" "function"
run_test "system.pid()" "console.log(hlvm.system.pid() > 0)" "true"
run_test "system.cwd()" "console.log(hlvm.system.cwd().includes('/'))" "true"
run_test "system.chdir (type)" "console.log(typeof hlvm.system.chdir)" "function"
run_test "system.env()" "console.log(hlvm.system.env('HOME').startsWith('/'))" "true"

echo
echo "════════════════════════════════════════════"
echo "DATABASE MODULE (3 functions)"
echo "════════════════════════════════════════════"

run_test "database.path" "console.log(hlvm.db.path.includes('.sqlite'))" "true"
run_test "database.db object" "console.log(typeof hlvm.db.exec)" "function"
run_test "database.load (type)" "console.log(typeof hlvm.db.load)" "function"

echo
echo "════════════════════════════════════════════"
echo "FILESYSTEM MODULE (15 functions)"
echo "════════════════════════════════════════════"

TMP="/tmp/hlvm-test-$$"
run_test "fs.write()" "await hlvm.fs.write('$TMP.txt', 'hello'); console.log('written')" "written"
run_test "fs.read()" "console.log(await hlvm.fs.read('$TMP.txt'))" "hello"
run_test "fs.exists()" "console.log(await hlvm.fs.exists('$TMP.txt'))" "true"
run_test "fs.writeBytes()" "await hlvm.fs.writeBytes('$TMP.bin', new Uint8Array([72,73])); console.log('written')" "written"
run_test "fs.readBytes()" "const b = await hlvm.fs.readBytes('$TMP.bin'); console.log(b[0])" "72"
run_test "fs.copy()" "await hlvm.fs.copy('$TMP.txt', '$TMP-copy.txt'); console.log(await hlvm.fs.exists('$TMP-copy.txt'))" "true"
run_test "fs.move()" "await hlvm.fs.move('$TMP-copy.txt', '$TMP-moved.txt'); console.log(await hlvm.fs.exists('$TMP-moved.txt'))" "true"
run_test "fs.mkdir()" "await hlvm.fs.mkdir('$TMP-dir'); console.log(await hlvm.fs.exists('$TMP-dir'))" "true"
run_test "fs.readdir()" "const d = []; for await (const e of hlvm.fs.readdir('/tmp')) { d.push(e); break; } console.log(d.length > 0)" "true"
run_test "fs.stat()" "const s = await hlvm.fs.stat('$TMP.txt'); console.log(s.isFile)" "true"
run_test "fs.join()" "console.log(hlvm.fs.join('a', 'b', 'c'))" "a/b/c"
run_test "fs.dirname()" "console.log(hlvm.fs.dirname('/a/b/c.txt'))" "/a/b"
run_test "fs.basename()" "console.log(hlvm.fs.basename('/a/b/c.txt'))" "c.txt"
run_test "fs.extname()" "console.log(hlvm.fs.extname('file.txt'))" ".txt"
run_test "fs.remove()" "await hlvm.fs.remove('$TMP.txt'); console.log(await hlvm.fs.exists('$TMP.txt'))" "false"

# Cleanup
rm -rf $TMP* 2>/dev/null

echo
echo "════════════════════════════════════════════"
echo "CLIPBOARD MODULE (3 functions)"
echo "════════════════════════════════════════════"

run_test "clipboard.write()" "await hlvm.clipboard.write('test-clip'); console.log('written')" "written"
run_test "clipboard.read()" "const c = await hlvm.clipboard.read(); console.log(c.includes('test-clip'))" "true"
run_test "clipboard.isAvailable()" "console.log(await hlvm.clipboard.isAvailable())" "true"

echo
echo "════════════════════════════════════════════"
echo "CONTEXT FEATURE (1 property)"
echo "════════════════════════════════════════════"

run_test "hlvm.context" "await hlvm.clipboard.write('swift-code'); console.log(await hlvm.context)" "swift-code"

echo
echo "════════════════════════════════════════════"
echo "NOTIFICATION MODULE (4 functions)"
echo "════════════════════════════════════════════"

run_test "notification.notify()" "await hlvm.notification.notify('Test', 'HLVM'); console.log('notified')" "notified"
run_test "notification.alert (type)" "console.log(typeof hlvm.notification.alert)" "function"
run_test "notification.confirm (type)" "console.log(typeof hlvm.notification.confirm)" "function"
run_test "notification.prompt (type)" "console.log(typeof hlvm.notification.prompt)" "function"

echo
echo "════════════════════════════════════════════"
echo "SCREEN MODULE (2 functions)"
echo "════════════════════════════════════════════"

run_test "screen.capture()" "await hlvm.screen.capture('/tmp/hlvm-screen.png'); console.log(await hlvm.fs.exists('/tmp/hlvm-screen.png'))" "true"
run_test "screen.getScreenSize()" "const sz = await hlvm.screen.getScreenSize(); console.log(sz.width > 0)" "true"
rm -f /tmp/hlvm-screen.png

echo
echo "════════════════════════════════════════════"
echo "KEYBOARD MODULE (3 functions)"
echo "════════════════════════════════════════════"

run_test "keyboard.type (type)" "console.log(typeof hlvm.keyboard.type)" "function"
run_test "keyboard.press (type)" "console.log(typeof hlvm.keyboard.press)" "function"
run_test "keyboard.shortcut (type)" "console.log(typeof hlvm.keyboard.shortcut)" "function"

echo
echo "════════════════════════════════════════════"
echo "MOUSE MODULE (5 functions)"
echo "════════════════════════════════════════════"

run_test "mouse.move (type)" "console.log(typeof hlvm.mouse.move)" "function"
run_test "mouse.click (type)" "console.log(typeof hlvm.mouse.click)" "function"
run_test "mouse.position()" "const p = await hlvm.mouse.position(); console.log(typeof p.x === 'number')" "true"
run_test "mouse.doubleClick (type)" "console.log(typeof hlvm.mouse.doubleClick)" "function"
run_test "mouse.drag (type)" "console.log(typeof hlvm.mouse.drag)" "function"

echo
echo "════════════════════════════════════════════"
echo "OLLAMA MODULE (2 functions)"
echo "════════════════════════════════════════════"

run_test "ollama.list (type)" "console.log(typeof hlvm.ollama.list)" "function"
run_test "ollama.chat (type)" "console.log(typeof hlvm.ollama.chat)" "function"

echo
echo "════════════════════════════════════════════"
echo "APP CONTROL MODULE (1 object)"
echo "════════════════════════════════════════════"

run_test "app object" "console.log(typeof hlvm.app)" "object"
run_test "app.connect (type)" "console.log(typeof hlvm.app.connect)" "function"
run_test "app.spotlight object" "console.log(typeof hlvm.app.spotlight)" "object"
run_test "app.chat object" "console.log(typeof hlvm.app.chat)" "object"

echo
echo "════════════════════════════════════════════"
echo "SPOTLIGHT MODULE MANAGEMENT (5 functions)"
echo "════════════════════════════════════════════"

# Clean up first
echo "await hlvm.app.spotlight.modules.remove('test1').catch(()=>{}); await hlvm.app.spotlight.modules.remove('test2').catch(()=>{})" | $HLVM 2>&1 > /dev/null

run_test "spotlight.modules.add()" "await hlvm.app.spotlight.modules.add('test1', 'export const x = 99'); console.log('added')" "added"
run_test "spotlight.modules.list()" "const l = await hlvm.app.spotlight.modules.list(); console.log(l.some(m => m.key === 'test1'))" "true"
run_test "spotlight.modules.has()" "console.log(await hlvm.app.spotlight.modules.has('test1'))" "true"
run_test "spotlight.modules.get()" "const src = await hlvm.app.spotlight.modules.get('test1'); console.log(src.includes('export const x'))" "true"
run_test "spotlight.modules.remove()" "await hlvm.app.spotlight.modules.remove('test1'); console.log('removed')" "removed"

echo
echo "════════════════════════════════════════════"
echo "CUSTOM PROPERTY PERSISTENCE (5 tests)"
echo "════════════════════════════════════════════"

run_test "custom property assignment" "hlvm.mytest = {data: 'hello'}; console.log(hlvm.mytest.data)" "hello"
run_test "custom array assignment" "hlvm.myarray = [1, 2, 3]; console.log(hlvm.myarray[1])" "2"
run_test "custom property update" "hlvm.mytest = {data: 'updated'}; console.log(hlvm.mytest.data)" "updated"
run_test "custom property null removal" "hlvm.mytest = null; console.log(typeof hlvm.mytest)" "undefined"
run_test "custom property delete" "hlvm.temp = 'test'; delete hlvm.temp; console.log(typeof hlvm.temp)" "undefined"


echo
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