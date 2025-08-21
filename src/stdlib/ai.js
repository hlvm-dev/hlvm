// src/stdlib/ai.js
// HLVM Stdlib AI - High-level AI functions

// ─────────────────────────────────────────────────────────────────────────────
// Constants
const SPINNER_INTERVAL = 80;
const CONTEXT_WARNING_THRESHOLD = 80;
const CONTEXT_CRITICAL_THRESHOLD = 95;
const TOKEN_ESTIMATE_DIVISOR = 4;
const MAX_CONTEXT_TOKENS = 6000;
const MODEL_STARTUP_DELAY = 2000;
const DOWNLOAD_WAIT_INTERVAL = 1000;
const CONFIRMATION_TIMEOUT = 30000;
const PREVIEW_DIVIDER_LENGTH = 50;

// Terminal UI helpers
const COLORS = {
  PURPLE: '\x1b[35m',
  BRIGHT_PURPLE: '\x1b[95m',
  GREEN: '\x1b[32m',
  RED: '\x1b[91m',
  YELLOW: '\x1b[33m',
  GRAY: '\x1b[90m',
  RESET: '\x1b[0m'
};

const TERMINAL = {
  CLEAR_LINE: '\x1b[2K',
  CURSOR_START: '\x1b[0G',
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h'
};

function startComputing(message = 'Computing') {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0, interval, first = true;
  try { process.stdout.write(TERMINAL.HIDE_CURSOR); } catch {}
  const render = () => {
    const prefix = first ? '\n' : (TERMINAL.CLEAR_LINE + TERMINAL.CURSOR_START);
    first = false;
    try {
      process.stdout.write(`${prefix}  ${COLORS.PURPLE}${frames[i]}${COLORS.RESET}  ${message}...`);
    } catch {}
    i = (i + 1) % frames.length;
  };
  render();
  interval = setInterval(render, SPINNER_INTERVAL);
  return {
    update: (m) => { message = m; },
    stop: () => {
      clearInterval(interval);
      try {
        process.stdout.write(TERMINAL.CLEAR_LINE + TERMINAL.CURSOR_START);
        process.stdout.write(TERMINAL.SHOW_CURSOR + '\n');
      } catch {}
    }
  };
}

function showContextUsage(percentage, model = null) {
  let color = COLORS.PURPLE, icon = '○';
  if (percentage >= CONTEXT_CRITICAL_THRESHOLD) { color = COLORS.RED; icon = '●'; }
  else if (percentage >= CONTEXT_WARNING_THRESHOLD) { color = COLORS.YELLOW; icon = '◉'; }
  const msg = model ? `Approaching ${model} usage limit : ${percentage}% context used`
                    : `Context usage: ${percentage}%`;
  try { process.stdout.write(`\n${color}${icon} ${msg}${COLORS.RESET}\n`); } catch {}
}

function getDefaultModel() {
  return globalThis.hlvm?.env?.get?.("ai.model") || globalThis.EMBEDDED_MODEL || "qwen2.5-coder:1.5b";
}

function reprintReplPrompt() {
  try {
    if (typeof process !== 'undefined' && process.stdout && typeof process.stdout.write === 'function') {
      process.stdout.write(`\n${COLORS.GRAY}Done. Press Enter to continue.${COLORS.RESET}\n`);
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
    while (downloadInProgress) await new Promise(r => setTimeout(r, DOWNLOAD_WAIT_INTERVAL));
    return modelAvailable;
  }

  try {
    const ollamaCheck = await globalThis.hlvm.core.ai.ollama.list().catch(() => null);
    if (!ollamaCheck) {
      console.log("\n🚀 Starting AI service...");
      await globalThis.hlvm.core.system.exec(["./resources/ollama", "serve"], { background: true });
      await new Promise(r => setTimeout(r, MODEL_STARTUP_DELAY));
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
// Common helpers for deduplication

// Handle Ollama connection errors consistently
function handleOllamaError(error) {
  console.error(`Failed: ${error.message}`);
  if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
    console.error('Ollama service is not running. Start it with: hlvm ollama serve');
  }
}

// Clean AI response from markdown/quotes consistently  
function cleanAIResponse(response) {
  return response
    .replace(/^```[\w]*\n/, '')
    .replace(/\n```$/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

// Process streaming response with colored output
async function processStream(stream) {
  let result = '';
  process.stdout.write(COLORS.GREEN);
  for await (const chunk of stream) {
    if (chunk.message?.content) {
      process.stdout.write(chunk.message.content);
      result += chunk.message.content;
    }
  }
  process.stdout.write(`${COLORS.RESET}\n`);
  reprintReplPrompt();
  return result;
}

// Resolve AI options with environment fallbacks
function resolveAIOptions(options = {}, defaults = {}) {
  return {
    temperature: options.temperature ?? globalThis.hlvm?.env?.get?.("ai.temperature") ?? defaults.temperature,
    num_predict: options.num_predict ?? globalThis.hlvm?.env?.get?.("ai.max_tokens") ?? defaults.num_predict,
    top_p: options.top_p ?? defaults.top_p,
    repeat_penalty: options.repeat_penalty ?? defaults.repeat_penalty,
    ...defaults.extra
  };
}

// Get input with consistent clipboard fallback
async function getInputWithFallback(input) {
  // If input is explicitly provided (including empty string), use it
  // Only fallback to clipboard if input is undefined
  if (input !== undefined) return input;
  return await globalThis.hlvm.core.io.clipboard.read();
}

// Handle macOS permission errors consistently
function handleMacOSPermissionError(stderr) {
  if (!stderr || globalThis.hlvm.core.system.os !== 'darwin') return;
  
  const permissionPatterns = [
    /Operation not permitted/i,
    /not allowed to send Apple events/i,
    /Automation.*not allowed/i
  ];
  
  if (permissionPatterns.some(pattern => pattern.test(stderr))) {
    console.log('\n🔐 macOS may have blocked this action.');
    console.log('   Check System Settings → Privacy & Security (Automation / Accessibility / Full Disk Access)');
    console.log('   Quick open:');
    console.log('   open "x-apple.systempreferences:com.apple.preference.security?Privacy"');
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
// Common request handler - eliminates redundancy across all AI functions
async function request(input, config = {}) {
  // Special case: if skipInputValidation is true, don't process input at all (for chat)
  const text = config.skipInputValidation ? null : await getInputWithFallback(input);
  if (!config.skipInputValidation && (!text || !text.trim())) 
    throw new Error(config.error || 'No input provided');
  
  const model = config.model || getDefaultModel();
  await ensureModel(model);
  
  const spinner = config.spinner && startComputing(config.spinner);
  
  try {
    const response = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: config.messages(text),
      stream: config.stream ?? false,
      options: config.options ?? {}
    });
    
    spinner?.stop();
    return await config.process(response, text);
  } catch (e) {
    spinner?.stop();
    handleOllamaError(e);
    return config.fallback ?? text;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public helpers: draw / revise / refactor / chat

export async function draw(input, options = {}) {
  const type = options.type || 'auto';
  const style = options.style || 'simple';
  const validTypes = ['auto','flowchart','sequence','tree','graph','mindmap','table'];
  if (!validTypes.includes(type)) throw new Error(`Invalid type: ${validTypes.join(', ')}`);

  let systemPrompt = DIAGRAM_PROMPTS[type];
  systemPrompt += style === 'detailed'
    ? '\nInclude more detail and annotations where helpful.'
    : '\nKeep it simple and clean, focusing on key elements only.';

  return request(input, {
    model: options.model,
    error: 'No text to visualize',
    spinner: 'Drawing',
    messages: text => [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
    options: { temperature: 0.1, num_predict: 100, top_p: 0.9, repeat_penalty: 1.0 },
    process: async response => {
      let diagram = cleanAIResponse(response.message?.content || '');
      const ok = /[─│┌┐└┘├┤┬┴┼▼▲►◄╭╮╰╯═║╔╗╚╝╠╣╦╩╬]/.test(diagram);
      if (!ok && diagram.length < 50) console.warn('Generated output may not be a valid diagram');
      return diagram;
    },
    fallback: '[Cannot generate diagram]'
  });
}

export async function revise(input, options = {}) {
  const tone = options.tone || 'default';
  const valid = ['default','professional','casual','friendly','concise','formal'];
  if (!valid.includes(tone)) throw new Error(`Invalid tone: ${valid.join(', ')}`);
  const systemPrompt = SYSTEM_PROMPTS[tone];

  return request(input, {
    model: options.model,
    error: 'No text to revise',
    spinner: 'Revising',
    messages: text => [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
    stream: true,
    options: resolveAIOptions(options, {
      temperature: 0.3,
      num_predict: 2000,
      top_p: 0.9,
      repeat_penalty: 1.1
    }),
    process: async (stream, original) => {
      let revised = await processStream(stream);
      revised = cleanAIResponse(revised);
      if (!revised) { console.warn('Revision empty; returning original'); return original; }
      const ratio = revised.length / original.length;
      if (ratio < 0.2 || ratio > 5) { console.warn('Revision length off; returning original'); return original; }
      return revised;
    }
  });
}

export async function refactor(input, options = {}) {
  const type = options.type || 'all';
  const valid = ['all','clean','solid','dry','unused','simplify','modern','performance'];
  if (!valid.includes(type)) throw new Error(`Invalid type: ${valid.join(', ')}`);
  const systemPrompt = REFACTOR_PROMPTS[type];

  return request(input, {
    model: options.model,
    error: 'No code to refactor',
    spinner: 'Refactoring',
    messages: code => [{ role: 'system', content: systemPrompt }, { role: 'user', content: code }],
    options: resolveAIOptions(options, {
      temperature: 0.2,
      num_predict: 4000,
      top_p: 0.95,
      repeat_penalty: 1.0
    }),
    process: async (response, original) => {
      let out = cleanAIResponse(response.message?.content || original);
      if (!out) { console.warn('Refactoring empty; returning original'); return original; }
      return out;
    }
  });
}

const chatHistory = [];
const estimateTokens = (t) => Math.ceil((t || '').length / TOKEN_ESTIMATE_DIVISOR);
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
  // Special handling for chat history
  const question = await getInputWithFallback(input);
  if (!question?.trim()) throw new Error('No question to ask');
  
  const model = options.model || globalThis.hlvm?.env?.get?.("ai.model") || getDefaultModel();
  
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
    console.log(`${COLORS.GRAY}[DEBUG] Sending messages:${COLORS.RESET}`);
    messages.forEach((m,i) => console.log(`${COLORS.GRAY}  [${i}] ${m.role}: ${(m.content||'').slice(0,50)}...${COLORS.RESET}`));
    console.log(`${COLORS.GRAY}[DEBUG] Total tokens: ~${calculateHistoryTokens(messages)}${COLORS.RESET}`);
  }

  // Use request but with pre-built messages
  return request(null, {
    model,
    skipInputValidation: true,  // Chat handles its own input validation
    spinner: options.stream !== false ? 'Generating' : null,
    messages: () => messages,  // Already built above
    stream: options.stream !== false,
    options: resolveAIOptions(options, {
      temperature: 0.7,
      num_predict: 2000,
      top_p: 0.95,
      repeat_penalty: 1.1,
      extra: { num_ctx: 8192 }
    }),
    process: async (response) => {
      if (options.stream !== false) {
        let answer = await processStream(response);
        if (!options.stateless) chatHistory.push({ role: 'assistant', content: answer.trim() });
        return answer.trim();
      } else {
        const answer = response.message?.content || '';
        if (!options.stateless) chatHistory.push({ role: 'assistant', content: answer });
        return answer;
      }
    },
    fallback: `[Error]`
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ASK: natural language → command + confirm + exec
// NEW: /dev/tty single-keypress Y/N, real ESC, confirm:false skip, verbose logs





export async function judge(statement, options = {}) {
  const systemPrompt = `You are a binary truth evaluator. Analyze the given statement and respond with ONLY "true" or "false".
Rules:
- If factually accurate or logically sound: true
- If false, incorrect, or logically flawed: false  
- If uncertain or unprovable: false
- No explanations, just true/false`;

  return request(statement, {
    model: options.model,
    error: 'No statement to judge',
    messages: text => [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    options: { temperature: 0.1, num_predict: 5, top_p: 0.9 },
    process: async response => {
      const answer = (response.message?.content || '').toLowerCase().trim();
      return answer === 'true' || answer.includes('true');
    },
    fallback: false
  });
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
    script = cleanAIResponse(script);
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
    console.log('─'.repeat(PREVIEW_DIVIDER_LENGTH));
    console.log(COLORS.GREEN + script + COLORS.RESET);
    console.log('─'.repeat(PREVIEW_DIVIDER_LENGTH));

    // Confirmation or skip
    if (confirm === false) {
    } else {
      // Clean UI with emoji and clear instructions
      console.log("\n  ❓ Execute this command?");
      console.log("");
      console.log(`     ${COLORS.GREEN}→ y${COLORS.RESET}  = Yes, execute`);
      console.log(`     ${COLORS.RED}→ n${COLORS.RESET}  = No, cancel`);
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
      while (!responded && (Date.now() - startTime < CONFIRMATION_TIMEOUT)) {
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
        handleMacOSPermissionError(result.stderr);
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
    handleOllamaError(error);
    process.stdout.write("\n> "); // Show prompt after error
    return null;
  }
}

export default { revise, draw, chat, refactor, ask, judge };
