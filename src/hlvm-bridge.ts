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

// Handler types for better type safety
type HandlerFunction = (params: any) => Promise<any>;
type HandlerRegistry = Map<string, HandlerFunction>;

// Separate handler classes following Single Responsibility Principle
class SystemHandlers {
  static getInfo(): Promise<any> {
    return Promise.resolve({
      platform: Deno.build.os,
      arch: Deno.build.arch,
      version: "2.0",
      pid: Deno.pid
    });
  }
}

class ModuleHandlers {
  static async list(): Promise<any> {
    return globalThis.hlvm?.modules?.list?.() || [];
  }

  static async save(params: any): Promise<any> {
    if (!globalThis.hlvm?.modules?.save) {
      throw new Error("Module save not available");
    }
    return globalThis.hlvm.modules.save(params.name, params.code);
  }

  static async load(params: any): Promise<any> {
    if (!globalThis.hlvm?.modules?.load) {
      throw new Error("Module load not available");
    }
    return globalThis.hlvm.modules.load(params.name);
  }
}

class AIHandlers {
  static async generate(params: any): Promise<any> {
    if (!globalThis.hlvm?.ai?.ollama?.chat) {
      throw new Error("AI not available");
    }
    return globalThis.hlvm.ai.ollama.chat(params.prompt, params.model);
  }
}

class FileSystemHandlers {
  static async read(params: any): Promise<string> {
    return Deno.readTextFile(params.path);
  }

  static async write(params: any): Promise<{ success: boolean }> {
    await Deno.writeTextFile(params.path, params.content);
    return { success: true };
  }

  static async exists(params: any): Promise<boolean> {
    try {
      await Deno.stat(params.path);
      return true;
    } catch {
      return false;
    }
  }
}

// Connection manager for WebSocket connections
class ConnectionManager {
  private connections = new Set<WebSocket>();

  add(socket: WebSocket): void {
    this.connections.add(socket);
  }

  remove(socket: WebSocket): void {
    this.connections.delete(socket);
  }

  get size(): number {
    return this.connections.size;
  }

  get all(): Set<WebSocket> {
    return this.connections;
  }

  get first(): WebSocket | undefined {
    return this.connections.values().next().value;
  }

  clear(): void {
    for (const socket of this.connections) {
      socket.close();
    }
    this.connections.clear();
  }
}

class HLVMBridge {
  private connectionManager = new ConnectionManager();
  private server?: Deno.HttpServer;
  private handlers: HandlerRegistry = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // System handlers
    this.handlers.set("system.info", SystemHandlers.getInfo);

    // Module handlers
    this.handlers.set("modules.list", ModuleHandlers.list);
    this.handlers.set("modules.save", ModuleHandlers.save);
    this.handlers.set("modules.load", ModuleHandlers.load);

    // AI handlers
    this.handlers.set("ai.generate", AIHandlers.generate);

    // File system handlers
    this.handlers.set("fs.read", FileSystemHandlers.read);
    this.handlers.set("fs.write", FileSystemHandlers.write);
    this.handlers.set("fs.exists", FileSystemHandlers.exists);
  }

  async start(port = 11436): Promise<void> {
    this.server = Deno.serve({ 
      port, 
      onListen: () => console.log(`HLVM Bridge running on ws://localhost:${port}`)
    }, (req) => this.handleRequest(req));
  }

  private handleRequest(req: Request): Response {
    if (req.headers.get("upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(req);
    }
    
    if (req.url.endsWith("/health")) {
      return this.handleHealthCheck();
    }
    
    return new Response("HLVM Bridge WebSocket Server", { status: 200 });
  }

  private handleWebSocketUpgrade(req: Request): Response {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => this.handleSocketOpen(socket);
    socket.onmessage = (event) => this.handleSocketMessage(socket, event);
    socket.onclose = () => this.handleSocketClose(socket);
    socket.onerror = (error) => console.error("WebSocket error:", error);
    
    return response;
  }

  private handleSocketOpen(socket: WebSocket): void {
    console.log("macOS app connected");
    this.connectionManager.add(socket);
    this.sendConnectionNotification(socket);
  }

  private sendConnectionNotification(socket: WebSocket): void {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method: "connection.established",
      params: {
        version: "2.0",
        capabilities: Array.from(this.handlers.keys())
      }
    };
    socket.send(JSON.stringify(notification));
  }

  private async handleSocketMessage(socket: WebSocket, event: MessageEvent): Promise<void> {
    try {
      const request = JSON.parse(event.data) as JSONRPCRequest;
      
      if (request.jsonrpc !== "2.0") {
        throw new Error("Invalid JSON-RPC version");
      }

      if (request.id !== undefined) {
        await this.handleRequestWithResponse(socket, request);
      } else {
        await this.handleNotification(request);
      }
    } catch (error) {
      console.error("Message handling error:", error);
    }
  }

  private async handleRequestWithResponse(socket: WebSocket, request: JSONRPCRequest): Promise<void> {
    const response: JSONRPCResponse = {
      jsonrpc: "2.0",
      id: request.id!
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

  private async handleNotification(request: JSONRPCRequest): Promise<void> {
    const handler = this.handlers.get(request.method);
    if (handler) {
      handler(request.params).catch(console.error);
    }
  }

  private handleSocketClose(socket: WebSocket): void {
    console.log("macOS app disconnected");
    this.connectionManager.remove(socket);
  }

  private handleHealthCheck(): Response {
    return new Response(JSON.stringify({ 
      status: "ok", 
      connections: this.connectionManager.size 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  broadcast(method: string, params?: any): void {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method,
      params
    };
    
    const message = JSON.stringify(notification);
    for (const socket of this.connectionManager.all) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }

  async request(method: string, params?: any): Promise<any> {
    const socket = this.connectionManager.first;
    if (!socket) {
      throw new Error("No macOS app connected");
    }

    return this.sendRequestAndWaitForResponse(socket, method, params);
  }

  private sendRequestAndWaitForResponse(socket: WebSocket, method: string, params?: any): Promise<any> {
    const id = this.generateRequestId();
    const timeoutMs = 5000;
    
    return new Promise((resolve, reject) => {
      let handler: ((event: MessageEvent) => void) | null = null;
      
      const cleanup = () => {
        if (handler) {
          socket.removeEventListener("message", handler);
          handler = null;
        }
      };
      
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Request timeout"));
      }, timeoutMs);
      
      handler = this.createResponseHandler(id, timeout, resolve, reject, cleanup);
      socket.addEventListener("message", handler);
      
      const request: JSONRPCRequest = { jsonrpc: "2.0", id, method, params };
      socket.send(JSON.stringify(request));
    });
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random()}`;
  }

  private createResponseHandler(
    expectedId: string | number,
    timeout: NodeJS.Timeout,
    resolve: (value: any) => void,
    reject: (reason: any) => void,
    cleanup: () => void
  ): (event: MessageEvent) => void {
    return function handler(event: MessageEvent) {
      try {
        const response = JSON.parse(event.data) as JSONRPCResponse;
        if (response.id === expectedId) {
          clearTimeout(timeout);
          cleanup();
          
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      } catch {}
    };
  }

  stop(): void {
    this.connectionManager.clear();
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