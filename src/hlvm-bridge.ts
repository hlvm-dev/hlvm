// HLVM Bridge - WebSocket server for GUI control commands
// NOTE: JavaScript eval uses stdin/stdout, NOT this WebSocket bridge
// This bridge is only for hlvm.app GUI control commands

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

class HLVMBridge {
  private connections = new Set<WebSocket>();
  private server?: Deno.HttpServer;
  private handlers = new Map<string, (params: any) => Promise<any>>();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    // GUI Control handlers (eval is handled via stdin/stdout, not WebSocket)

    this.handlers.set("system.info", async () => {
      return {
        platform: Deno.build.os,
        arch: Deno.build.arch,
        version: "2.0",
        pid: Deno.pid
      };
    });

    // Module handlers (keep existing functionality)
    this.handlers.set("modules.list", async () => {
      // Call existing hlvm.list() function
      if (globalThis.hlvm?.list) {
        return await globalThis.hlvm.list();
      }
      return [];
    });

    this.handlers.set("modules.save", async (params) => {
      if (globalThis.hlvm?.save) {
        return await globalThis.hlvm.save(params.name, params.code);
      }
      throw new Error("Module save not available");
    });

    this.handlers.set("modules.load", async (params) => {
      if (globalThis.hlvm?.db?.load) {
        return await globalThis.hlvm.db.load(params.name);
      }
      throw new Error("Module load not available");
    });

    // AI handlers
    this.handlers.set("ai.generate", async (params) => {
      if (globalThis.hlvm?.ollama?.chat) {
        return await globalThis.hlvm.ollama.chat(params.prompt, params.model);
      }
      throw new Error("AI not available");
    });

    // File system handlers
    this.handlers.set("fs.read", async (params) => {
      return await Deno.readTextFile(params.path);
    });

    this.handlers.set("fs.write", async (params) => {
      await Deno.writeTextFile(params.path, params.content);
      return { success: true };
    });

    this.handlers.set("fs.exists", async (params) => {
      try {
        await Deno.stat(params.path);
        return true;
      } catch {
        return false;
      }
    });
  }

  async start(port = 11436) {
    // Start server without blocking
    this.server = Deno.serve({ port, onListen: () => {
      console.log(`HLVM Bridge running on ws://localhost:${port}`);
    }}, (req) => {
      // Handle WebSocket upgrade
      if (req.headers.get("upgrade") === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(req);
        
        socket.onopen = () => {
          console.log("macOS app connected");
          this.connections.add(socket);
          
          // Send connection confirmation
          const notification: JSONRPCNotification = {
            jsonrpc: "2.0",
            method: "connection.established",
            params: {
              version: "2.0",
              capabilities: Array.from(this.handlers.keys())
            }
          };
          socket.send(JSON.stringify(notification));
        };

        socket.onmessage = async (event) => {
          try {
            const request = JSON.parse(event.data) as JSONRPCRequest;
            
            if (request.jsonrpc !== "2.0") {
              throw new Error("Invalid JSON-RPC version");
            }

            // Handle request with response
            if (request.id !== undefined) {
              const response: JSONRPCResponse = {
                jsonrpc: "2.0",
                id: request.id
              };

              try {
                const handler = this.handlers.get(request.method);
                if (!handler) {
                  response.error = {
                    code: -32601,
                    message: `Method not found: ${request.method}`
                  };
                } else {
                  response.result = await handler(request.params);
                }
              } catch (error) {
                response.error = {
                  code: -32603,
                  message: error.message
                };
              }

              socket.send(JSON.stringify(response));
            } 
            // Handle notification (no response)
            else {
              const handler = this.handlers.get(request.method);
              if (handler) {
                handler(request.params).catch(console.error);
              }
            }
          } catch (error) {
            console.error("Message handling error:", error);
          }
        };

        socket.onclose = () => {
          console.log("macOS app disconnected");
          this.connections.delete(socket);
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        return response;
      }

      // Regular HTTP endpoint for health check
      if (req.url.endsWith("/health")) {
        return new Response(JSON.stringify({ status: "ok", connections: this.connections.size }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response("HLVM Bridge WebSocket Server", { status: 200 });
    });
  }

  // Send notification to all connected clients
  broadcast(method: string, params?: any) {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method,
      params
    };
    
    const message = JSON.stringify(notification);
    for (const socket of this.connections) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }

  // Send request to macOS app and wait for response
  async request(method: string, params?: any): Promise<any> {
    if (this.connections.size === 0) {
      throw new Error("No macOS app connected");
    }

    const socket = this.connections.values().next().value;
    const id = `req-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Request timeout"));
      }, 5000);

      const handler = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data) as JSONRPCResponse;
          if (response.id === id) {
            clearTimeout(timeout);
            socket.removeEventListener("message", handler);
            
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch {}
      };

      socket.addEventListener("message", handler);
      
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params
      };
      
      socket.send(JSON.stringify(request));
    });
  }

  stop() {
    for (const socket of this.connections) {
      socket.close();
    }
    this.connections.clear();
    this.server?.shutdown();
  }
}

// Export for use in HLVM
export { HLVMBridge };
export const bridge = new HLVMBridge();

// Start bridge if running as standalone
if (import.meta.main) {
  await bridge.start(11436);
}