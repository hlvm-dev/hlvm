// src/stdlib/ai.js
// HLVM Stdlib AI - High-level AI functions

// ─────────────────────────────────────────────────────────────────────────────
// Minimal terminal UI helpers
const HLVM_PURPLE = '\x1b[35m';
const HLVM_BRIGHT_PURPLE = '\x1b[95m';
const RESET = '\x1b[0m';
const CLEAR_LINE = '\x1b[2K';
const CURSOR_START = '\x1b[0G';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const YELLOW = '\x1b[33m';

function startComputing(message = 'Computing') {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0, interval, first = true;
  try { process.stdout.write(HIDE_CURSOR); } catch {}
  const render = () => {
    const prefix = first ? '\n' : (CLEAR_LINE + CURSOR_START);  // Only one \n, not two
    first = false;
    try {
      process.stdout.write(`${prefix}  ${HLVM_PURPLE}${frames[i]}${RESET}  ${message}...`);
    } catch {}
    i = (i + 1) % frames.length;
  };
  render();
  interval = setInterval(render, 80);
  return {
    update: (m) => { message = m; },
    stop: () => {
      clearInterval(interval);
      try {
        process.stdout.write(CLEAR_LINE + CURSOR_START);
        process.stdout.write(SHOW_CURSOR + '\n');
      } catch {}
    }
  };
}

function showContextUsage(percentage, model = null) {
  const warning = 80, critical = 95;
  let color = HLVM_PURPLE, icon = '○';
  if (percentage >= critical) { color = '\x1b[91m'; icon = '●'; }
  else if (percentage >= warning) { color = YELLOW; icon = '◉'; }
  const msg = model ? `Approaching ${model} usage limit : ${percentage}% context used`
                    : `Context usage: ${percentage}%`;
  try { process.stdout.write(`\n${color}${icon} ${msg}${RESET}\n`); } catch {}
}

function getDefaultModel() {
  return globalThis.hlvm?.env?.get?.("ai.model") || globalThis.EMBEDDED_MODEL || "qwen2.5-coder:1.5b";
}

function reprintReplPrompt() {
  try {
    if (typeof process !== 'undefined' && process.stdout && typeof process.stdout.write === 'function') {
      process.stdout.write('\n\x1b[90mDone. Press Enter to continue.\x1b[0m\n');
    }
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Model manager (Ollama)
let modelChecked = false;
let modelAvailable = false;
let downloadInProgress = false;

async function ensureModel(modelName) {
  const model = modelName || getDefaultModel();
  if (modelChecked && modelAvailable) return true;
  if (downloadInProgress) {
    console.log("⏳ Model download already in progress...");
    while (downloadInProgress) await new Promise(r => setTimeout(r, 1000));
    return modelAvailable;
  }

  try {
    const ollamaCheck = await globalThis.hlvm.core.ai.ollama.list().catch(() => null);
    if (!ollamaCheck) {
      console.log("\n🚀 Starting AI service...");
      await globalThis.hlvm.core.system.exec(["./resources/ollama", "serve"], { background: true });
      await new Promise(r => setTimeout(r, 2000));
    }

    const models = await globalThis.hlvm.core.ai.ollama.list();
    const hasModel = models.models?.some(m => m.name === model);
    if (hasModel) { modelChecked = true; modelAvailable = true; return true; }

    downloadInProgress = true;
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║  🤖 Setting up AI capabilities (one-time download)              ║");
    console.log("║                                                                  ║");
    console.log(`║  Downloading model: ${model.padEnd(40)}  ║`);
    console.log("║  This will take a few minutes but only happens once.            ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");
    console.log("  ⏳ Downloading... (this may take 2-5 minutes)");
    console.log("  📦 Model size: ~1GB");

    try {
      await globalThis.hlvm.core.ai.ollama.pull({ name: model, stream: false });
      console.log("\n✅ Model downloaded successfully!");
    } catch (e) {
      console.error("\n❌ Download failed:", e.message);
      throw e;
    }

    const verify = await globalThis.hlvm.core.ai.ollama.list();
    modelAvailable = verify.models?.some(m => m.name === model);
    if (modelAvailable) console.log("\n🎉 AI capabilities ready! Your command will now continue...\n");
    else console.error("\n❌ Failed to download model. AI features may not work.");

    modelChecked = true;
    downloadInProgress = false;
    return modelAvailable;
  } catch (err) {
    downloadInProgress = false;
    modelChecked = true;
    console.error("\n⚠️ Could not set up AI:", err.message);
    console.error("   AI features will not be available in this session.");
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompts
const SYSTEM_PROMPTS = {
  default: `Improve this text: fix spelling, grammar, and clarity.
Keep the original tone and meaning. Return ONLY the revised text.`,
  professional: `Revise this text to be professional and formal for business communication.
Fix all spelling and grammar errors. Return ONLY the revised text.`,
  casual: `Make this text casual and conversational while fixing errors.
Keep it natural and relaxed. Return ONLY the revised text.`,
  friendly: `Make this text warm, friendly, and approachable.
Fix all errors and add a welcoming tone. Return ONLY the revised text.`,
  concise: `Make this text concise and to the point while keeping all key information.
Remove redundancy and fix errors. Return ONLY the revised text.`,
  formal: `Make this text formal and academic in style.
Use proper grammar and formal vocabulary. Return ONLY the revised text.`
};

const REFACTOR_PROMPTS = {
  all: `Refactor this code comprehensively:
- Apply Clean Code principles and improve naming
- Remove ALL redundancy and duplicate code (DRY)
- Remove unused variables, functions, imports, and dead code
- Simplify complex logic and flatten nested structures
- Update to modern syntax and patterns
- Optimize performance where obvious
- Follow SOLID principles where applicable
Return ONLY the fully refactored code.`,
  clean: `Refactor this code following Clean Code principles.
Remove redundancy, improve naming, extract methods where needed.
Apply DRY principle. Return ONLY the refactored code.`,
  solid: `Refactor this code following SOLID principles.
Break down large parts, improve abstractions. Return ONLY the refactored code.`,
  dry: `Refactor this code to eliminate ALL redundancy. Return ONLY the refactored code.`,
  unused: `Remove ALL unused variables/functions/imports/comments. Return ONLY the cleaned code.`,
  simplify: `Simplify the code for readability without changing behavior. Return ONLY the code.`,
  modern: `Modernize syntax using latest language features. Return ONLY the code.`,
  performance: `Optimize for performance while keeping behavior. Return ONLY the code.`
};

const DIAGRAM_PROMPTS = {
  auto: `Analyze this text and create the most appropriate ASCII diagram.
Use box drawing characters (─│┌┐└┘├┤┬┴┼) and arrows if needed. Return ONLY the diagram.`,
  flowchart: `Convert this text into an ASCII flowchart with box drawing characters. Return ONLY the flowchart.`,
  sequence: `Convert this text into an ASCII sequence diagram. Return ONLY the diagram.`,
  tree: `Convert this text into an ASCII tree. Return ONLY the tree.`,
  graph: `Convert this text into an ASCII graph/network. Return ONLY the diagram.`,
  mindmap: `Convert this text into an ASCII mind map. Return ONLY the diagram.`,
  table: `Extract key data in an ASCII table using box drawing characters. Return ONLY the table.`
};

// ─────────────────────────────────────────────────────────────────────────────
// Public helpers: draw / revise / refactor / chat

export async function draw(input, options = {}) {
  let text = input || await globalThis.hlvm.core.io.clipboard.read();
  if (!text || text.trim() === '') throw new Error('No text to visualize');

  const type = options.type || 'auto';
  const style = options.style || 'simple';
  const validTypes = ['auto','flowchart','sequence','tree','graph','mindmap','table'];
  if (!validTypes.includes(type)) throw new Error(`Invalid type: ${validTypes.join(', ')}`);

  let systemPrompt = DIAGRAM_PROMPTS[type];
  systemPrompt += style === 'detailed'
    ? '\nInclude more detail and annotations where helpful.'
    : '\nKeep it simple and clean, focusing on key elements only.';

  const model = options.model || globalThis.hlvm?.env?.get?.("ai.model") || getDefaultModel();
  await ensureModel(model);

  try {
    await new Promise(r => setTimeout(r, 10));
    const computing = startComputing('Drawing');
    const response = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
      stream: false,
      options: { temperature: 0.1, num_predict: 100, top_p: 0.9, repeat_penalty: 1.0 }
    });
    computing.stop();
    let diagram = (response.message?.content || '')
      .replace(/^```[\w]*\n/, '').replace(/\n```$/, '').trim();
    const ok = /[─│┌┐└┘├┤┬┴┼▼▲►◄╭╮╰╯═║╔╗╚╝╠╣╦╩╬]/.test(diagram);
    if (!ok && diagram.length < 50) console.warn('Generated output may not be a valid diagram');
    return diagram;
  } catch (e) {
    console.error('Failed to generate diagram:', e.message);
    if (e.message.includes('fetch failed') || e.message.includes('ECONNREFUSED'))
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
    return '[Cannot generate diagram]';
  }
}

export async function revise(input, options = {}) {
  let text = input || await globalThis.hlvm.core.io.clipboard.read();
  if (!text || text.trim() === '') throw new Error('No text to revise');

  const tone = options.tone || 'default';
  const valid = ['default','professional','casual','friendly','concise','formal'];
  if (!valid.includes(tone)) throw new Error(`Invalid tone: ${valid.join(', ')}`);
  const systemPrompt = SYSTEM_PROMPTS[tone];

  const model = options.model || globalThis.hlvm?.env?.get?.("ai.model") || getDefaultModel();
  await ensureModel(model);

  try {
    await new Promise(r => setTimeout(r, 10));
    const computing = startComputing('Revising');
    const stream = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
      stream: true,
      options: {
        temperature: options.temperature ?? globalThis.hlvm?.env?.get?.("ai.temperature") ?? 0.3,
        num_predict: globalThis.hlvm?.env?.get?.("ai.max_tokens") ?? 2000,
        top_p: 0.9, repeat_penalty: 1.1
      }
    });

    let revised = '';
    computing.stop();
    process.stdout.write('\x1b[32m');
    for await (const chunk of stream) {
      if (chunk.message?.content) {
        process.stdout.write(chunk.message.content);
        revised += chunk.message.content;
      }
    }
    process.stdout.write('\x1b[0m\n');
    reprintReplPrompt();

    revised = revised.replace(/^```[\w]*\n/, '').replace(/\n```$/, '').replace(/^["']|["']$/g, '').trim();
    if (!revised) { console.warn('Revision empty; returning original'); return text; }
    const ratio = revised.length / text.length;
    if (ratio < 0.2 || ratio > 5) { console.warn('Revision length off; returning original'); return text; }
    return revised;
  } catch (e) {
    console.error('Failed to revise text:', e.message);
    if (e.message.includes('fetch failed') || e.message.includes('ECONNREFUSED'))
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
    return text;
  }
}

export async function refactor(input, options = {}) {
  let code = input || await globalThis.hlvm.core.io.clipboard.read();
  if (!code || code.trim() === '') throw new Error('No code to refactor');

  const type = options.type || 'all';
  const valid = ['all','clean','solid','dry','unused','simplify','modern','performance'];
  if (!valid.includes(type)) throw new Error(`Invalid type: ${valid.join(', ')}`);
  const systemPrompt = REFACTOR_PROMPTS[type];

  const model = options.model || globalThis.hlvm?.env?.get?.("ai.model") || getDefaultModel();
  await ensureModel(model);

  try {
    await new Promise(r => setTimeout(r, 10));
    const computing = startComputing('Refactoring');
    const response = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: code }],
      stream: false,
      options: {
        temperature: options.temperature ?? globalThis.hlvm?.env?.get?.("ai.temperature") ?? 0.2,
        num_predict: globalThis.hlvm?.env?.get?.("ai.max_tokens") ?? 4000,
        top_p: 0.95, repeat_penalty: 1.0
      }
    });
    computing.stop();
    let out = (response.message?.content || code).replace(/^```[\w]*\n/, '').replace(/\n```$/, '').trim();
    if (!out) { console.warn('Refactoring empty; returning original'); return code; }
    return out;
  } catch (e) {
    console.error('Failed to refactor code:', e.message);
    if (e.message.includes('fetch failed') || e.message.includes('ECONNREFUSED'))
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
    return code;
  }
}

const chatHistory = [];
const MAX_CONTEXT_TOKENS = 6000;
const estimateTokens = (t) => Math.ceil((t || '').length / 4);
const calculateHistoryTokens = (msgs) => msgs.reduce((acc, m) => acc + estimateTokens(m.content || ''), 0);
function trimHistory(messages, maxTokens = MAX_CONTEXT_TOKENS) {
  if (!messages.length) return messages;
  const minKeep = Math.min(2, messages.length);
  const out = [];
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = estimateTokens(messages[i].content || '');
    if (out.length < minKeep || count + t <= maxTokens) { out.unshift(messages[i]); count += t; }
    else break;
  }
  return out;
}

export async function chat(input, options = {}) {
  let question = input || await globalThis.hlvm.core.io.clipboard.read();
  if (!question || question.trim() === '') throw new Error('No question to ask');

  // model FIRST (so usage banner can show model name)
  let model = options.model || globalThis.hlvm?.env?.get?.("ai.model") || getDefaultModel();

  let messages;
  if (options.stateless) {
    messages = [{ role: 'user', content: question }];
  } else {
    if (chatHistory.length === 0 || chatHistory[0].role !== 'system') {
      chatHistory.unshift({
        role: 'system',
        content: 'You are a helpful assistant. Remember and use all information from our conversation. When asked about previous topics, refer back to what was discussed earlier.'
      });
    }
    chatHistory.push({ role: 'user', content: question });
    const currentTokens = calculateHistoryTokens(chatHistory);
    if (currentTokens > MAX_CONTEXT_TOKENS) {
      const trimmed = trimHistory(chatHistory, MAX_CONTEXT_TOKENS);
      chatHistory.length = 0; chatHistory.push(...trimmed);
    }
    const usage = Math.round((calculateHistoryTokens(chatHistory) / 8192) * 100);
    if (usage > 80) showContextUsage(usage, model);
    messages = chatHistory;
  }

  if (options.debug) {
    console.log('\x1b[90m[DEBUG] Sending messages:\x1b[0m');
    messages.forEach((m,i) => console.log(`\x1b[90m  [${i}] ${m.role}: ${(m.content||'').slice(0,50)}...\x1b[0m`));
    console.log(`\x1b[90m[DEBUG] Total tokens: ~${calculateHistoryTokens(messages)}\x1b[0m`);
  }

  await ensureModel(model);

  try {
    const stream = options.stream !== false;
    if (stream) {
      await new Promise(r => setTimeout(r, 10));
      const computing = startComputing('Generating');
      const response = await globalThis.hlvm.core.ai.ollama.chat({
        model, messages, stream: true,
        options: {
          temperature: options.temperature ?? globalThis.hlvm?.env?.get?.("ai.temperature") ?? 0.7,
          num_predict: globalThis.hlvm?.env?.get?.("ai.max_tokens") ?? 2000,
          num_ctx: 8192, top_p: 0.95, repeat_penalty: 1.1
        }
      });
      let answer = '';
      computing.stop();
      process.stdout.write('\x1b[32m');
      for await (const chunk of response) {
        if (chunk.message?.content) { process.stdout.write(chunk.message.content); answer += chunk.message.content; }
      }
      process.stdout.write('\x1b[0m\n');
      reprintReplPrompt();
      if (!options.stateless) chatHistory.push({ role: 'assistant', content: answer.trim() });
      return answer.trim();
    } else {
      const resp = await globalThis.hlvm.core.ai.ollama.chat({
        model, messages, stream: false,
        options: {
          temperature: options.temperature ?? globalThis.hlvm?.env?.get?.("ai.temperature") ?? 0.7,
          num_predict: globalThis.hlvm?.env?.get?.("ai.max_tokens") ?? 2000,
          num_ctx: 8192, top_p: 0.95, repeat_penalty: 1.1
        }
      });
      const answer = resp.message?.content || '';
      if (!options.stateless) chatHistory.push({ role: 'assistant', content: answer });
      return answer;
    }
  } catch (e) {
    console.error('Failed to get answer:', e.message);
    if (e.message.includes('fetch failed') || e.message.includes('ECONNREFUSED'))
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
    return `[Error: ${e.message}]`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASK: natural language → command + confirm + exec
// NEW: /dev/tty single-keypress Y/N, real ESC, confirm:false skip, verbose logs

const ASK_DEBUG = !!(globalThis.hlvm?.env?.get?.("ASK_DEBUG") || (typeof Deno !== 'undefined' && Deno.env?.get?.("ASK_DEBUG")));
const logAsk = (...args) => { if (ASK_DEBUG) console.log("[ASK]", ...args); };
const now = () => new Date().toISOString();

async function withTTY(fn) {
  try {
    const tty = await Deno.open("/dev/tty", { read: true, write: true });
    try { return await fn(tty); }
    finally { try { tty.close(); } catch {} }
  } catch (e) {
    logAsk("No /dev/tty:", e?.message || e);
    return await fn(null);
  }
}

async function writeTTY(tty, text) {
  if (!tty) return;
  const enc = new TextEncoder();
  await tty.write(enc.encode(text));
}

async function readSingleKeyRaw(tty, opts = { echo: false }) {
  if (!tty) return null;
  const rid = tty.rid;
  const buf = new Uint8Array(1);
  try {
    Deno.setRaw(rid, true);
    while (true) {
      const n = await tty.read(buf);
      if (!n || n <= 0) return null;
      if (opts.echo) await tty.write(buf);
      return buf[0];
    }
  } finally {
    try { Deno.setRaw(rid, false); } catch {}
  }
}

async function confirmSingleKeyTTY(message = "Execute? (y/n): ") {
  // Check if we're in REPL environment
  const inREPL = globalThis.Deno?.isatty?.(0) && !globalThis.hlvm?.env?.get?.("HLVM_NON_INTERACTIVE");
  
  if (inREPL) {
    // In REPL, use simple stdin reading with prompt display
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Show the prompt
      await Deno.stdout.write(encoder.encode(`\n${message}`));
      
      // Read user input (requires Enter key)
      const buffer = new Uint8Array(100);
      const n = await Deno.stdin.read(buffer);
      
      if (n) {
        const input = decoder.decode(buffer.subarray(0, n)).trim().toLowerCase();
        if (input === 'y' || input === 'yes') {
          console.log("✓ Proceeding...");
          return true;
        } else if (input === 'n' || input === 'no') {
          console.log("✗ Cancelled");
          return false;
        } else {
          console.log("Invalid response. Treating as 'no'.");
          return false;
        }
      }
      return false;
    } catch (e) {
      logAsk("REPL prompt failed:", e.message);
      // Fallback to auto-proceed
      console.log("⚠️  Could not read response — auto-proceeding");
      return true;
    }
  } else {
    // Non-interactive or piped input
    console.log("⚠️  Non-interactive environment — auto-proceeding");
    return true;
  }
}

function makeEscWatcher() {
  let stopFn = () => {};
  const done = new Promise((resolve) => {
    withTTY(async (tty) => {
      if (!tty) { logAsk("ESC watcher disabled (no tty)"); stopFn = () => resolve("stopped"); return; }
      logAsk("ESC watcher started");
      Deno.setRaw(tty.rid, true);
      stopFn = () => { try { Deno.setRaw(tty.rid, false); } catch {} try { tty.close(); } catch {} resolve("stopped"); };
      const buf = new Uint8Array(1);
      while (true) {
        const n = await tty.read(buf);
        if (!n || n <= 0) { resolve("closed"); return; }
        if (buf[0] === 27) { logAsk("ESC pressed"); try { Deno.setRaw(tty.rid, false); } catch {} try { tty.close(); } catch {} resolve("esc"); return; }
      }
    });
  });
  return { done, stop: stopFn };
}

export async function ask(command, options = {}) {
  const { confirm = true } = options;
  if (!command || command.trim() === '') throw new Error('No command provided');

  const platform = globalThis.hlvm.core.system.os;
  const prompt = `Generate a minimal executable shell command for: "${command}"
Platform: ${platform}

CRITICAL RULES:
1. Output ONLY the raw command - no backticks, no quotes around the whole command
2. Use simple shell commands only
3. For macOS: use 'open' for apps/URLs
4. Ensure all quotes are properly closed
5. DO NOT wrap the command in backticks like \`command\`
6. DO NOT add markdown formatting

CORRECT Examples:
"open facebook" → open https://facebook.com
"show tesla stock" → open https://finance.yahoo.com/quote/TSLA
"list files" → ls -la
"echo hello" → echo "hello"
"open safari" → open -a Safari

WRONG Examples:
\`echo "hello"\`
echo 'hello
"ls -la"
Output the raw shell command only:`;

  try {
    const computing = startComputing('Generating');
    const model = getDefaultModel();
    await ensureModel(model);

    // Simple generation without ESC watcher (it conflicts with REPL)
    const response = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [{ role: 'system', content: prompt }, { role: 'user', content: command }],
      stream: false,
      options: { temperature: 0.3, num_predict: 100, top_p: 0.9 }
    });

    computing.stop();
    let script = response.message?.content || '';
    
    // Clean up AI output
    script = script
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .replace(/^["']|["']$/g, '')
      .trim();
    if (script.startsWith('`') && script.endsWith('`')) script = script.slice(1, -1);

    // Fix unbalanced quotes
    const count = (str, re) => (str.match(re) || []).length;
    const dq = count(script, /(?<!\\)"/g);
    const sq = count(script, /(?<!\\)'/g);
    if (dq % 2 === 1) script += '"';
    if (sq % 2 === 1) script += "'";

    if (!script) { console.error('❌ Failed to generate command'); return null; }

    // Preview
    console.log('\n📋 Will execute:');
    console.log('─'.repeat(50));
    console.log('\x1b[32m' + script + '\x1b[0m');
    console.log('─'.repeat(50));

    // Confirmation or skip
    if (confirm === false) {
      logAsk("confirm=false (skip prompts)");
    } else {
      // Clean UI with emoji and clear instructions
      console.log("\n  ❓ Execute this command?");
      console.log("");
      console.log("     \x1b[32m→ y\x1b[0m  = Yes, execute");
      console.log("     \x1b[31m→ n\x1b[0m  = No, cancel");
      console.log("");
      process.stdout.write("> "); // Show prompt to indicate waiting for input
      
      // Set up getter properties that trigger on access
      let responded = false;
      let response = null;
      
      Object.defineProperty(globalThis, 'y', {
        get: function() {
          responded = true;
          response = 'yes';
          console.log("✅ Proceeding with execution...");
          return undefined; // Return undefined so REPL doesn't print anything ugly
        },
        configurable: true
      });
      
      Object.defineProperty(globalThis, 'n', {
        get: function() {
          responded = true;
          response = 'no';
          console.log("❌ Cancelled");
          return undefined;
        },
        configurable: true
      });
      
      // Wait for response (max 30 seconds)
      const startTime = Date.now();
      while (!responded && (Date.now() - startTime < 30000)) {
        await new Promise(r => setTimeout(r, 100));
      }
      
      // Clean up
      delete globalThis.y;
      delete globalThis.n;
      
      if (!responded || response !== 'yes') {
        if (!responded) console.log("⏱️  Timeout - cancelled");
        process.stdout.write("\n> "); // Show prompt after cancel
        return null;
      }
    }

    // Execute
    console.log('\n⚡ Executing...');
    try {
      if (globalThis.hlvm.core.system.os === 'darwin' && script.startsWith('open ')) {
        script = script.replace(/^open\s/, '/usr/bin/open ');
      }

      // Always pass as a SINGLE STRING
      let result = await globalThis.hlvm.core.system.exec(script);

      if (result && (result.code === 127 || (result.stderr && result.stderr.includes('not found')))) {
        console.log('Trying with shell...');
        const escaped = script.replace(/'/g, "'\\''");
        result = await globalThis.hlvm.core.system.exec(`/bin/sh -c '${escaped}'`);
      }

      if (result && result.stdout) console.log(result.stdout);

      if (result && result.code === 0) {
        console.log('✅ Done\n');
        process.stdout.write("> "); // Show prompt to indicate ready for next command
      } else if (result) {
        console.log(`❌ Command failed with code ${result.code}`);
        if (result.stderr) console.error(result.stderr);

        // Permission hints on macOS
        if (result.stderr && globalThis.hlvm.core.system.os === 'darwin' && (
             /Operation not permitted/i.test(result.stderr) ||
             /not allowed to send Apple events/i.test(result.stderr) ||
             /Automation.*not allowed/i.test(result.stderr))) {
          console.log('\n🔐 macOS may have blocked this action.');
          console.log('   Check System Settings → Privacy & Security (Automation / Accessibility / Full Disk Access)');
          console.log('   Quick open:');
          console.log('   open "x-apple.systempreferences:com.apple.preference.security?Privacy"');
        }
      }
      if (result?.code !== 0) {
        process.stdout.write("\n> "); // Show prompt after error
      }
      return result;
    } catch (execError) {
      console.error('❌ Execution error:', execError.message);
      process.stdout.write("\n> "); // Show prompt after error
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
    process.stdout.write("\n> "); // Show prompt after error
    return null;
  }
}

export default { revise, draw, chat, refactor, ask };
