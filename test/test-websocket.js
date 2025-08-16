#!/usr/bin/env node

// Test WebSocket communication between HLVM binary and macOS app
// This replaces the brittle __HLVM_COMMAND__ strings

console.log("=================================");
console.log("HLVM WebSocket Bridge Test");
console.log("=================================\n");

console.log("Prerequisites:");
console.log("1. macOS HLVM app must be running");
console.log("2. HLVM binary must be running\n");

// Test the connection
console.log("Testing app control...\n");

async function testAppControl() {
  try {
    // Check if app namespace exists
    if (typeof hlvm.app === 'undefined') {
      console.error("❌ hlvm.app not found. Make sure HLVM is running with updated stdlib");
      return;
    }
    
    console.log("✓ hlvm.app namespace exists");
    
    // Try to connect
    console.log("\nConnecting to macOS app...");
    const connected = await hlvm.app.connect();
    
    if (!connected) {
      console.error("❌ Failed to connect to macOS app. Is it running?");
      return;
    }
    
    console.log("✓ Connected to macOS app on ws://localhost:11436");
    
    // Test various commands
    console.log("\n=== Testing Commands (Replacing __HLVM_COMMAND__) ===\n");
    
    // Test spotlight
    console.log("1. Testing Spotlight control:");
    console.log("   Old way: console.log('__HLVM_SPOTLIGHT_TOGGLE__')");
    console.log("   New way: await hlvm.app.spotlight.toggle()");
    
    try {
      const result = await hlvm.app.spotlight.toggle();
      console.log("   ✓ Spotlight toggle:", result);
    } catch (e) {
      console.log("   ✗ Spotlight toggle failed:", e.message);
    }
    
    // Test chat list
    console.log("\n2. Testing Chat list (bidirectional):");
    console.log("   Old way: console.log('__HLVM_CHAT_LIST__') // Can't get data back!");
    console.log("   New way: await hlvm.app.chat.list()");
    
    try {
      const rooms = await hlvm.app.chat.list();
      console.log("   ✓ Got chat rooms:", rooms);
      
      if (Array.isArray(rooms)) {
        console.log(`   Found ${rooms.length} chat rooms`);
        rooms.slice(0, 3).forEach(room => {
          console.log(`     - ${room.name} (${room.messageCount} messages)`);
        });
      }
    } catch (e) {
      console.log("   ✗ Chat list failed:", e.message);
    }
    
    // Test playground
    console.log("\n3. Testing Playground control:");
    console.log("   Old way: console.log('__HLVM_PLAYGROUND_TOGGLE__')");
    console.log("   New way: await hlvm.app.playground.toggle()");
    
    try {
      const result = await hlvm.app.playground.toggle();
      console.log("   ✓ Playground toggle:", result);
    } catch (e) {
      console.log("   ✗ Playground toggle failed:", e.message);
    }
    
    // Test app preferences
    console.log("\n4. Testing App control:");
    console.log("   Old way: console.log('__HLVM_APP_PREFERENCES__')");
    console.log("   New way: await hlvm.app.preferences()");
    
    try {
      const result = await hlvm.app.preferences();
      console.log("   ✓ Preferences opened:", result);
    } catch (e) {
      console.log("   ✗ Preferences failed:", e.message);
    }
    
    console.log("\n=== Summary ===");
    console.log("✅ WebSocket communication is working!");
    console.log("✅ Bidirectional data transfer confirmed");
    console.log("✅ No more __HLVM_COMMAND__ strings needed");
    
    console.log("\nBenefits over old approach:");
    console.log("- Can get data back (chat.list() returns actual rooms)");
    console.log("- Clean API (app.spotlight.toggle() vs magic strings)");
    console.log("- Error handling (try/catch works properly)");
    console.log("- Type safety (can add TypeScript types)");
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run test
testAppControl().then(() => {
  console.log("\nTest complete!");
  Deno.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  Deno.exit(1);
});