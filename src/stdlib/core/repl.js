// REPL module - REPL-specific functionality including history
// History is saved to SQLite database for persistence across sessions

import { db, path as dbPath } from "./database.js";

// Create history table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS repl_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

// Create index for faster timestamp queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_repl_history_timestamp 
  ON repl_history(timestamp DESC)
`);

// History management
export const history = {
  // Get history entries
  get: (limit) => {
    let query;
    let params = [];
    
    if (typeof limit === 'number' && limit > 0) {
      query = `
        SELECT command, timestamp 
        FROM repl_history 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      params = [limit];
    } else {
      query = `
        SELECT command, timestamp 
        FROM repl_history 
        ORDER BY timestamp DESC
      `;
    }
    
    const rows = db.prepare(query).all(...params);
    // Return in chronological order (oldest first)
    return rows.reverse().map(r => r.command);
  },
  
  // Search history for commands containing pattern
  search: (pattern) => {
    if (!pattern) return [];
    
    const rows = db.prepare(`
      SELECT command, timestamp 
      FROM repl_history 
      WHERE command LIKE ? 
      ORDER BY timestamp DESC
    `).all(`%${pattern}%`);
    
    return rows.map(r => r.command);
  },
  
  // Clear all history
  clear: () => {
    db.exec("DELETE FROM repl_history");
    return true;
  },
  
  // Get history count
  size: () => {
    const result = db.prepare("SELECT COUNT(*) as count FROM repl_history").get();
    return result.count;
  },
  
  // Get last command
  last: () => {
    const row = db.prepare(`
      SELECT command 
      FROM repl_history 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get();
    return row ? row.command : null;
  },
  
  // Add command to history (internal use)
  _add: (command) => {
    if (!command || command.trim() === '') return false;
    
    // Don't add duplicate consecutive commands
    const last = history.last();
    if (last === command) return false;
    
    db.prepare(`
      INSERT INTO repl_history (command, timestamp) 
      VALUES (?, ?)
    `).run(command, Date.now());
    
    return true;
  }
};

// Hook into global eval to capture all evaluations
// This works for both REPL and GUI playground since both use eval
if (globalThis.eval) {
  const originalEval = globalThis.eval;
  
  // Replace global eval
  globalThis.eval = function(code) {
    // Save to history before eval (only if it's a string)
    if (typeof code === 'string') {
      history._add(code);
    }
    
    // Call original eval
    return originalEval.call(this, code);
  };
}

// For GUI integration: The GUI sends commands through stdin which eventually
// get evaluated. We can capture these by monitoring console outputs that indicate
// a command was evaluated.

// Check if we're in a context where we can access environment variables
const historyDb = Deno.env.get("HLVM_HISTORY_DB");

// Make the add function globally available for GUI/CLI integration
if (typeof globalThis.__hlvm_history_buffer === 'undefined') {
  globalThis.__hlvm_history_buffer = [];
  globalThis.__hlvm_add_to_history = (cmd) => {
    history._add(cmd);
    globalThis.__hlvm_history_buffer.push(cmd);
  };
}

// For CLI: The best we can do is provide a wrapper function
// Users can use h() instead of direct eval to save history
globalThis.h = function(code) {
  history._add(code);
  return eval(code);
};

// Also provide a way to evaluate and save the last expression
Object.defineProperty(globalThis, '_', {
  get() {
    // Get the last evaluated result (if available)
    return globalThis.___lastResult;
  },
  set(value) {
    globalThis.___lastResult = value;
  }
});

// Export for use in hlvm namespace
export default {
  history
};