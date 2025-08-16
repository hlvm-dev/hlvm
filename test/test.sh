#!/bin/bash

# HLVM Comprehensive Test Suite
# Single source of truth for all testing

echo "╔══════════════════════════════════╗"
echo "║    HLVM COMPREHENSIVE TEST      ║"
echo "╚══════════════════════════════════╝"
echo

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

passed=0
failed=0

run_test() {
    local name="$1"
    local code="$2"
    local expected="$3"
    
    printf "%-40s" "$name"
    
    # Run test and capture output after the banner
    result=$(echo "$code; Deno.exit(0)" | ./hlvm 2>&1 | sed '1,/HLVM ready/d')
    
    if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}✓${NC}"
        ((passed++))
    else
        echo -e "${RED}✗${NC}"
        echo "  Expected: $expected"
        echo "  Got: $(echo "$result" | head -3)"
        ((failed++))
    fi
}

echo "1. Core Functionality"
echo "---------------------"
run_test "Basic math" "console.log(2 + 2)" "4"
run_test "HLVM namespace exists" "console.log(typeof hlvm)" "object"
run_test "Platform detection" "console.log(hlvm.platform.os)" "darwin"
run_test "Architecture" "console.log(hlvm.platform.arch)" "x86_64\|aarch64"

echo
echo "2. Module Structure"
echo "-------------------"
run_test "Platform module" "console.log(typeof hlvm.platform)" "object"
run_test "System module" "console.log(typeof hlvm.system)" "object"
run_test "File system module" "console.log(typeof hlvm.fs)" "object"
run_test "Clipboard module" "console.log(typeof hlvm.clipboard)" "object"
run_test "Notification module" "console.log(typeof hlvm.notification)" "object"
run_test "Screen module" "console.log(typeof hlvm.screen)" "object"
run_test "Keyboard module" "console.log(typeof hlvm.keyboard)" "object"
run_test "Mouse module" "console.log(typeof hlvm.mouse)" "object"
run_test "Ollama module" "console.log(typeof hlvm.ollama)" "object"

echo
echo "3. Database Operations"
echo "----------------------"
run_test "Save function exists" "console.log(typeof hlvm.save)" "function"
run_test "Load function exists" "console.log(typeof hlvm.load)" "function"
run_test "List function exists" "console.log(typeof hlvm.list)" "function"
run_test "Remove function exists" "console.log(typeof hlvm.remove)" "function"

# Test actual database operations
run_test "Save module" "await hlvm.save('test_mod', 'export const val = 123'); console.log('saved')" "saved"
run_test "List modules" "const list = await hlvm.list(); console.log(list.some(m => m.key === 'test_mod'))" "true"
run_test "Load module" "const m = await hlvm.load('test_mod'); console.log(m.val)" "123"
run_test "Remove module" "await hlvm.remove('test_mod'); console.log('removed')" "removed"

echo
echo "4. System Functions"
echo "-------------------"
run_test "Environment variable" "console.log(hlvm.system.env('HOME').startsWith('/Users'))" "true"
run_test "Temp directory" "console.log(hlvm.platform.tempDir().includes('/'))" "true"
run_test "Home directory" "console.log(hlvm.platform.homeDir().includes('/'))" "true"

echo
echo "5. Module Functions"
echo "-------------------"
run_test "fs.exists function" "console.log(typeof hlvm.fs.exists)" "function"
run_test "fs.read function" "console.log(typeof hlvm.fs.read)" "function"
run_test "fs.write function" "console.log(typeof hlvm.fs.write)" "function"
run_test "clipboard.read function" "console.log(typeof hlvm.clipboard.read)" "function"
run_test "clipboard.write function" "console.log(typeof hlvm.clipboard.write)" "function"
run_test "notification.alert function" "console.log(typeof hlvm.notification.alert)" "function"
run_test "screen.capture function" "console.log(typeof hlvm.screen.capture)" "function"
run_test "keyboard.type function" "console.log(typeof hlvm.keyboard.type)" "function"
run_test "mouse.move function" "console.log(typeof hlvm.mouse.move)" "function"
run_test "ollama.list function" "console.log(typeof hlvm.ollama.list)" "function"

echo
echo "6. Help System"
echo "--------------"
run_test "Help function exists" "console.log(typeof hlvm.help)" "function"
run_test "Status function exists" "console.log(typeof hlvm.status)" "function"
run_test "Help output" "hlvm.help(); console.log('done')" "Core Functions"
run_test "Status output" "hlvm.status(); console.log('done')" "HLVM Status"

echo
echo "7. Cross-Platform APIs"
echo "----------------------"
run_test "Platform OS values" "console.log(['darwin','windows','linux'].includes(hlvm.platform.os))" "true"
run_test "Path separator" "console.log(typeof hlvm.platform.pathSep)" "string"
run_test "Platform booleans" "console.log(hlvm.platform.isDarwin || hlvm.platform.isWindows || hlvm.platform.isLinux)" "true"

echo
echo "8. File Operations"
echo "------------------"
# Create temp file for testing
temp_file="/tmp/hlvm-test-$$.txt"
run_test "Write file" "await hlvm.fs.write('$temp_file', 'test data'); console.log('written')" "written"
run_test "File exists" "console.log(await hlvm.fs.exists('$temp_file'))" "true"
run_test "Read file" "const content = await hlvm.fs.read('$temp_file'); console.log(content)" "test data"
rm -f "$temp_file"

echo
echo "9. New Concise APIs"
echo "-------------------"
run_test "fs.readBytes function" "console.log(typeof hlvm.fs.readBytes)" "function"
run_test "fs.writeBytes function" "console.log(typeof hlvm.fs.writeBytes)" "function"
run_test "fs.copy function" "console.log(typeof hlvm.fs.copy)" "function"
run_test "fs.move function" "console.log(typeof hlvm.fs.move)" "function"
run_test "fs.mkdir function" "console.log(typeof hlvm.fs.mkdir)" "function"
run_test "platform.shell function" "console.log(typeof hlvm.platform.shell)" "function"

echo
echo "10. Ollama Integration"
echo "---------------------"
run_test "Ollama list (function)" "console.log(typeof hlvm.ollama.list)" "function"
run_test "Ollama chat (function)" "console.log(typeof hlvm.ollama.chat)" "function"
run_test "Ask shorthand" "console.log(typeof hlvm.ask)" "function"

echo
echo "================================"
echo "Test Results"
echo "================================"
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"
echo "Total: $((passed + failed))"
echo

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi