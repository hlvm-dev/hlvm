// HLVM Stdlib AI - High-level AI functions
// Accessible as hlvm.stdlib.ai.*

// Get default model from env or fallback
function getDefaultModel() {
  return globalThis.hlvm?.env?.get("ai.model") || globalThis.EMBEDDED_MODEL || "qwen2.5-coder:1.5b";
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
    // Show progress indicator
    console.log('\x1b[36m📝 Revising text...\x1b[0m');
    
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
    process.stdout.write('\x1b[32m');  // Green color for revised text
    
    for await (const chunk of stream) {
      if (chunk.message?.content) {
        process.stdout.write(chunk.message.content);
        revised += chunk.message.content;
      }
    }
    
    process.stdout.write('\x1b[0m\n');  // Reset color and newline
    
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
// Initialize documentation for functions
function initializeDocs() {
  // Setup revise documentation
  revise.__doc__ = `\x1b[36mrevise(input?, options?)\x1b[0m

Revises text using AI to improve clarity, grammar, and tone

\x1b[33mParameters:\x1b[0m
  input: \x1b[90mstring\x1b[0m (optional) - Text to revise (uses clipboard if empty)
  options: \x1b[90mObject\x1b[0m (optional) - Revision options
    tone: 'default'|'professional'|'casual'|'friendly'|'concise'|'formal'

\x1b[33mReturns:\x1b[0m Promise<string> - Revised text

\x1b[33mExamples:\x1b[0m
  await revise("thx for ur help")
  \x1b[32m// → "Thank you for your help"\x1b[0m
  
  await revise("hey can u send the files", {tone: "professional"})
  \x1b[32m// → "Could you please send the files?"\x1b[0m
  
  await revise() // Revises clipboard content
  \x1b[32m// → [Revised text from clipboard]\x1b[0m`;
  
  revise[Symbol.for('Deno.customInspect')] = function() {
    return revise.__doc__;
  };
  
  // Setup draw documentation
  draw.__doc__ = `\x1b[36mdraw(input?, options?)\x1b[0m

Creates ASCII diagrams from text using AI

\x1b[33mParameters:\x1b[0m
  input: \x1b[90mstring\x1b[0m (optional) - Text to visualize (uses clipboard if empty)
  options: \x1b[90mObject\x1b[0m (optional) - Drawing options
    type: 'auto'|'flowchart'|'sequence'|'tree'|'graph'|'mindmap'|'table'
    style: 'simple'|'detailed'

\x1b[33mReturns:\x1b[0m Promise<string> - ASCII diagram

\x1b[33mExamples:\x1b[0m
  await draw("login -> validate -> dashboard")
  \x1b[32m// → ┌─────┐    ┌──────────┐    ┌───────────┐
  //   │login│───▶│ validate │───▶│ dashboard │
  //   └─────┘    └──────────┘    └───────────┘\x1b[0m
  
  await draw("user story steps", {type: "sequence"})
  \x1b[32m// → User     System     Database
  //   │         │           │
  //   │─login──▶│           │
  //   │         │──query───▶│
  //   │         │◀──result──│\x1b[0m`;
  
  draw[Symbol.for('Deno.customInspect')] = function() {
    return draw.__doc__;
  };
  
  // Setup refactor documentation
  refactor.__doc__ = `\x1b[36mrefactor(input?, options?)\x1b[0m

Refactors code using AI to improve quality, remove redundancy, apply best practices

\x1b[33mParameters:\x1b[0m
  input: \x1b[90mstring\x1b[0m (optional) - Code to refactor (uses clipboard if empty)
  options: \x1b[90mObject\x1b[0m (optional) - Refactoring options
    type: 'all'|'clean'|'solid'|'dry'|'unused'|'simplify'|'modern'|'performance'

\x1b[33mTypes:\x1b[0m
  all        - Comprehensive refactor (default) - applies everything
  clean      - Apply Clean Code principles, improve naming
  solid      - Apply SOLID principles, improve design
  dry        - Remove ALL redundancy and duplication
  unused     - Remove unused code, imports, variables
  simplify   - Make code simpler and more readable
  modern     - Update to modern syntax and patterns
  performance - Optimize for speed and memory

\x1b[33mReturns:\x1b[0m Promise<string> - Refactored code

\x1b[33mExamples:\x1b[0m
  await refactor(uglyCode)  // Default: comprehensive refactor
  \x1b[32m// → [Fully refactored code with all improvements]\x1b[0m
  
  await refactor(code, {type: "unused"})  // Remove dead code only
  \x1b[32m// → [Code with unused elements removed]\x1b[0m
  
  await refactor()  // Refactor clipboard code
  \x1b[32m// → [Refactored code from clipboard]\x1b[0m`;
  
  refactor[Symbol.for('Deno.customInspect')] = function() {
    return refactor.__doc__;
  };
}

// Initialize on module load
initializeDocs();

export default {
  revise,
  draw,
  refactor
};