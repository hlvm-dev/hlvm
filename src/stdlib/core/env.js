// HLVM Environment Settings - Persistent configuration
// Uses existing database infrastructure

import { db } from "./database.js";

// Essential defaults - only critical parameters
const DEFAULTS = {
  'ai.model': 'qwen2.5-coder:1.5b',
  'ollama.host': '127.0.0.1:11434',
  'ai.temperature': 0.7,
  'ai.max_tokens': 4000
};

// Create env table on module load
db.exec(`
  CREATE TABLE IF NOT EXISTS hlvm_env (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

export function get(key) {
  const row = db.prepare('SELECT value FROM hlvm_env WHERE key = ?').get(key);
  if (row) {
    // Parse numbers for numeric settings
    if (key === 'ai.temperature' || key === 'ai.max_tokens') {
      return parseFloat(row.value);
    }
    return row.value;
  }
  return DEFAULTS[key];
}

export function set(key, value) {
  db.prepare(`
    INSERT OR REPLACE INTO hlvm_env (key, value, updated_at) 
    VALUES (?, ?, ?)
  `).run(key, String(value), Date.now());
  console.log(`✓ Set ${key} = ${value}`);
  return value;
}

export function show() {
  const current = db.prepare('SELECT * FROM hlvm_env ORDER BY key').all();
  
  console.log('\nHLVM Environment:');
  console.log('─'.repeat(40));
  
  // Show current settings
  if (current.length > 0) {
    current.forEach(row => {
      console.log(`${row.key}: ${row.value}`);
    });
  } else {
    console.log('(no custom settings)');
  }
  
  // Show available defaults not yet set
  console.log('\nAvailable settings:');
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    if (!current.find(r => r.key === key)) {
      console.log(`${key}: ${value} (default)`);
    }
  });
  
  console.log('\nUsage:');
  console.log('  hlvm.env.set("ai.model", "codellama:7b")');
  console.log('  hlvm.env.get("ai.model")');
}

export function list() {
  const all = db.prepare('SELECT * FROM hlvm_env ORDER BY key').all();
  return Object.fromEntries(all.map(row => [row.key, row.value]));
}

export function reset(key) {
  if (key) {
    db.prepare('DELETE FROM hlvm_env WHERE key = ?').run(key);
    console.log(`✓ Reset ${key} to default`);
  } else {
    db.prepare('DELETE FROM hlvm_env').run();
    console.log('✓ Reset all settings to defaults');
  }
}

export default {
  get,
  set,
  show,
  list,
  reset
};