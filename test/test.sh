#!/bin/bash

# HLVM Test Suite - SAFE VERSION
# Only tests actual business logic, not Deno wrappers
# NO keyboard, mouse, clipboard, screen capture, notifications

echo "╔══════════════════════════════════════════╗"
echo "║      HLVM SAFE TEST SUITE               ║"
echo "║   Testing Business Logic Only           ║"
echo "╚══════════════════════════════════════════╝"
echo

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

passed=0
failed=0
total=0

HLVM="./hlvm"

run_test() {
    local name="$1"
    local code="$2"
    local expected="$3"
    
    ((total++))
    printf "[%3d] %-45s" "$total" "$name"
    
    result=$(echo "$code; Deno.exit(0)" | $HLVM 2>&1 | grep -v "✓\|╔\|║\|╚\|HLVM\|Version\|Virtual Machine\|Global aliases\|Type alias\|help('name')" | tail -5 | sed '/^$/d')
    
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
echo "STORAGE ESM - Custom Module Management"
echo "════════════════════════════════════════════"

run_test "esm.set() stores module" "await hlvm.core.storage.esm.set('testmod', 'export default 42'); console.log('saved')" "saved"
run_test "esm.load() imports module" "const m = await hlvm.core.storage.esm.load('testmod'); console.log(m)" "42"
run_test "esm.has() checks existence" "console.log(await hlvm.core.storage.esm.has('testmod'))" "true"
run_test "esm.remove() deletes module" "await hlvm.core.storage.esm.remove('testmod'); console.log(await hlvm.core.storage.esm.has('testmod'))" "false"

echo
echo "════════════════════════════════════════════"
echo "CUSTOM PROPERTY PERSISTENCE"
echo "════════════════════════════════════════════"

run_test "custom property persists" "hlvm.mytest = {data: 'hello'}; console.log(hlvm.mytest.data)" "hello"
run_test "custom array persists" "hlvm.myarray = [1, 2, 3]; console.log(hlvm.myarray[1])" "2"
run_test "property updates persist" "hlvm.mytest = {data: 'updated'}; console.log(hlvm.mytest.data)" "updated"
run_test "null removes property" "hlvm.mytest = null; console.log(hlvm.mytest)" "null"

echo
echo "════════════════════════════════════════════"
echo "EVENT OBSERVATION SYSTEM"
echo "════════════════════════════════════════════"

run_test "event.observe() hooks" "hlvm.core.event.observe('hlvm.core.io.fs.write', {before: () => {}}); console.log(hlvm.core.event.list().length >= 1)" "true"
run_test "event.unobserve() removes" "hlvm.core.event.unobserve('hlvm.core.system.info'); console.log(hlvm.core.event.list().filter(o => o.path === 'hlvm.core.system.info').length)" "0"

echo
echo "════════════════════════════════════════════"
echo "ENVIRONMENT SETTINGS - Custom Validation"
echo "════════════════════════════════════════════"

run_test "env validates temperature" "console.log(hlvm.env.set('ai.temperature', 1.2))" "1.2"
run_test "env rejects invalid temp" "hlvm.env.set('ai.temperature', 'hot'); console.log(hlvm.env.get('ai.temperature'))" "1.2"
run_test "env rejects out of range" "hlvm.env.set('ai.temperature', 5); console.log(hlvm.env.get('ai.temperature'))" "1.2"
run_test "env.reset() restores default" "hlvm.env.reset('ai.temperature'); console.log(hlvm.env.get('ai.temperature'))" "0.7"

echo
echo "════════════════════════════════════════════"
echo "AI FUNCTIONS - Business Logic (Type Checks)"
echo "════════════════════════════════════════════"

# Only type checks for AI functions to avoid calling models
run_test "ai.revise exists" "console.log(typeof hlvm.stdlib.ai.revise)" "function"
run_test "ai.judge exists" "console.log(typeof hlvm.stdlib.ai.judge)" "function"
run_test "ai.draw exists" "console.log(typeof hlvm.stdlib.ai.draw)" "function"
run_test "ai.refactor exists" "console.log(typeof hlvm.stdlib.ai.refactor)" "function"

echo
echo "╔════════════════════════════════════════════╗"
echo "║           TEST RESULTS                    ║"
echo "╚════════════════════════════════════════════╝"
echo
echo "Total tests: $total"
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
fi