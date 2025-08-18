// UI Control Module - Safe version for embedded environment
// Returns stub if WebSocket not available

let ui;

// Check if WebSocket is available
if (typeof WebSocket !== 'undefined') {
  // Full implementation
  let socket = null;
  let requestId = 0;
  const pending = new Map();

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
            
            if (msg.id && pending.has(msg.id)) {
              const { resolve, reject } = pending.get(msg.id);
              pending.delete(msg.id);
              
              if (msg.error) {
                reject(new Error(msg.error.message));
              } else {
                resolve(msg.result);
              }
            }
            
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
      } catch (e) {
        reject(e);
      }
    });
  }

  function handleNotification(method, params) {
    console.log(`Notification: ${method}`, params);
  }

  async function request(method, params = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to macOS app. Run hlvm.app.connect() first.");
    }
    
    const id = `${++requestId}`;
    
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
      
      socket.send(JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params
      }));
    });
  }

  async function notify(method, params = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("Not connected to macOS app");
      return;
    }
    
    socket.send(JSON.stringify({
      jsonrpc: "2.0",
      method,
      params
    }));
  }

  ui = {
    connect,
    disconnect: () => {
      if (socket) {
        socket.close();
        socket = null;
      }
    },
    
    isConnected: () => socket && socket.readyState === WebSocket.OPEN,
    
    spotlight: {
      toggle: () => request("spotlight.toggle"),
      show: () => request("spotlight.show"),
      hide: () => request("spotlight.hide"),
      search: (query) => request("spotlight.search", { query })
    },
    
    chat: {
      toggle: () => request("chat.toggle"),
      show: () => request("chat.show"),
      hide: () => request("chat.hide"),
      send: (message) => request("chat.send", { message }),
      clear: () => request("chat.clear")
    },
    
    preferences: () => request("app.preferences"),
    quit: () => request("app.quit"),
    
    request,
    notify
  };
} else {
  // Stub implementation when WebSocket not available
  const notAvailable = () => {
    console.log("App control not available in this environment");
    return Promise.resolve(null);
  };
  
  ui = {
    connect: notAvailable,
    disconnect: () => {},
    isConnected: () => false,
    
    spotlight: {
      toggle: notAvailable,
      show: notAvailable,
      hide: notAvailable,
      search: notAvailable
    },
    
    chat: {
      toggle: notAvailable,
      show: notAvailable,
      hide: notAvailable,
      send: notAvailable,
      clear: notAvailable
    },
    
    preferences: notAvailable,
    quit: notAvailable,
    
    request: notAvailable,
    notify: notAvailable
  };
}

export default ui;