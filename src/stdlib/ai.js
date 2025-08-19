// HLVM Stdlib AI - High-level AI functions
// Accessible as hlvm.stdlib.ai.*

// Inline CLI progress UI implementation
const HLVM_PURPLE = '\x1b[35m';  // Magenta/Purple color
const HLVM_BRIGHT_PURPLE = '\x1b[95m';  // Bright purple
const RESET = '\x1b[0m';
const CLEAR_LINE = '\x1b[2K';
const CURSOR_START = '\x1b[0G';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const YELLOW = '\x1b[33m';

// Simple computing indicator
function startComputing(message = 'Computing', showInterrupt = true) {
  
  const dots = ['', '.', '..', '...'];
  let dotIndex = 0;
  let interval;
  let isFirstRender = true;
  
  try {
    process.stdout.write(HIDE_CURSOR);
  } catch (_) {}
  
  const render = () => {
    const dot = dots[dotIndex];
    let output = '';
    
    // On first render, add newlines to get past the Promise line
    if (isFirstRender) {
      output = '\n\n';
      isFirstRender = false;
    } else {
      output = `${CLEAR_LINE}${CURSOR_START}`;
    }
    
    // Use purple lightning bolt and purple text (no yellow!)
    output += `${HLVM_PURPLE}⚡${RESET} ${HLVM_PURPLE}${message}${dot}${RESET}`;
    if (showInterrupt) {
      output += ` ${DIM}(esc to interrupt)${RESET}`;
    }
    try {
      process.stdout.write(output);
    } catch (_) {}
    dotIndex = (dotIndex + 1) % dots.length;
  };

  render();
  interval = setInterval(render, 500);

  return {
    update: (newMessage) => {
      message = newMessage;
    },
    stop: (showDone = false) => {
      clearInterval(interval);
      try {
        // Clear the entire line to remove the indicator
        process.stdout.write(CLEAR_LINE + CURSOR_START);
        process.stdout.write(SHOW_CURSOR);
        if (showDone) {
          // Put Done message on new line
          process.stdout.write(`\n${DIM}Done. Press Enter to continue.${RESET}\n`);
        } else {
          // Just add spacing before response
          process.stdout.write('\n');
        }
      } catch (_) {}
    }
  };
}

// Context usage display
function showContextUsage(percentage, model = null) {
  const warningThreshold = 80;
  const criticalThreshold = 95;
  
  let color = HLVM_PURPLE;
  let icon = '○';
  
  if (percentage >= criticalThreshold) {
    color = '\x1b[91m'; // Bright red
    icon = '●';
  } else if (percentage >= warningThreshold) {
    color = YELLOW;
    icon = '◉';
  }
  
  const message = model 
    ? `Approaching ${model} usage limit : ${percentage}% context used`
    : `Context usage: ${percentage}%`;
  
  const output = `${color}${icon} ${message}${RESET}`;
  try {
    process.stdout.write(`\n${output}\n`);
  } catch (_) {}
}

// Get default model from env or fallback
function getDefaultModel() {
  return globalThis.hlvm?.env?.get("ai.model") || globalThis.EMBEDDED_MODEL || "qwen2.5-coder:1.5b";
}

// Reprint REPL prompt after streaming so users see input is ready again
function reprintReplPrompt() {
  try {
    if (typeof process !== 'undefined' && process.stdout && typeof process.stdout.write === 'function') {
      // Brief completion line, then redraw prompt
      process.stdout.write('\n\x1b[90mDone. Press Enter to continue.\x1b[0m\n');
    }
  } catch (_) {
    // Non-REPL or permissions restricted environment; nothing to do
  }
}

// Model manager state
let modelChecked = false;
let modelAvailable = false;
let downloadInProgress = false;

/**
 * Ensure model is available, download if needed with progress display
 * @param {string} [modelName] - Model to ensure, defaults to env setting
 * @returns {Promise<boolean>} True if model is ready
 */
async function ensureModel(modelName) {
  const model = modelName || getDefaultModel();
  // Quick return if already checked
  if (modelChecked && modelAvailable) return true;
  if (downloadInProgress) {
    console.log("⏳ Model download already in progress...");
    // Wait for download to complete
    while (downloadInProgress) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return modelAvailable;
  }

  try {
    // Check if Ollama is running
    const ollamaCheck = await globalThis.hlvm.core.ai.ollama.list().catch(() => null);
    if (!ollamaCheck) {
      console.log("\n🚀 Starting AI service...");
      // Start Ollama in background
      await globalThis.hlvm.core.system.exec(["./resources/ollama", "serve"], { background: true });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for startup
    }

    // Check if model exists
    const models = await globalThis.hlvm.core.ai.ollama.list();
    const hasModel = models.models?.some(m => m.name === model);
    
    if (hasModel) {
      modelChecked = true;
      modelAvailable = true;
      return true;
    }

    // Model doesn't exist, need to download
    downloadInProgress = true;
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║  🤖 Setting up AI capabilities (one-time download)              ║");
    console.log("║                                                                  ║");
    console.log(`║  Downloading model: ${model.padEnd(40)}  ║`);
    console.log("║  This will take a few minutes but only happens once.            ║");
    console.log("║                                                                  ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    // Pull model (this will take a while)
    console.log("  ⏳ Downloading... (this may take 2-5 minutes)");
    console.log("  📦 Model size: ~1GB");
    
    try {
      // Use ollama's pull function directly
      await globalThis.hlvm.core.ai.ollama.pull({ 
        name: model,
        stream: false 
      });
      console.log("\n✅ Model downloaded successfully!");
    } catch (pullError) {
      console.error("\n❌ Download failed:", pullError.message);
      throw pullError;
    }

    // Verify download
    const verifyModels = await globalThis.hlvm.core.ai.ollama.list();
    modelAvailable = verifyModels.models?.some(m => m.name === model);
    
    if (modelAvailable) {
      console.log("\n🎉 AI capabilities ready! Your command will now continue...\n");
    } else {
      console.error("\n❌ Failed to download model. AI features may not work.");
    }

    modelChecked = true;
    downloadInProgress = false;
    return modelAvailable;

  } catch (error) {
    downloadInProgress = false;
    modelChecked = true;
    console.error("\n⚠️ Could not set up AI:", error.message);
    console.error("   AI features will not be available in this session.");
    return false;
  }
}

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
Apply DRY (Don't Repeat Yourself) principle.
Return ONLY the refactored code.`,

  solid: `Refactor this code following SOLID principles.
Apply Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion.
Break down large classes/functions, improve abstractions.
Return ONLY the refactored code.`,

  dry: `Refactor this code to eliminate ALL redundancy.
Extract common patterns into reusable functions/components.
Remove duplicate logic and consolidate similar code blocks.
Return ONLY the refactored code.`,

  unused: `Analyze this code and remove ALL unused:
- Variables and constants
- Functions and methods
- Imports and dependencies
- Comments and dead code
Return ONLY the cleaned code with unused elements removed.`,

  simplify: `Simplify this code to be more readable and maintainable.
Reduce complexity, flatten nested structures, use clearer logic.
Make it easier to understand without changing functionality.
Return ONLY the simplified code.`,

  modern: `Modernize this code using latest language features.
Update syntax, use modern patterns, replace outdated approaches.
Keep the same functionality with cleaner, modern code.
Return ONLY the modernized code.`,

  performance: `Optimize this code for better performance.
Reduce time complexity, minimize memory usage, eliminate bottlenecks.
Add caching where beneficial, use efficient algorithms.
Return ONLY the optimized code.`
};

const DIAGRAM_PROMPTS = {
  auto: `Analyze this text and create the most appropriate ASCII diagram to visualize it.
Choose from: flowchart, sequence diagram, tree structure, graph, table, or mindmap.
Use box drawing characters (─│┌┐└┘├┤┬┴┼) for clean diagrams.
Return ONLY the ASCII diagram.`,
  
  flowchart: `Convert this text into an ASCII flowchart.
Use box drawing characters (─│┌┐└┘├┤┬┴┼) and arrows (▼▲►◄).
Show decision points with diamonds if applicable.
Return ONLY the ASCII flowchart.`,
  
  sequence: `Convert this text into an ASCII sequence diagram.
Show interactions between entities with arrows and labels.
Use vertical lines for lifelines and horizontal arrows for messages.
Return ONLY the ASCII sequence diagram.`,
  
  tree: `Convert this text into an ASCII tree structure.
Use box drawing characters (─│├└) to show hierarchy.
Indent child nodes appropriately.
Return ONLY the ASCII tree.`,
  
  graph: `Convert this text into an ASCII graph or network diagram.
Show nodes and their connections clearly.
Use box drawing characters for structure.
Return ONLY the ASCII graph.`,
  
  mindmap: `Convert this text into an ASCII mind map.
Show the central concept with branches radiating outward.
Use box drawing characters and indentation.
Return ONLY the ASCII mind map.`,
  
  table: `Convert this text into an ASCII table.
Extract key data points and organize in rows and columns.
Use box drawing characters for borders.
Return ONLY the ASCII table.`
};

/**
 * Creates ASCII diagrams from text using AI
 * @param {string} input - Text to visualize (uses clipboard if empty)
 * @param {Object} [options] - Drawing options
 * @param {string} [options.type='auto'] - Diagram type: auto|flowchart|sequence|tree|graph|mindmap|table
 * @param {string} [options.style='simple'] - Style: simple|detailed
 * @returns {Promise<string>} ASCII diagram
 * @example
 * await draw("login -> validate -> dashboard")
 * // → ┌─────┐    ┌──────────┐    ┌───────────┐
 * //   │login│───▶│ validate │───▶│ dashboard │
 * //   └─────┘    └──────────┘    └───────────┘
 * @example
 * await draw("user story steps", {type: "sequence"})
 * // → User     System     Database
 * //   │         │           │
 * //   │─login──▶│           │
 * //   │         │──query───▶│
 * //   │         │◀──result──│
 */
export async function draw(input, options = {}) {
  // 1. Get text to visualize
  let text = input;
  if (!text) {
    // Use clipboard as default input source
    text = await globalThis.hlvm.core.io.clipboard.read();
  }
  
  // Validate we have text to work with
  if (!text || text.trim() === '') {
    throw new Error('No text to visualize (input is empty and clipboard is empty)');
  }
  
  // 2. Determine diagram type and style
  const type = options.type || 'auto';
  const style = options.style || 'simple';
  const validTypes = ['auto', 'flowchart', 'sequence', 'tree', 'graph', 'mindmap', 'table'];
  
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Valid options: ${validTypes.join(', ')}`);
  }
  
  // 3. Build the prompt
  let systemPrompt = DIAGRAM_PROMPTS[type];
  if (style === 'detailed') {
    systemPrompt += '\nInclude more detail and annotations where helpful.';
  } else {
    systemPrompt += '\nKeep it simple and clean, focusing on key elements only.';
  }
  
  // 4. Get model from options or env
  let model = options.model || globalThis.hlvm?.env?.get("ai.model") || getDefaultModel();
  
  // 5. Ensure model is available (auto-download if needed)
  await ensureModel(model);
  
  // 6. Call Ollama for diagram generation
  try {
    // Small delay to let Promise print first
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Start computing indicator
    const computing = startComputing('Drawing diagram', true);
    
    const response = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      stream: false,
      options: {
        temperature: 0.1,  // Low for consistent output (diagrams need precision)
        num_predict: 100,  // Small limit to prevent runaway
        top_p: 0.9,
        repeat_penalty: 1.0 // Don't penalize repeated characters (needed for diagrams)
      }
    });
    
    computing.stop();  // Stop computing after generation
    
    // 7. Extract and clean response
    let diagram = response.message?.content || '';
    
    // Clean up any markdown code blocks the model might add
    diagram = diagram
      .replace(/^```[\w]*\n/, '')  // Remove opening code block
      .replace(/\n```$/, '')        // Remove closing code block
      .trim();
    
    // Validate we got a diagram (should contain box drawing characters)
    const hasDiagramChars = /[─│┌┐└┘├┤┬┴┼▼▲►◄╭╮╰╯═║╔╗╚╝╠╣╦╩╬]/.test(diagram);
    if (!hasDiagramChars && diagram.length < 50) {
      console.warn('Generated output may not be a valid diagram');
    }
    
    return diagram;
    
  } catch (error) {
    // Simple error handling
    console.error('Failed to generate diagram:', error.message);
    
    // If Ollama is not running
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
      return '[Ollama not running]';
    }
    
    // Return simple error message
    return `[Cannot generate diagram]`;
  }
}

/**
 * Revises text using AI to improve clarity, grammar, and tone
 * @param {string} input - Text to revise (uses clipboard if empty)
 * @param {Object} [options] - Revision options
 * @param {string} [options.tone='default'] - Tone: default|professional|casual|friendly|concise|formal
 * @returns {Promise<string>} Revised text
 * @example
 * await revise("thx for ur help")
 * // → "Thank you for your help"
 * @example
 * await revise("hey can u send the files", {tone: "professional"})
 * // → "Could you please send the files?"
 * @example
 * await revise() // Revises clipboard content
 * // → [Revised text from clipboard]
 */
export async function revise(input, options = {}) {
  // 1. Get text to revise
  let text = input;
  if (!text) {
    // Use clipboard as default input source
    text = await globalThis.hlvm.core.io.clipboard.read();
  }
  
  // Validate we have text to work with
  if (!text || text.trim() === '') {
    throw new Error('No text to revise (input is empty and clipboard is empty)');
  }
  
  // 2. Determine system prompt based on tone option
  const tone = options.tone || 'default';
  const validTones = ['default', 'professional', 'casual', 'friendly', 'concise', 'formal'];
  
  if (!validTones.includes(tone)) {
    throw new Error(`Invalid tone: ${tone}. Valid options: ${validTones.join(', ')}`);
  }
  
  const systemPrompt = SYSTEM_PROMPTS[tone];
  
  // 3. Get model from options or env
  let model = options.model || globalThis.hlvm?.env?.get("ai.model") || getDefaultModel();
  
  // 4. Ensure model is available (auto-download if needed)
  await ensureModel(model);
  
  // 5. Call Ollama for revision with streaming
  try {
    // Small delay to let Promise print first
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Start computing indicator
    const computing = startComputing('Revising text', true);
    
    const stream = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      stream: true,  // Enable streaming for visual feedback
      options: {
        temperature: options.temperature || globalThis.hlvm?.env?.get("ai.temperature") || 0.3,
        num_predict: globalThis.hlvm?.env?.get("ai.max_tokens") || 2000,
        top_p: 0.9,       // Slight diversity in word choice
        repeat_penalty: 1.1 // Avoid repetition
      }
    });
    
    // 5. Collect streaming response with visual feedback
    let revised = '';
    computing.stop();  // Stop computing indicator before streaming
    process.stdout.write('\x1b[32m');  // Green color for revised text
    
    for await (const chunk of stream) {
      if (chunk.message?.content) {
        process.stdout.write(chunk.message.content);
        revised += chunk.message.content;
      }
    }
    
    process.stdout.write('\x1b[0m\n');  // Reset color and newline
    // Ensure the REPL prompt is visible again after streaming ends
    reprintReplPrompt();
    
    // Clean up any markdown or formatting the model might add
    revised = revised
      .replace(/^```[\w]*\n/, '')  // Remove opening code block
      .replace(/\n```$/, '')        // Remove closing code block
      .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
      .trim();
    
    // Sanity check: if revision is empty or too different, return original
    if (!revised || revised.length === 0) {
      console.warn('Revision resulted in empty text, returning original');
      return text;
    }
    
    // If revision is drastically different in length (likely an error), return original
    const lengthRatio = revised.length / text.length;
    if (lengthRatio < 0.2 || lengthRatio > 5) {
      console.warn('Revision length drastically different, returning original');
      return text;
    }
    
    return revised;
    
  } catch (error) {
    // Log error but don't throw - return original text as fallback
    console.error('Failed to revise text:', error.message);
    
    // If Ollama is not running, provide helpful message
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
    }
    
    // Return original text as safe fallback
    return text;
  }
}

/**
 * Refactors code using AI to improve quality and apply best practices
 * @param {string} input - Code to refactor (uses clipboard if empty)
 * @param {Object} [options] - Refactoring options
 * @param {string} [options.type='all'] - Type: all|clean|solid|dry|unused|simplify|modern|performance
 * @returns {Promise<string>} Refactored code
 * @example
 * await refactor(messy Code)
 * // → [Clean, well-structured code]
 * @example
 * await refactor(code, {type: "unused"})
 * // → [Code with all unused elements removed]
 * @example
 * await refactor() // Refactor clipboard code
 * // → [Refactored code from clipboard]
 */
export async function refactor(input, options = {}) {
  // 1. Get code to refactor
  let code = input;
  if (!code) {
    // Use clipboard as default input source
    code = await globalThis.hlvm.core.io.clipboard.read();
  }
  
  // Validate we have code to work with
  if (!code || code.trim() === '') {
    throw new Error('No code to refactor (input is empty and clipboard is empty)');
  }
  
  // 2. Determine refactoring type
  const type = options.type || 'all';
  const validTypes = ['all', 'clean', 'solid', 'dry', 'unused', 'simplify', 'modern', 'performance'];
  
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Valid options: ${validTypes.join(', ')}`);
  }
  
  const systemPrompt = REFACTOR_PROMPTS[type];
  
  // 3. Get model from options or env
  let model = options.model || globalThis.hlvm?.env?.get("ai.model") || getDefaultModel();
  
  // 4. Ensure model is available (auto-download if needed)
  await ensureModel(model);
  
  // 5. Call Ollama for refactoring
  try {
    // Small delay to let Promise print first
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Start computing indicator
    const computing = startComputing('Refactoring code', true);
    
    const response = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: code }
      ],
      stream: false,
      options: {
        temperature: options.temperature || globalThis.hlvm?.env?.get("ai.temperature") || 0.2,
        num_predict: globalThis.hlvm?.env?.get("ai.max_tokens") || 4000,
        top_p: 0.95,
        repeat_penalty: 1.0 // Don't penalize repeated patterns in code
      }
    });
    
    computing.stop();  // Stop computing after generation
    
    // 5. Extract and clean response
    let refactored = response.message?.content || code;
    
    // Clean up any markdown code blocks the model might add
    refactored = refactored
      .replace(/^```[\w]*\n/, '')  // Remove opening code block
      .replace(/\n```$/, '')        // Remove closing code block
      .trim();
    
    // Sanity check: if refactoring is empty, return original
    if (!refactored || refactored.length === 0) {
      console.warn('Refactoring resulted in empty code, returning original');
      return code;
    }
    
    return refactored;
    
  } catch (error) {
    // Log error but don't throw - return original code as fallback
    console.error('Failed to refactor code:', error.message);
    
    // If Ollama is not running, provide helpful message
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
    }
    
    // Return original code as safe fallback
    return code;
  }
}

// Export both functions for use in hlvm.stdlib.ai

// Initialize on module load

// Conversation history for ask() - in-memory only, cleared on REPL exit
const chatHistory = [];
const MAX_CONTEXT_TOKENS = 6000; // ~75% of 8192 default, leaving room for response

// Simple token estimation (1 token ≈ 4 chars)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Calculate total tokens in message history
function calculateHistoryTokens(messages) {
  return messages.reduce((total, msg) => {
    return total + estimateTokens(msg.content || '');
  }, 0);
}

// Smart trim: Keep recent messages under token limit
function trimHistory(messages, maxTokens = MAX_CONTEXT_TOKENS) {
  if (messages.length === 0) return messages;
  
  // Always try to keep at least the last exchange
  const minKeep = Math.min(2, messages.length);
  
  // Start from the end and work backwards to keep most recent
  let trimmed = [];
  let tokenCount = 0;
  
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content || '');
    
    // Keep recent messages within token limit
    if (trimmed.length < minKeep || tokenCount + msgTokens <= maxTokens) {
      trimmed.unshift(messages[i]);
      tokenCount += msgTokens;
    } else {
      // We've hit our limit
      break;
    }
  }
  
  return trimmed;
}

/**
 * Simple chat with AI - ask any question and get an answer (maintains conversation context)
 * @param {string} input - Question to ask (uses clipboard if empty)
 * @param {Object} [options] - Chat options
 * @param {string} [options.model] - Model to use (defaults to env setting)
 * @param {boolean} [options.stream=true] - Stream the response
 * @param {number} [options.temperature] - Response creativity (0-2, default 0.7)
 * @param {boolean} [options.stateless=false] - Skip conversation history (one-off question)
 * @returns {Promise<string>} AI response
 * @example
 * await ask("What is the capital of France?")
 * // → "The capital of France is Paris."
 * await ask("What about Germany?") // Remembers context
 * // → "The capital of Germany is Berlin."
 * @example
 * await ask("Quick question", {stateless: true}) // No context
 * // → [Answer without affecting conversation history]
 * @example
 * await ask() // Ask from clipboard with context
 * // → [Answer to clipboard question]
 */
export async function chat(input, options = {}) {
  // 1. Get question to ask
  let question = input;
  if (!question) {
    // Use clipboard as default input source
    question = await globalThis.hlvm.core.io.clipboard.read();
  }
  
  // Validate we have a question
  if (!question || question.trim() === '') {
    throw new Error('No question to ask (input is empty and clipboard is empty)');
  }
  
  // 2. Prepare messages based on stateless option
  let messages;
  
  if (options.stateless) {
    // Stateless mode: just send the current question
    messages = [{ role: 'user', content: question }];
  } else {
    // Stateful mode: add to history and manage context
    
    // Add system prompt if not present (helps model remember context)
    if (chatHistory.length === 0 || chatHistory[0].role !== 'system') {
      chatHistory.unshift({ 
        role: 'system', 
        content: 'You are a helpful assistant. Remember and use all information from our conversation. When asked about previous topics, refer back to what was discussed earlier.'
      });
    }
    
    chatHistory.push({ role: 'user', content: question });
    
    // Trim history if needed to stay within context limits
    const currentTokens = calculateHistoryTokens(chatHistory);
    if (currentTokens > MAX_CONTEXT_TOKENS) {
      // Keep the most recent messages that fit
      const trimmed = trimHistory(chatHistory, MAX_CONTEXT_TOKENS);
      chatHistory.length = 0;
      chatHistory.push(...trimmed);
    }
    
    // Show context usage if getting high
    const contextUsage = Math.round((currentTokens / 8192) * 100);
    if (contextUsage > 80) {
      showContextUsage(contextUsage, model);
    }
    
    messages = chatHistory;
  }
  
  // Debug: Show what we're sending (if debug option is set)
  if (options.debug) {
    console.log('\x1b[90m[DEBUG] Sending messages:\x1b[0m');
    messages.forEach((msg, i) => {
      console.log(`\x1b[90m  [${i}] ${msg.role}: ${msg.content.substring(0, 50)}...\x1b[0m`);
    });
    console.log(`\x1b[90m[DEBUG] Total tokens: ~${calculateHistoryTokens(messages)}\x1b[0m`);
  }
  
  // 3. Get model from options or env
  let model = options.model || globalThis.hlvm?.env?.get("ai.model") || getDefaultModel();
  
  // 4. Ensure model is available (auto-download if needed)
  await ensureModel(model);
  
  // 5. Call Ollama with appropriate messages
  try {
    const stream = options.stream !== false; // Default to streaming
    
    if (stream) {
      // Small delay to let Promise print first
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Start computing indicator
      const computing = startComputing('Thinking', true);
      
      const response = await globalThis.hlvm.core.ai.ollama.chat({
        model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature || globalThis.hlvm?.env?.get("ai.temperature") || 0.7,
          num_predict: globalThis.hlvm?.env?.get("ai.max_tokens") || 2000,
          num_ctx: 8192, // Explicitly set context window
          top_p: 0.95,
          repeat_penalty: 1.1
        }
      });
      
      // Collect streaming response with visual feedback
      let answer = '';
      computing.stop();  // Stop computing before streaming
      process.stdout.write('\x1b[32m');  // Green color for answer
      
      for await (const chunk of response) {
        if (chunk.message?.content) {
          process.stdout.write(chunk.message.content);
          answer += chunk.message.content;
        }
      }
      
      process.stdout.write('\x1b[0m\n');  // Reset color and newline
      // Ensure the REPL prompt is visible again after streaming ends
      reprintReplPrompt();
      
      // Add assistant response to history (unless stateless)
      if (!options.stateless) {
        chatHistory.push({ role: 'assistant', content: answer.trim() });
      }
      
      return answer.trim();
      
    } else {
      // Non-streaming mode (for programmatic use)
      const response = await globalThis.hlvm.core.ai.ollama.chat({
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature || globalThis.hlvm?.env?.get("ai.temperature") || 0.7,
          num_predict: globalThis.hlvm?.env?.get("ai.max_tokens") || 2000,
          num_ctx: 8192, // Explicitly set context window
          top_p: 0.95,
          repeat_penalty: 1.1
        }
      });
      
      const answer = response.message?.content || '';
      
      // Add assistant response to history (unless stateless)
      if (!options.stateless) {
        chatHistory.push({ role: 'assistant', content: answer });
      }
      
      return answer;
    }
    
  } catch (error) {
    console.error('Failed to get answer:', error.message);
    
    // If Ollama is not running, provide helpful message
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
      return '[Ollama not running]';
    }
    
    return `[Error: ${error.message}]`;
  }
}

/**
 * Execute natural language commands by generating and running scripts
 * @param {string} command - Natural language command to execute
 * @param {Object} [options] - Execution options
 * @param {boolean} [options.confirm=true] - Ask for confirmation before executing
 * @returns {Promise<any>} Execution result or null if cancelled
 * @example
 * await run("open facebook")
 * // → Shows script, asks confirmation, opens Facebook
 * @example
 * await run("take a screenshot", {confirm: false})
 * // → Takes screenshot immediately without asking
 */
export async function ask(command, options = {}) {
  const { confirm = true } = options;
  
  if (!command || command.trim() === '') {
    throw new Error('No command provided');
  }
  
  // Build prompt for AI to generate executable script
  const platform = globalThis.hlvm.core.system.os;
  const prompt = `Generate a minimal executable script to: "${command}"
Platform: ${platform}

Rules:
1. Return ONLY the executable code - no comments, no explanations
2. Use the simplest approach:
   - Shell commands for system operations (open, ls, echo, etc.)
   - AppleScript ONLY for app-specific control on macOS
   - Deno/TypeScript ONLY for complex file/network operations
3. Make it as short as possible

Examples:
"open facebook" → open https://facebook.com
"list files" → ls -la
"show current directory" → pwd
"take screenshot" → screencapture -x ~/Desktop/screenshot.png
"play spotify" → tell application "Spotify" to play

Output ONLY the command/script, nothing else.`;

  try {
    // Small delay to let Promise print first
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Start computing indicator
    const computing = startComputing('Generating script', true);
    
    // Get model and ensure it's available
    const model = getDefaultModel();
    await ensureModel(model);
    
    // Update computing message
    computing.update('Processing command');
    
    // Generate script using AI
    const response = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: command }
      ],
      stream: false,
      options: {
        temperature: 0.3,  // Low temperature for consistent script generation
        num_predict: 500,  // Short scripts only
        top_p: 0.9
      }
    });
    
    computing.stop();  // Stop computing after generation
    let script = response.message?.content || '';
    
    // Clean up any markdown code blocks if AI adds them
    script = script
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
    
    if (!script) {
      console.error('❌ Failed to generate script');
      return null;
    }
    
    // Detect dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\/(?:\s|$)/,  // rm -rf /
      /sudo\s+rm/,                // sudo rm
      />\s*\/dev\/sda/,          // Writing to disk devices
      /format\s+c:/i,            // Windows format
      /del\s+\/s\s+\/q\s+c:/i    // Windows delete
    ];
    
    const isDangerous = dangerousPatterns.some(pattern => pattern.test(script));
    
    // Show script preview with nice formatting
    console.log('\n\x1b[36m📋 Will execute:\x1b[0m');
    console.log('\x1b[90m' + '─'.repeat(50) + '\x1b[0m');
    
    // Syntax highlight based on script type
    if (script.includes('tell application') || script.includes('osascript')) {
      console.log('\x1b[35m' + script + '\x1b[0m');  // Magenta for AppleScript
    } else if (script.includes('Deno.') || script.includes('await') || script.includes('import')) {
      console.log('\x1b[33m' + script + '\x1b[0m');  // Yellow for TypeScript
    } else {
      console.log('\x1b[32m' + script + '\x1b[0m');  // Green for shell
    }
    
    console.log('\x1b[90m' + '─'.repeat(50) + '\x1b[0m');
    
    // Warn if dangerous
    if (isDangerous) {
      console.log('\n\x1b[31m⚠️  WARNING: Potentially dangerous operation detected!\x1b[0m');
    }
    
    // Confirmation prompt
    if (confirm) {
      const message = isDangerous 
        ? '\n\x1b[31mThis looks dangerous. Are you sure?\x1b[0m Execute? (y/n): '
        : '\nExecute? (y/n): ';
      
      // Write prompt
      await Deno.stdout.write(new TextEncoder().encode(message));
      
      try {
        // Check if we're in a TTY (interactive terminal)
        const isInteractive = Deno.stdin.isTerminal();
        
        if (isInteractive) {
          // Set stdin to raw mode for single character input
          Deno.stdin.setRaw(true);
          
          // Read single character
          const buf = new Uint8Array(1);
          await Deno.stdin.read(buf);
          
          // Immediately restore normal mode
          Deno.stdin.setRaw(false);
          
          // Check the byte value directly (121 = 'y', 89 = 'Y')
          const byteValue = buf[0];
          const isYes = (byteValue === 121 || byteValue === 89); // 'y' or 'Y'
          
          // Echo the character
          const char = String.fromCharCode(byteValue);
          console.log(char);
          
          if (!isYes) {
            console.log('\x1b[31m❌ Cancelled by user\x1b[0m');
            return null;
          }
        } else {
          // Fallback for non-TTY (piped input, etc)
          const buf = new Uint8Array(100);
          const n = await Deno.stdin.read(buf);
          const answer = new TextDecoder().decode(buf.slice(0, n)).trim().toLowerCase();
          
          if (answer !== 'y' && answer !== 'yes') {
            console.log('\x1b[31m❌ Cancelled by user\x1b[0m');
            return null;
          }
        }
      } catch (error) {
        // Make sure to restore normal mode on error
        try { Deno.stdin.setRaw(false); } catch {}
        
        // Fallback to line input on error
        console.log('\nPress Enter after typing y or n:');
        const buf = new Uint8Array(100);
        const n = await Deno.stdin.read(buf);
        const answer = new TextDecoder().decode(buf.slice(0, n)).trim().toLowerCase();
        
        if (answer !== 'y' && answer !== 'yes') {
          console.log('\x1b[31m❌ Cancelled by user\x1b[0m');
          return null;
        }
      }
    }
    
    // Execute based on script type
    let result;
    
    if (script.includes('tell application') || script.includes('osascript')) {
      // AppleScript - write to file and execute
      const scriptPath = '/tmp/hlvm-do.scpt';
      await globalThis.hlvm.core.io.fs.write(scriptPath, script);
      result = await globalThis.hlvm.core.system.exec(['osascript', scriptPath]);
      
    } else if (script.includes('Deno.') || script.includes('await') || script.includes('import') || script.includes('fetch') || script.includes('const ') || script.includes('let ')) {
      // Deno/TypeScript - write to file and run with deno
      const scriptPath = '/tmp/hlvm-do.ts';
      await globalThis.hlvm.core.io.fs.write(scriptPath, script);
      result = await globalThis.hlvm.core.system.exec(['deno', 'run', '--allow-all', scriptPath]);
      
    } else {
      // Shell script - write to file, make executable, and run
      const scriptPath = '/tmp/hlvm-do.sh';
      await globalThis.hlvm.core.io.fs.write(scriptPath, script);
      await globalThis.hlvm.core.system.exec(['chmod', '+x', scriptPath]);
      result = await globalThis.hlvm.core.system.exec([scriptPath]);
    }
    
    // Show result
    if (result && result.stdout) {
      console.log(result.stdout);
    }
    
    if (result && result.code === 0) {
      console.log('\x1b[32m✅ Executed successfully\x1b[0m');
    } else if (result && result.code !== 0) {
      console.log(`\x1b[31m❌ Execution failed with code ${result.code}\x1b[0m`);
      if (result.stderr) {
        console.error('\x1b[31m' + result.stderr + '\x1b[0m');
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('\x1b[31m❌ Error:', error.message, '\x1b[0m');
    
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('Ollama service is not running. Start it with: hlvm ollama serve');
    }
    
    return null;
  }
}

export default {
  revise,
  draw,
  chat,
  refactor,
  ask
};