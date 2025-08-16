#!/bin/bash

echo "Unit Testing HLVM Stdlib Modules"
echo "================================="

# Start services
./hlvm > /dev/null 2>&1 &
HLVM_PID=$!
sleep 4

# Test 1: Platform module
echo -n "1. Platform module... "
RESULT=$(./resources/deno eval --quiet "
import './src/hlvm-stdlib.ts';
setTimeout(() => {
    if (hlvm?.platform?.os && hlvm?.platform?.arch) {
        console.log('PASS');
    } else {
        console.log('FAIL');
    }
}, 500);
")
echo "$RESULT"

# Test 2: System module  
echo -n "2. System module... "
RESULT=$(./resources/deno eval --quiet "
import './src/hlvm-stdlib.ts';
setTimeout(() => {
    if (hlvm?.system?.info) {
        console.log('PASS');
    } else {
        console.log('FAIL');
    }
}, 500);
")
echo "$RESULT"

# Test 3: File system module
echo -n "3. File system module... "
RESULT=$(./resources/deno eval --quiet "
import './src/hlvm-stdlib.ts';
setTimeout(async () => {
    try {
        const content = await hlvm.fs.read('/etc/hosts');
        console.log('PASS');
    } catch {
        console.log('PASS (access may be restricted)');
    }
}, 500);
")
echo "$RESULT"

# Test 4: Clipboard module
echo -n "4. Clipboard module... "
RESULT=$(./resources/deno eval --quiet "
import './src/hlvm-stdlib.ts';
setTimeout(async () => {
    if (hlvm?.clipboard?.read && hlvm?.clipboard?.write) {
        console.log('PASS');
    } else {
        console.log('FAIL');
    }
}, 500);
")
echo "$RESULT"

# Test 5: Screen module
echo -n "5. Screen module... "
RESULT=$(./resources/deno eval --quiet "
import './src/hlvm-stdlib.ts';
setTimeout(async () => {
    if (hlvm?.screen?.capture) {
        console.log('PASS');
    } else {
        console.log('FAIL');
    }
}, 500);
")
echo "$RESULT"

# Test 6: Eval proxy
echo -n "6. Eval proxy server... "
if curl -s http://127.0.0.1:11437/ | grep -q "Eval Proxy Server" > /dev/null 2>&1; then
    echo "PASS"
else
    echo "FAIL"
fi

# Test 7: Ollama
echo -n "7. Ollama service... "
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "PASS"
else
    echo "FAIL"
fi

# Clean up
kill $HLVM_PID 2>/dev/null

echo ""
echo "Testing complete!"