// Resource Management Utilities - Clean patterns for resource cleanup

/**
 * Manages a resource with automatic cleanup
 * @template T
 * @param {() => T | Promise<T>} acquire - Function to acquire resource
 * @param {(resource: T) => void | Promise<void>} release - Function to release resource
 * @param {(resource: T) => any} use - Function to use resource
 * @returns {Promise<any>} Result from use function
 */
export async function withResource(acquire, release, use) {
  let resource = null;
  try {
    resource = await acquire();
    return await use(resource);
  } finally {
    if (resource !== null) {
      try {
        await release(resource);
      } catch (error) {
        console.error('Resource cleanup failed:', error);
      }
    }
  }
}

/**
 * Creates a managed WebSocket connection
 */
export class ManagedWebSocket {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.listeners = new Map();
    this.connectionPromise = null;
  }

  async connect() {
    if (this.connectionPromise) return this.connectionPromise;
    if (this.isConnected()) return true;

    this.cleanup();
    
    this.connectionPromise = new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url);
      
      const cleanup = (error) => {
        this.connectionPromise = null;
        this.cleanup();
        if (error) reject(error);
      };

      this.socket.onopen = () => {
        this.connectionPromise = null;
        resolve(true);
      };
      
      this.socket.onerror = (e) => cleanup(new Error(`Connection failed: ${e}`));
      this.socket.onclose = () => this.cleanup();
    });

    return this.connectionPromise;
  }

  on(event, handler) {
    if (!this.socket) return;
    this.socket.addEventListener(event, handler);
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
  }

  off(event, handler) {
    if (!this.socket) return;
    this.socket.removeEventListener(event, handler);
    
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  cleanup() {
    // Remove all listeners
    for (const [event, handlers] of this.listeners) {
      for (const handler of handlers) {
        if (this.socket) {
          this.socket.removeEventListener(event, handler);
        }
      }
    }
    this.listeners.clear();

    // Close socket
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  send(data) {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }
    this.socket.send(data);
  }
}

/**
 * Creates a managed file watcher
 */
export class ManagedWatcher {
  constructor(path) {
    this.path = path;
    this.watcher = null;
    this.abortController = null;
  }

  async start(onChange) {
    this.stop(); // Clean up any existing watcher
    
    this.watcher = Deno.watchFs(this.path);
    this.abortController = new AbortController();
    
    const watchLoop = async () => {
      try {
        for await (const event of this.watcher) {
          if (this.abortController.signal.aborted) break;
          
          if (event.kind === 'modify' || event.kind === 'create') {
            await onChange(event);
          }
        }
      } finally {
        this.cleanup();
      }
    };

    watchLoop(); // Start async without awaiting
    return true;
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.cleanup();
  }

  cleanup() {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {}
      this.watcher = null;
    }
  }
}


