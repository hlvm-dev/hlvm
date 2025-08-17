// App Control Module - Control macOS app via WebSocket
// Replaces __HLVM_COMMAND__ strings with proper JSON-RPC calls

let socket = null;
let requestId = 0;
const pending = new Map();

// Connect to macOS app WebSocket server
async function connect(port = 11436) {
  return new Promise((resolve, reject) => {
    try {
      socket = new WebSocket(`ws://localhost:${port}`);
      
      socket.onopen = () => {
        console.log("Connected to macOS app");
        resolve(true);
      };
      
      socket.onerror = (error) => {
        reject(new Error(`Connection failed: ${error}`));
      };
      
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          // Handle response to our request
          if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
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
      };
      
      socket.onclose = () => {
        console.log("Disconnected from macOS app");
        socket = null;
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Send JSON-RPC request and wait for response
async function request(method, params = null) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
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
    
    pending.set(id, { 
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      }, 
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    });
    
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };
    
    socket.send(JSON.stringify(request));
  });
}

// Send notification (no response expected)
function notify(method, params = null) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("App not connected");
    return;
  }
  
  const notification = {
    jsonrpc: "2.0",
    method,
    params
  };
  
  socket.send(JSON.stringify(notification));
}

// Handle notifications from app
function handleNotification(method, params) {
  console.log(`Notification from app: ${method}`, params);
  
  // Emit events if needed
  if (globalThis.hlvm?.events) {
    globalThis.hlvm.events.emit(method, params);
  }
}

// App control commands (replacing __HLVM_COMMAND__ strings)
export const app = {
  // Connection management
  connect,
  disconnect: () => {
    if (socket) {
      socket.close();
      socket = null;
    }
  },
  
  isConnected: () => socket && socket.readyState === WebSocket.OPEN,
  
  // Spotlight commands (replacing __HLVM_SPOTLIGHT_*)
  spotlight: {
    toggle: () => request("spotlight.toggle"),
    show: () => request("spotlight.show"),
    hide: () => request("spotlight.hide"),
    navigateIn: () => request("spotlight.navigateIn"),
    navigateOut: () => request("spotlight.navigateOut"),
    search: (query) => request("spotlight.search", { query })
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

export default app;