#!/bin/bash

echo "Testing HLVM Components..."
echo "=========================="

# Start HLVM in background
cd /Users/seoksoonjang/Desktop/hlvm
./hlvm > /tmp/hlvm-test.log 2>&1 &
HLVM_PID=$!

# Wait for services to start
sleep 5

# Test 1: Ollama service
echo -n "1. Testing Ollama service on port 11434... "
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
fi

# Test 2: Eval proxy server
echo -n "2. Testing eval-proxy on port 11437... "
if curl -s http://127.0.0.1:11437/health > /dev/null 2>&1; then
    echo "✓ PASS"
else
    # Try the root endpoint
    if curl -s http://127.0.0.1:11437/ | grep -q "Eval Proxy Server"; then
        echo "✓ PASS"
    else
        echo "✗ FAIL"
    fi
fi

# Test 3: Test stdlib modules via Deno
echo "3. Testing stdlib modules..."

cat > /Users/seoksoonjang/Desktop/hlvm/test-stdlib-modules.ts << 'EOF'
import './src/hlvm-stdlib.ts';

// Test each module
async function testModules() {
    const tests = [
        { name: "platform", test: () => typeof platform === 'object' && platform.info },
        { name: "system", test: () => typeof system === 'object' && system.info },
        { name: "app", test: () => typeof app === 'object' && app.launch },
        { name: "clipboard", test: () => typeof clipboard === 'object' && clipboard.read },
        { name: "fs", test: () => typeof fs === 'object' && fs.read },
        { name: "keyboard", test: () => typeof keyboard === 'object' && keyboard.type },
        { name: "mouse", test: () => typeof mouse === 'object' && mouse.move },
        { name: "notification", test: () => typeof notification === 'object' && notification.send },
        { name: "screen", test: () => typeof screen === 'object' && screen.capture },
    ];

    for (const t of tests) {
        try {
            if (t.test()) {
                console.log(`   ✓ ${t.name} module loaded`);
            } else {
                console.log(`   ✗ ${t.name} module failed`);
            }
        } catch (e) {
            console.log(`   ✗ ${t.name} module error:`, e.message);
        }
    }
}

await testModules();
EOF

./resources/deno run --allow-all --quiet /Users/seoksoonjang/Desktop/hlvm/test-stdlib-modules.ts

# Test 4: Test save/load functionality
echo "4. Testing eval-proxy save/load..."
SAVE_RESPONSE=$(curl -s -X POST http://127.0.0.1:11437/save \
  -H "Content-Type: application/json" \
  -d '{"name": "test_module", "code": "export const test = 42;"}')

if echo "$SAVE_RESPONSE" | grep -q "saved"; then
    echo "   ✓ Save module works"
else
    echo "   ✗ Save module failed: $SAVE_RESPONSE"
fi

LOAD_RESPONSE=$(curl -s http://127.0.0.1:11437/load/test_module)
if echo "$LOAD_RESPONSE" | grep -q "export const test = 42"; then
    echo "   ✓ Load module works"  
else
    echo "   ✗ Load module failed: $LOAD_RESPONSE"
fi

# Test 5: Test actual functionality
echo "5. Testing actual functionality..."
echo -n "   Platform info: "
./resources/deno eval --quiet "import './src/hlvm-stdlib.ts'; console.log(platform.info().os)" 2>/dev/null || echo "✗ Failed"

# Clean up
kill $HLVM_PID 2>/dev/null
rm -f /Users/seoksoonjang/Desktop/hlvm/test-stdlib-modules.ts
echo ""
echo "Testing complete!"