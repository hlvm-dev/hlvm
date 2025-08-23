// UI Control Module - Control macOS GUI via WebSocket
// Replaces __HLVM_COMMAND__ strings with proper JSON-RPC calls

import { ManagedWebSocket } from '../core/resource.js';

const socket = new ManagedWebSocket('ws://localhost:11436');
let requestId = 0;
const pending = new Map();

// Connect to macOS app WebSocket server
async function connect(port = 11436) {
  if (port !== 11436) {
    socket.url = `ws://localhost:${port}`;
  }
  
  const connected = await socket.connect();
  
  if (connected) {
    // Set up message handler
    socket.on('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Handle response to our request
        if (msg.id && pending.has(msg.id)) {
          const { resolve, reject, timeout } = pending.get(msg.id);
          clearTimeout(timeout);
          pending.delete(msg.id);
          
          if (msg.error) {
            reject(new Error(msg.error.message));
          } else {
            resolve(msg.result);
          }
        }
        
        // Handle notifications from app
        if (!msg.id && msg.method) {
          handleNotification(msg.method, msg.params);
        }
      } catch (e) {
        console.error("Message handling error:", e);
      }
    });
    
    socket.on('close', () => {
      console.log("Disconnected from macOS app");
      // Clear all pending requests
      for (const [id, { reject, timeout }] of pending) {
        clearTimeout(timeout);
        reject(new Error("Socket closed"));
      }
      pending.clear();
    });
    
    console.log("Connected to macOS app");
  }
  
  return connected;
}

// Send JSON-RPC request and wait for response
async function request(method, params = null) {
  if (!socket.isConnected()) {
    // Try to connect
    try {
      await connect();
    } catch {
      return { error: "macOS app not available" };
    }
  }
  
  const id = `req-${++requestId}`;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Request timeout"));
    }, 5000);
    
    pending.set(id, { resolve, reject, timeout });
    
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };
    
    try {
      socket.send(JSON.stringify(request));
    } catch (error) {
      clearTimeout(timeout);
      pending.delete(id);
      reject(error);
    }
  });
}

// Send notification (no response expected)
function notify(method, params = null) {
  if (!socket.isConnected()) {
    console.warn("App not connected");
    return;
  }
  
  const notification = {
    jsonrpc: "2.0",
    method,
    params
  };
  
  try {
    socket.send(JSON.stringify(notification));
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

// Handle notifications from app
function handleNotification(method, params) {
  console.log(`Notification from app: ${method}`, params);
  
  // Emit events if needed
  if (globalThis.hlvm?.events) {
    globalThis.hlvm.events.emit(method, params);
  }
}

// UI control commands (replacing __HLVM_COMMAND__ strings)
export const ui = {
  // Connection management
  connect,
  disconnect: () => {
    socket.cleanup();
    // Clear all pending requests on disconnect
    for (const [id, { reject, timeout }] of pending) {
      clearTimeout(timeout);
      reject(new Error("Disconnected"));
    }
    pending.clear();
  },
  
  isConnected: () => socket.isConnected(),
  
  // Spotlight commands (replacing __HLVM_SPOTLIGHT_*)
  spotlight: {
    toggle: () => request("spotlight.toggle"),
    show: () => request("spotlight.show"),
    hide: () => request("spotlight.hide"),
    navigateIn: () => request("spotlight.navigateIn"),
    navigateOut: () => request("spotlight.navigateOut"),
    search: (query) => request("spotlight.search", { query }),
    
    // Note: Module management moved to hlvm.modules for generic use
  },
  
  // Chat commands (replacing __HLVM_CHAT_*)
  chat: {
    toggle: () => request("chat.toggle"),
    stop: () => request("chat.stop"),
    cancel: () => request("chat.cancel"),
    createRoom: (name) => request("chat.createRoom", { name }),
    send: (message) => request("chat.send", { message }),
    list: () => request("chat.list"),
    selectRoom: (id) => request("chat.selectRoom", { id }),
    ask: (prompt) => request("chat.ask", { prompt })
  },
  
  // Playground commands (replacing __HLVM_PLAYGROUND_*)
  playground: {
    toggle: () => request("playground.toggle"),
    eval: (code) => request("playground.eval", { code }),
    increaseFont: () => request("playground.increaseFont"),
    decreaseFont: () => request("playground.decreaseFont"),
    setCode: (code) => request("playground.setCode", { code })
  },
  
  // Screenshot commands (replacing __HLVM_SCREENSHOT_*)
  screenshot: {
    capture: () => request("screenshot.capture"),
    captureScreen: () => request("screenshot.captureScreen"),
    captureEntire: () => request("screenshot.captureEntire"),
    captureSelection: () => request("screenshot.captureSelection")
  },
  
  // App commands (replacing __HLVM_APP_*)
  preferences: () => request("app.preferences"),
  escape: () => request("app.escape"),
  eval: (code) => request("app.eval", { code }),
  settings: () => request("app.settings"),
  textEditor: () => request("app.textEditor"),
  minimize: () => request("app.minimize"),
  quit: () => request("app.quit"),
  
  // Code commands (replacing __HLVM_CODE_*)
  code: {
    paste: (code) => request("code.paste", { code }),
    copy: () => request("code.copy")
  },
  
  // Utility commands
  // Note: Clipboard operations use hlvm.clipboard directly (not via WebSocket)
  
  // REPL commands
  repl: {
    toggle: () => request("repl.toggle"),
    clear: () => request("repl.clear"),
    execute: (code) => request("repl.execute", { code })
  },
  
  // AI commands
  ai: {
    write: (prompt) => request("ai.write", { prompt })
  },
  
  // Raw request for custom commands
  request,
  notify
};

export default ui;