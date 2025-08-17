// Test WebSocket eval functionality
// Run this after starting HLVM with bridge

async function testWebSocketEval() {
  console.log("Testing WebSocket eval...");
  
  // First ensure bridge is started
  if (typeof hlvm !== 'undefined' && hlvm.startBridge) {
    console.log("Starting bridge on port 11435...");
    await hlvm.startBridge();
    
    // Wait for bridge to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Bridge should be ready");
  }
  
  // Now test if we can connect and eval
  try {
    const ws = new WebSocket("ws://localhost:11435");
    
    ws.onopen = () => {
      console.log("Connected to WebSocket bridge");
      
      // Send eval request
      const request = {
        jsonrpc: "2.0",
        id: 1,
        method: "eval",
        params: { code: "2 + 2" }
      };
      
      console.log("Sending eval request:", request);
      ws.send(JSON.stringify(request));
    };
    
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      console.log("Received response:", response);
      
      if (response.result) {
        console.log("✅ Eval result:", response.result);
      } else if (response.error) {
        console.log("❌ Eval error:", response.error);
      }
      
      // Test more complex eval
      const request2 = {
        jsonrpc: "2.0",
        id: 2,
        method: "eval",
        params: { code: "hlvm.platform.os" }
      };
      
      console.log("Sending second eval request:", request2);
      ws.send(JSON.stringify(request2));
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
  } catch (error) {
    console.error("Failed to connect:", error);
  }
}

// Run if in HLVM environment
if (typeof hlvm !== 'undefined') {
  testWebSocketEval();
} else {
  console.log("Run this script in HLVM REPL to test WebSocket eval");
}