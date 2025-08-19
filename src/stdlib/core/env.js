// HLVM Environment Settings - Persistent configuration
// Uses existing database infrastructure

import { db } from "./database.js";

// Settings schema with validation
const SCHEMA = {
  'ai.model': {
    type: 'string',
    default: 'qwen2.5-coder:1.5b',
    description: 'Default AI model for chat/revise',
    validate: (v) => typeof v === 'string' && v.length > 0
  },
  'ai.temperature': {
    type: 'number',
    default: 0.7,
    description: 'AI creativity (0=focused, 2=creative)',
    validate: (v) => {
      const num = Number(v);
      return !isNaN(num) && num >= 0 && num <= 2;
    },
    parse: (v) => Number(v)
  },
  'ai.max_tokens': {
    type: 'number',
    default: 4000,
    description: 'Max response length',
    validate: (v) => {
      const num = Number(v);
      return !isNaN(num) && num > 0 && num <= 100000;
    },
    parse: (v) => Math.floor(Number(v))
  },
  'ollama.host': {
    type: 'string',
    default: '127.0.0.1:11434',
    description: 'Ollama server address',
    validate: (v) => typeof v === 'string' && v.includes(':')
  }
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
  // Only return values for known settings
  const schema = SCHEMA[key];
  if (!schema) {
    return undefined; // Unknown key
  }
  
  const row = db.prepare('SELECT value FROM hlvm_env WHERE key = ?').get(key);
  if (row) {
    // Parse value if parser exists
    if (schema.parse) {
      return schema.parse(row.value);
    }
    return row.value;
  }
  
  // Return default
  return schema.default;
}

export function set(key, value) {
  // Only allow known settings
  const schema = SCHEMA[key];
  if (!schema) {
    console.warn(`⚠️ Unknown setting '${key}' (ignored)`);
    return undefined;
  }
  
  // Validate value
  if (!schema.validate(value)) {
    console.warn(`⚠️ Invalid value for ${key} (expected ${schema.type}), keeping current value`);
    return get(key); // Return current value
  }
  
  // Parse value if needed
  const finalValue = schema.parse ? schema.parse(value) : value;
  
  // Store in database
  db.prepare(`
    INSERT OR REPLACE INTO hlvm_env (key, value, updated_at) 
    VALUES (?, ?, ?)
  `).run(key, String(finalValue), Date.now());
  
  console.log(`✓ Set ${key} = ${finalValue}`);
  return finalValue;
}

export function show() {
  console.log('\n\x1b[36m═══ HLVM Environment Settings ═══\x1b[0m\n');
  
  // Show all settings with current values and descriptions
  for (const [key, schema] of Object.entries(SCHEMA)) {
    const currentValue = get(key);
    const isCustom = has(key);
    const status = isCustom ? '\x1b[32m●\x1b[0m' : '\x1b[90m○\x1b[0m';
    const valueDisplay = isCustom ? `\x1b[33m${currentValue}\x1b[0m` : `\x1b[90m${currentValue}\x1b[0m`;
    
    console.log(`${status} ${key}: ${valueDisplay}`);
    console.log(`  \x1b[90m${schema.description}\x1b[0m`);
    if (!isCustom) {
      console.log(`  \x1b[90m(using default)\x1b[0m`);
    }
  }
  
  console.log('\n\x1b[33mUsage:\x1b[0m');
  console.log('  hlvm.env.set("ai.model", "llama3.2")   \x1b[90m# Set value\x1b[0m');
  console.log('  hlvm.env.get("ai.model")               \x1b[90m# Get value\x1b[0m');
  console.log('  hlvm.env.reset("ai.model")             \x1b[90m# Reset to default\x1b[0m');
  console.log('  hlvm.env.reset()                       \x1b[90m# Reset ALL to defaults\x1b[0m');
  console.log('  hlvm.env.list()                        \x1b[90m# Get all settings\x1b[0m');
  console.log('  hlvm.env.show()                        \x1b[90m# Display this help\x1b[0m\n');
}

export function list() {
  // Return all settings with current values (custom or default)
  const result = {};
  for (const key in SCHEMA) {
    result[key] = get(key);
  }
  return result;
}

export function reset(key) {
  if (key) {
    // Reset single setting to default
    if (!SCHEMA[key]) {
      console.warn(`⚠️ Unknown setting '${key}'`);
      return false;
    }
    db.prepare('DELETE FROM hlvm_env WHERE key = ?').run(key);
    console.log(`✓ Reset ${key} to default (${SCHEMA[key].default})`);
    return true;
  } else {
    // Reset ALL settings to defaults
    db.prepare('DELETE FROM hlvm_env').run();
    console.log('✓ Reset all settings to defaults');
    return true;
  }
}

export function has(key) {
  // Check if setting has a custom value (not using default)
  if (!SCHEMA[key]) {
    return false; // Unknown key
  }
  const row = db.prepare('SELECT 1 FROM hlvm_env WHERE key = ?').get(key);
  return !!row;
}

export default {
  get,
  set,
  list,
  reset,  // Reset to defaults (not remove!)
  has,
  show    // Extra helper for pretty display
};