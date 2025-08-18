// HLVM Stdlib AI - High-level AI functions
// Accessible as hlvm.stdlib.ai.*

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
 * Generate ASCII diagrams from text descriptions
 * @param {string} [input] - Text to visualize (defaults to clipboard content)
 * @param {Object} [options] - Drawing options
 * @param {string} [options.type] - Diagram type: 'auto', 'flowchart', 'sequence', 'tree', 'graph', 'mindmap', 'table'
 * @param {string} [options.style] - Style: 'simple', 'detailed' (default: 'simple')
 * @returns {Promise<string>} - ASCII diagram
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
  
  // 4. Get available model
  let model = 'qwen2.5-coder:3b'; // Default fallback
  try {
    const models = await globalThis.hlvm.core.ai.ollama.list();
    if (models.models && models.models.length > 0) {
      // Prefer models good at structured output
      const preferredModels = ['qwen2.5-coder:3b', 'codellama:7b', 'llama3.2:3b', 'mistral:7b'];
      
      for (const preferred of preferredModels) {
        const found = models.models.find(m => m.name.startsWith(preferred.split(':')[0]));
        if (found) {
          model = found.name;
          break;
        }
      }
      
      // If no preferred model found, use first available
      if (model === 'qwen2.5-coder:3b' && models.models[0]) {
        model = models.models[0].name;
      }
    }
  } catch (error) {
    console.warn('Could not get model list:', error.message);
  }
  
  // 5. Call Ollama for diagram generation
  try {
    const response = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      stream: false,
      options: {
        temperature: 0.1,  // Low for consistent output
        num_predict: 100,  // Small limit to prevent runaway
        top_p: 0.9,
        repeat_penalty: 1.0 // Don't penalize repeated characters (needed for diagrams)
      }
    });
    
    // 6. Extract and clean response
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
 * Revise text to improve clarity, fix errors, and optionally adjust tone
 * @param {string} [input] - Text to revise (defaults to clipboard content)
 * @param {Object} [options] - Revision options
 * @param {string} [options.tone] - Target tone: 'professional', 'casual', 'friendly', 'concise', 'formal'
 * @returns {Promise<string>} - Revised text
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
  
  // 3. Get available model
  let model = 'qwen2.5-coder:3b'; // Default fallback
  try {
    const models = await globalThis.hlvm.core.ai.ollama.list();
    if (models.models && models.models.length > 0) {
      // Prefer smaller, faster models for text revision
      const preferredModels = ['qwen2.5-coder:3b', 'qwen2.5:3b', 'llama3.2:3b', 'gemma2:2b'];
      
      // Find first available preferred model
      for (const preferred of preferredModels) {
        const found = models.models.find(m => m.name.startsWith(preferred.split(':')[0]));
        if (found) {
          model = found.name;
          break;
        }
      }
      
      // If no preferred model found, use first available
      if (model === 'qwen2.5-coder:3b' && models.models[0]) {
        model = models.models[0].name;
      }
    }
  } catch (error) {
    // Ollama might not be running, will try with fallback model
    console.warn('Could not get model list:', error.message);
  }
  
  // 4. Call Ollama for revision
  try {
    const response = await globalThis.hlvm.core.ai.ollama.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      stream: false,
      options: {
        temperature: 0.3,  // Low temperature for consistent revisions
        num_predict: 2000, // Reasonable max length for revised text
        top_p: 0.9,       // Slight diversity in word choice
        repeat_penalty: 1.1 // Avoid repetition
      }
    });
    
    // 5. Extract and clean response
    let revised = response.message?.content || text;
    
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

// Export both functions for use in hlvm.stdlib.ai
export default {
  revise,
  draw
};