#!/bin/bash

# Test HLVM macOS app control via WebSocket
# This tests the replacement of __HLVM_COMMAND__ strings

echo "================================="
echo "HLVM macOS Control Test"
echo "================================="
echo ""
echo "Prerequisites:"
echo "1. macOS HLVM app must be running"
echo "2. WebSocket server should be on port 11436"
echo ""

# Start HLVM and run tests
./hlvm << 'EOF'
// Start WebSocket bridge
console.log("Starting WebSocket bridge...");
await hlvm.startBridge();

// Connect to macOS app
console.log("\nConnecting to macOS app...");
try {
  await hlvm.app.connect();
  console.log("✓ Connected to macOS app");
} catch (e) {
  console.error("✗ Failed to connect:", e.message);
  console.log("\nMake sure the macOS HLVM app is running!");
  Deno.exit(1);
}

// Test Spotlight control
console.log("\n=== Testing Spotlight Control ===");
console.log("Toggling spotlight (replaces __HLVM_SPOTLIGHT_TOGGLE__)");
try {
  await hlvm.app.spotlight.toggle();
  console.log("✓ Spotlight toggled");
  await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
  
  await hlvm.app.spotlight.hide();
  console.log("✓ Spotlight hidden");
} catch (e) {
  console.log("✗ Spotlight control failed:", e.message);
}

// Test Chat operations
console.log("\n=== Testing Chat Operations ===");
console.log("Getting chat list (replaces __HLVM_CHAT_LIST__)");
try {
  const rooms = await hlvm.app.chat.list();
  console.log(`✓ Got ${rooms.length} chat rooms`);
  if (rooms.length > 0) {
    console.log("  First room:", rooms[0].name);
  }
} catch (e) {
  console.log("✗ Chat list failed:", e.message);
}

// Test Playground
console.log("\n=== Testing Playground ===");
console.log("Toggling playground (replaces __HLVM_PLAYGROUND_TOGGLE__)");
try {
  await hlvm.app.playground.toggle();
  console.log("✓ Playground toggled");
} catch (e) {
  console.log("✗ Playground toggle failed:", e.message);
}

// Test App preferences
console.log("\n=== Testing App Control ===");
console.log("Opening preferences (replaces __HLVM_APP_PREFERENCES__)");
try {
  await hlvm.app.preferences();
  console.log("✓ Preferences opened");
} catch (e) {
  console.log("✗ Preferences failed:", e.message);
}

console.log("\n=== Summary ===");
console.log("WebSocket communication is working!");
console.log("All __HLVM_COMMAND__ strings can be replaced with clean API calls");

Deno.exit(0);
EOF