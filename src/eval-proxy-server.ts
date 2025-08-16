#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-ffi


// HTTP constants inlined to avoid module loading issues
const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS'
} as const;

const HTTP_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  ACCESS_CONTROL_ALLOW_ORIGIN: 'Access-Control-Allow-Origin',
  ACCESS_CONTROL_ALLOW_METHODS: 'Access-Control-Allow-Methods',
  ACCESS_CONTROL_ALLOW_HEADERS: 'Access-Control-Allow-Headers'
} as const;

const HEADER_VALUES = {
  JSON: 'application/json'
} as const;

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

// Emoji indicators for consistent output
const EMOJI = {
  ERROR: '❌',
  SUCCESS: '✅',
  SAVING: '💾',
  STORAGE: '📦',
  EMPTY: '📭',
  CLEARED: '💨',
  WARNING: '⚠️',
  TABLE: '📊',
  ARROW: '→'
} as const;

// Formatting constants
const FORMAT = {
  SEPARATOR: '━━━━━━━━━━━━━━━━━━━',
  HEADER_TOP: '╔══════════════════════════════════════════════════════════════════════╗',
  HEADER_MIDDLE: '║',
  HEADER_BOTTOM: '╚══════════════════════════════════════════════════════════════════════╝'
} as const;



import { Database } from "https://deno.land/x/sqlite3@0.12.0/mod.ts";

const PORT = 11437;
const SQLITE_PATH = `${Deno.env.get("HOME")}/Library/Application Support/HLVM/HLVM.sqlite`;



/**
 * Common response utility
 */
function createJsonResponse(data: any, status = HTTP_STATUS.OK): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      [HTTP_HEADERS.CONTENT_TYPE]: HEADER_VALUES.JSON, 
      [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN]: "*" 
    }
  });
}

/**
 * HTTP Proxy Server for HLVM Module Management
 * 
 * Provides REST API endpoints for managing ESM modules
 * from the Deno REPL. Uses SQLite for storage.
 * 
 * Endpoints:
 * - POST /hlvm/save - Save value with optional spotlight flag
 * - GET /hlvm/list-spotlight - List spotlight modules for globals
 * - GET /hlvm/load-modules - Load hlvm.* workspace modules
 */
class EvalProxyServer {
  private db!: Database;

  constructor() {
  }

  private async init() {
    // Ensure directory exists
    const sqliteDir = SQLITE_PATH.substring(0, SQLITE_PATH.lastIndexOf("/"));
    await Deno.mkdir(sqliteDir, { recursive: true });
    
    // Open SQLite database
    this.db = new Database(SQLITE_PATH);
    
    // Ensure modules table exists with proper schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS modules (
        key TEXT PRIMARY KEY,
        namespace TEXT NOT NULL,
        source_code TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        type TEXT DEFAULT 'javascript',
        updated_at INTEGER NOT NULL,
        spotlight BOOLEAN DEFAULT 1
      )
    `);
    
    // Add spotlight column to existing table if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE modules ADD COLUMN spotlight BOOLEAN DEFAULT 1`);
    } catch (e) {
      // Column already exists, ignore error
    }
    // Log count silently - no console output needed
  }


  async handle(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);

    // Health check for readiness detection
    if (pathname === '/health' && req.method === HTTP_METHODS.GET) {
      return createJsonResponse({ ok: true, port: PORT });
    }

    if (req.method === HTTP_METHODS.OPTIONS) {
      return new Response(null, { 
        headers: { 
          [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN]: "*",
          [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS]: "GET, POST, DELETE",
          [HTTP_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS]: HTTP_HEADERS.CONTENT_TYPE
        }
      });
    }

    // Handle hlvm namespace persistence to modules table
    
    /**
     * POST /hlvm/save
     * Save a value to modules table with optional spotlight visibility
     * Body: { key: string, value: any, valueType: string, spotlight: boolean }
     */
    if (pathname === '/hlvm/save' && req.method === HTTP_METHODS.POST) {
      try {
        const { key, value, valueType, spotlight = true } = await req.json();
        
        if (!key || value === undefined) {
          return createJsonResponse({
            error: 'Missing required fields: key, value'
          }, HTTP_STATUS.BAD_REQUEST);
        }
        
        // Always store as JSON-stringified value to ensure consistent deserialization
        let sourceCode: string;
        
        // For strings that are already serialized (not primitive strings), store as-is
        if (valueType === 'string' && typeof value === 'string') {
            sourceCode = value;
        } else {
            sourceCode = JSON.stringify(value);
        }
        
        // Create metadata matching HlvmStore format
        const metadata = {
          name: key,
          description: `User-defined ${valueType}: hlvm.${key}`,
          developer: 'User',
          version: '1.0.0',
          category: 'user',
          isUserModule: true,
          type: valueType,
          last_updated: new Date().toISOString()
        };
        
        // Determine the key format based on spotlight flag
        const moduleKey = spotlight ? key : `hlvm.${key}`;
        const namespace = spotlight ? key : `hlvm.${key}`;
        
        // Save to modules table
        this.db.prepare(
          "INSERT OR REPLACE INTO modules (key, namespace, source_code, metadata, type, updated_at, spotlight) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(
          moduleKey,
          namespace,
          sourceCode,
          JSON.stringify(metadata),
          valueType,
          Math.floor(Date.now() / 1000),
          spotlight ? 1 : 0
        );
        
        
        return createJsonResponse({
          success: true,
          message: spotlight ? `Saved ${key} to Spotlight` : `Saved hlvm.${key} to workspace`
        });
      } catch (e) {
        console.error("User module save error:", e);
        return createJsonResponse({
          error: `Failed to save user module: ${e.message}`
        }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }
    
    /**
     * GET /hlvm/list-spotlight
     * List all modules with spotlight=true for loading as globals
     * Response: { modules: Array<{key, value, type}> }
     */
    if (pathname === '/hlvm/list-spotlight' && req.method === HTTP_METHODS.GET) {
      try {
        const rows = this.db.prepare(
          "SELECT key, source_code, type FROM modules WHERE spotlight = 1 AND key NOT LIKE 'hlvm.%'"
        ).all();
        
        const modules = rows.map(row => {
          const type = row.type as string;
          const sourceCode = row.source_code as string;
          
          let value: any;
          if (type === 'string') {
            // For strings, return as-is (no JSON.parse needed)
            value = sourceCode;
          } else {
            // For other types, parse from JSON
            value = JSON.parse(sourceCode);
          }
          
          return {
            key: row.key as string,
            value: value,
            type: type
          };
        });
        
        return createJsonResponse({
          success: true,
          modules
        });
      } catch (e) {
        console.error("List spotlight error:", e);
        return createJsonResponse({
          error: `Failed to list spotlight modules: ${e.message}`
        }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }
    
    /**
     * Analyze ESM module to extract function signature using proper parsing
     */
    async function analyzeModuleSignature(source: string, name: string): Promise<{ signature: string, paramCount: number, params: string[] }> {
      try {
        // Create a temporary file to analyze the module properly
        const tempFile = await Deno.makeTempFile({ suffix: '.mjs' });
        await Deno.writeTextFile(tempFile, source);
        
        try {
          // Import the module dynamically to get the actual export
          const module = await import(tempFile);
          
          // Get the default export
          const exportedFunc = module.default;
          
          if (typeof exportedFunc === 'function') {
            // Parse the function to get parameters
            const fnString = exportedFunc.toString();
            
            // Handle various function formats:
            // function name(a, b) {}
            // async function(a, b) {}
            // (a, b) => {}
            // async (a, b) => {}
            // ({a, b}) => {} - destructured params
            // (a = 1, b = 2) => {} - default params
            // (...args) => {} - rest params
            
            // Extract parameter list
            let paramsMatch = fnString.match(/^(?:async\s+)?(?:function\s*(?:\w+)?)?\s*\(([^)]*)\)/);
            if (!paramsMatch) {
              // Try arrow function
              paramsMatch = fnString.match(/^(?:async\s+)?\(([^)]*)\)\s*=>/);
            }
            if (!paramsMatch) {
              // Try single param arrow function without parens
              paramsMatch = fnString.match(/^(?:async\s+)?(\w+)\s*=>/);
              if (paramsMatch) {
                paramsMatch[1] = paramsMatch[1]; // Single param
              }
            }
            
            if (paramsMatch) {
              const paramsStr = paramsMatch[1].trim();
              
              if (!paramsStr) {
                // No parameters
                return {
                  signature: `${name}()`,
                  paramCount: 0,
                  params: []
                };
              }
              
              // Parse parameters (handle destructuring, defaults, rest)
              const params: string[] = [];
              let depth = 0;
              let current = '';
              
              for (const char of paramsStr) {
                if (char === '{' || char === '[') depth++;
                else if (char === '}' || char === ']') depth--;
                else if (char === ',' && depth === 0) {
                  const param = current.trim();
                  if (param) {
                    // Extract parameter name (before = for defaults, before : for types)
                    const paramName = param.split(/[=:]/, 1)[0].trim();
                    // Handle rest parameters
                    const cleanName = paramName.replace(/^\.\.\./, '');
                    params.push(cleanName);
                  }
                  current = '';
                  continue;
                }
                current += char;
              }
              
              // Don't forget the last parameter
              if (current.trim()) {
                const param = current.trim();
                const paramName = param.split(/[=:]/, 1)[0].trim();
                const cleanName = paramName.replace(/^\.\.\./, '');
                params.push(cleanName);
              }
              
              return {
                signature: `${name}(${params.join(', ')})`,
                paramCount: params.length,
                params
              };
            }
          }
          
          // Not a function export
          return {
            signature: `${name}`,
            paramCount: 0,
            params: []
          };
          
        } finally {
          // Clean up temp file
          await Deno.remove(tempFile).catch(() => {});
        }
        
      } catch (error) {
        console.error('Failed to analyze module:', error);
        
        // Fallback: Use regex patterns for common ESM formats
        const patterns = [
          // export default function name(params)
          /export\s+default\s+(?:async\s+)?function\s+\w*\s*\(([^)]*)\)/,
          // export default (params) =>
          /export\s+default\s+(?:async\s+)?\(([^)]*)\)\s*=>/,
          // export default async (params) =>
          /export\s+default\s+async\s+\(([^)]*)\)\s*=>/,
          // Single param arrow: export default param =>
          /export\s+default\s+(\w+)\s*=>/,
          // export function name(params) as default
          /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)[^]*?export\s*{[^}]*\1\s+as\s+default/,
        ];
        
        for (const pattern of patterns) {
          const match = source.match(pattern);
          if (match) {
            const paramsStr = (match[2] || match[1] || '').trim();
            const params = paramsStr 
              ? paramsStr.split(',').map(p => {
                  // Clean up parameter (remove types, defaults, destructuring)
                  return p.trim().split(/[=:]/, 1)[0].trim().replace(/^\.\.\./, '');
                })
              : [];
            
            return {
              signature: `${name}(${params.join(', ')})`,
              paramCount: params.length,
              params
            };
          }
        }
        
        // Last resort: assume no parameters
        return {
          signature: `${name}()`,
          paramCount: 0,
          params: []
        };
      }
    }
    
    /**
     * POST /hlvm/import-module
     * Import an ESM module from drag & drop
     * Body: { name: string, namespace: string, source: string, type: string, metadata: object }
     */
    if (pathname === '/hlvm/import-module' && req.method === HTTP_METHODS.POST) {
      try {
        const { name, namespace, source, type, metadata } = await req.json();
        
        if (!name || !namespace || !source) {
          return createJsonResponse({
            error: 'Missing required fields: name, namespace, source'
          }, HTTP_STATUS.BAD_REQUEST);
        }
        
        // Analyze module signature
        const signatureInfo = await analyzeModuleSignature(source, name);
        
        // Prepare module metadata
        const moduleMetadata = {
          ...metadata,
          name: name,
          description: `User-imported ${type} module: ${namespace}`,
          developer: 'User',
          version: '1.0.0',
          category: 'user-module',
          isUserModule: true,
          type: type,
          importedAt: new Date().toISOString(),
          signature: signatureInfo.signature,
          paramCount: signatureInfo.paramCount,
          params: signatureInfo.params
        };
        
        // Save to modules table
        this.db.prepare(
          "INSERT OR REPLACE INTO modules (key, namespace, source_code, metadata, type, updated_at, spotlight) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(
          name,
          namespace,
          source,
          JSON.stringify(moduleMetadata),
          'module',
          Math.floor(Date.now() / 1000),
          1  // Show in Spotlight by default
        );
        
        // Post notification for real-time sync
        await new Deno.Command("notifyutil", {
          args: ["-p", "com.hlvm.modules.changed"]
        }).output();
        
        return createJsonResponse({
          success: true,
          message: `Module ${name} imported successfully`,
          namespace: namespace
        });
      } catch (e) {
        console.error("Module import error:", e);
        return createJsonResponse({
          error: `Failed to import module: ${e.message}`
        }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }
    
    /**
     * DELETE /hlvm/clear-all
     * Clear all modules from database (for testing)
     */
    if (pathname === '/hlvm/clear-all' && req.method === HTTP_METHODS.DELETE) {
      try {
        // Delete all modules
        this.db.exec("DELETE FROM modules");
        
        // Post notification for real-time sync
        await new Deno.Command("notifyutil", {
          args: ["-p", "com.hlvm.modules.changed"]
        }).output();
        
        const message = "All modules cleared from database";
        console.log(`🗑️ ${message}`);
        
        return createJsonResponse({
          success: true,
          message
        });
      } catch (e) {
        console.error("Clear all error:", e);
        return createJsonResponse({
          error: `Failed to clear modules: ${e.message}`
        }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }
    
    /**
     * GET /hlvm/load-modules
     * Load all user modules from the shared modules table (for hlvm.* namespace)
     */
    if (pathname === '/hlvm/load-modules' && req.method === HTTP_METHODS.GET) {
      try {
        const rows = this.db.prepare(
          "SELECT key, namespace, source_code, type FROM modules WHERE namespace LIKE 'hlvm.%' AND spotlight = 0"
        ).all();
        
        const modules: Record<string, any> = {};
        
        for (const row of rows) {
          const key = (row.namespace as string).replace('hlvm.', '');
          const type = row.type as string;
          const sourceCode = row.source_code as string;
          
          try {
            // Convert source code back to value based on type
            let value: any;
            if (type === 'function') {
              // For functions, eval the source
              value = eval(`(${sourceCode})`);
            } else if (type === 'object' || type === 'array' || type === 'number' || type === 'boolean') {
              // For JSON-serializable types
              value = JSON.parse(sourceCode);
            } else if (type === 'string') {
              // For strings, return as-is (no JSON.parse needed)
              value = sourceCode;
            } else {
              // For any other types
              value = sourceCode;
            }
            
            modules[key] = value;
          } catch (e) {
            console.error(`Failed to parse module ${key}:`, e);
            // If parsing fails, return the raw source
            modules[key] = sourceCode;
          }
        }
        
        return createJsonResponse({ modules });
      } catch (e) {
        console.error("User module load error:", e);
        return createJsonResponse({
          error: `Failed to load user modules: ${e.message}`
        }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }
    
    return new Response("Not Found", { status: HTTP_STATUS.NOT_FOUND });
  }

  async startServer() {
    await this.init();
    Deno.serve({ port: PORT }, (req) => this.handle(req));
    // Signal readiness explicitly for the host process to detect
    console.log('HLVM_PROXY_READY');
  }
}

// Start the server and await readiness
const server = new EvalProxyServer();
await server.startServer();
