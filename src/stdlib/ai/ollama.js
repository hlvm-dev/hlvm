// Ollama module - Complete mirror of Ollama API
// https://github.com/ollama/ollama/blob/main/docs/api.md

const OLLAMA_HOST = Deno.env.get("OLLAMA_HOST") || "http://localhost:11434";

// Helper for streaming responses
async function* streamResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || "";
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          yield JSON.parse(line);
        } catch (e) {
          console.error("Failed to parse:", line);
        }
      }
    }
  }
}

// Generic API request handler - DRY principle
async function apiRequest(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: method !== "GET" ? { "Content-Type": "application/json" } : {}
  };
  
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${OLLAMA_HOST}/api/${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    let message = `Ollama ${endpoint} failed: ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) message = parsed.error;
    } catch {}
    throw new Error(message);
  }
  
  return response;
}

// Handle streaming or JSON response - DRY principle
async function handleResponse(response, request) {
  if (request?.stream === false) {
    return await response.json();
  }
  return response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : streamResponse(response);
}

/**
 * Generate a completion from a model
 * @param {Object} request - Generation request
 * @param {string} request.model - Model name (e.g., "llama3", "mistral")
 * @param {string} request.prompt - Prompt to generate from
 * @param {boolean} [request.stream=true] - Stream response chunks
 * @param {Object} [request.options] - Model options (temperature, num_predict, etc.)
 * @returns {Promise<Object|AsyncGenerator>} Response or stream of responses
 * @example
 * await generate({model: "llama3", prompt: "Why is the sky blue?"})
 * // → {response: "The sky appears blue because...", done: true}
 * @example
 * for await (const chunk of await generate({model: "llama3", prompt: "Hello", stream: true})) {
 *   process.stdout.write(chunk.response)
 * }
 * // → Streams response word by word
 */
export async function generate(request) {
  const response = await apiRequest("generate", "POST", request);
  return handleResponse(response, request);
}

/**
 * Chat with a model (conversation with context)
 * @param {Object} request - Chat request
 * @param {string} request.model - Model name
 * @param {Array} request.messages - Message history [{role, content}]
 * @param {boolean} [request.stream=true] - Stream response
 * @param {Object} [request.options] - Model options
 * @returns {Promise<Object|AsyncGenerator>} Response or stream
 * @example
 * await chat({
 *   model: "llama3",
 *   messages: [
 *     {role: "user", content: "What is 2+2?"},
 *     {role: "assistant", content: "4"},
 *     {role: "user", content: "What about 3+3?"}
 *   ]
 * })
 * // → {message: {role: "assistant", content: "3+3 equals 6"}}
 */
export async function chat(request) {
  const response = await apiRequest("chat", "POST", request);
  return handleResponse(response, request);
}

/**
 * Create a custom model from a Modelfile
 * @param {Object} request - Create request
 * @param {string} request.name - Model name to create
 * @param {string} request.modelfile - Modelfile content
 * @param {boolean} [request.stream=true] - Stream progress
 * @returns {Promise<Object|AsyncGenerator>} Creation status
 * @example
 * await create({
 *   name: "mario",
 *   modelfile: "FROM llama3\nSYSTEM You are Mario from Nintendo."
 * })
 * // → {status: "success"}
 */
export async function create(request) {
  const response = await apiRequest("create", "POST", request);
  return handleResponse(response, request);
}

/**
 * List available models
 * @returns {Promise<Object>} List of models
 * @example
 * await list()
 * // → {models: [{name: "llama3:latest", size: 4661224676, digest: "abc123..."}]}
 */
export async function list() {
  const response = await apiRequest("tags");
  return response.json();
}

/**
 * Show model information and Modelfile
 * @param {Object} request - Show request
 * @param {string} request.name - Model name
 * @returns {Promise<Object>} Model details
 * @example
 * await show({name: "llama3"})
 * // → {modelfile: "FROM llama3...", parameters: "...", template: "..."}
 */
export async function show(request) {
  const response = await apiRequest("show", "POST", request);
  return response.json();
}

/**
 * Copy a model to a new name
 * @param {Object} request - Copy request
 * @param {string} request.source - Source model name
 * @param {string} request.destination - New model name
 * @returns {Promise<boolean>} Success status
 * @example
 * await copy({source: "llama3", destination: "my-llama"})
 * // → true
 */
export async function copy(request) {
  await apiRequest("copy", "POST", request);
  return true;
}

/**
 * Delete a model
 * @param {Object} request - Delete request
 * @param {string} request.name - Model name to delete
 * @returns {Promise<boolean>} Success status
 * @example
 * await deleteModel({name: "my-custom-model"})
 * // → true
 */
export async function deleteModel(request) {
  await apiRequest("delete", "DELETE", request);
  return true;
}

/**
 * Pull/download a model from the registry
 * @param {Object} request - Pull request
 * @param {string} request.name - Model name to pull
 * @param {boolean} [request.stream=true] - Stream download progress
 * @returns {Promise<Object|AsyncGenerator>} Download progress or status
 * @example
 * await pull({name: "llama3", stream: false})
 * // → {status: "success"}
 * @example
 * for await (const progress of await pull({name: "mistral"})) {
 *   console.log(`Downloaded: ${progress.completed}/${progress.total}`)
 * }
 * // → Shows download progress
 */
export async function pull(request) {
  const response = await apiRequest("pull", "POST", request);
  return handleResponse(response, request);
}

/**
 * Push a model to the registry
 * @param {Object} request - Push request
 * @param {string} request.name - Model name to push
 * @param {boolean} [request.stream=true] - Stream upload progress
 * @returns {Promise<Object|AsyncGenerator>} Upload progress or status
 * @example
 * await push({name: "myorg/mymodel", stream: false})
 * // → {status: "success"}
 */
export async function push(request) {
  const response = await apiRequest("push", "POST", request);
  return handleResponse(response, request);
}

/**
 * Generate embeddings from text
 * @param {Object} request - Embeddings request
 * @param {string} request.model - Model name
 * @param {string} request.prompt - Text to embed
 * @returns {Promise<Object>} Embedding vector
 * @example
 * await embeddings({model: "llama3", prompt: "Hello world"})
 * // → {embedding: [0.1, -0.2, 0.3, ...]}
 */
export async function embeddings(request) {
  const response = await apiRequest("embeddings", "POST", request);
  return response.json();
}

/**
 * List running models
 * @returns {Promise<Object>} Running models info
 * @example
 * await ps()
 * // → {models: [{name: "llama3", size: 4661224676, digest: "abc...", expires_at: "..."}]}
 */
export async function ps() {
  const response = await apiRequest("ps");
  return response.json();
}

/**
 * Check if Ollama service is running
 * @returns {Promise<boolean>} True if running
 * @example
 * await isRunning()
 * // → true
 */
export async function isRunning() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

// Initialize documentation for REPL display
function initializeDocs() {
  // Setup generate documentation
  generate.__doc__ = `\x1b[36mgenerate(request)\x1b[0m

Generate a completion from a model

\x1b[33mParameters:\x1b[0m
  request: \x1b[90mObject\x1b[0m
    model: \x1b[90mstring\x1b[0m - Model name (e.g., "llama3", "mistral")
    prompt: \x1b[90mstring\x1b[0m - Prompt to generate from
    stream: \x1b[90mboolean\x1b[0m (optional) - Stream response chunks
    options: \x1b[90mObject\x1b[0m (optional) - Model options

\x1b[33mReturns:\x1b[0m Promise<Object|AsyncGenerator>

\x1b[33mExamples:\x1b[0m
  await generate({model: "llama3", prompt: "Why is the sky blue?"})
  \x1b[32m// → {response: "The sky appears blue because...", done: true}\x1b[0m
  
  for await (const chunk of await generate({model: "llama3", prompt: "Hello"})) {
    process.stdout.write(chunk.response)
  }
  \x1b[32m// → Streams response word by word\x1b[0m`;
  
  generate[Symbol.for('Deno.customInspect')] = function() { return generate.__doc__; };

  // Setup chat documentation
  chat.__doc__ = `\x1b[36mchat(request)\x1b[0m

Chat with a model (conversation with context)

\x1b[33mParameters:\x1b[0m
  request: \x1b[90mObject\x1b[0m
    model: \x1b[90mstring\x1b[0m - Model name
    messages: \x1b[90mArray\x1b[0m - Message history [{role, content}]
    stream: \x1b[90mboolean\x1b[0m (optional) - Stream response
    options: \x1b[90mObject\x1b[0m (optional) - Model options

\x1b[33mReturns:\x1b[0m Promise<Object|AsyncGenerator>

\x1b[33mExample:\x1b[0m
  await chat({
    model: "llama3",
    messages: [
      {role: "user", content: "What is 2+2?"},
      {role: "assistant", content: "4"},
      {role: "user", content: "What about 3+3?"}
    ]
  })
  \x1b[32m// → {message: {role: "assistant", content: "3+3 equals 6"}}\x1b[0m`;
  
  chat[Symbol.for('Deno.customInspect')] = function() { return chat.__doc__; };

  // Setup list documentation
  list.__doc__ = `\x1b[36mlist()\x1b[0m

List available models

\x1b[33mReturns:\x1b[0m Promise<Object> - List of models

\x1b[33mExample:\x1b[0m
  await list()
  \x1b[32m// → {models: [{name: "llama3:latest", size: 4661224676, digest: "abc123..."}]}\x1b[0m`;
  
  list[Symbol.for('Deno.customInspect')] = function() { return list.__doc__; };

  // Setup show documentation
  show.__doc__ = `\x1b[36mshow(request)\x1b[0m

Show model information and Modelfile

\x1b[33mParameters:\x1b[0m
  request: \x1b[90mObject\x1b[0m
    name: \x1b[90mstring\x1b[0m - Model name

\x1b[33mReturns:\x1b[0m Promise<Object> - Model details

\x1b[33mExample:\x1b[0m
  await show({name: "llama3"})
  \x1b[32m// → {modelfile: "FROM llama3...", parameters: "...", template: "..."}\x1b[0m`;
  
  show[Symbol.for('Deno.customInspect')] = function() { return show.__doc__; };

  // Setup pull documentation
  pull.__doc__ = `\x1b[36mpull(request)\x1b[0m

Pull/download a model from the registry

\x1b[33mParameters:\x1b[0m
  request: \x1b[90mObject\x1b[0m
    name: \x1b[90mstring\x1b[0m - Model name to pull
    stream: \x1b[90mboolean\x1b[0m (optional) - Stream download progress

\x1b[33mReturns:\x1b[0m Promise<Object|AsyncGenerator>

\x1b[33mExamples:\x1b[0m
  await pull({name: "llama3", stream: false})
  \x1b[32m// → {status: "success"}\x1b[0m
  
  for await (const progress of await pull({name: "mistral"})) {
    console.log(\`Downloaded: \${progress.completed}/\${progress.total}\`)
  }
  \x1b[32m// → Shows download progress\x1b[0m`;
  
  pull[Symbol.for('Deno.customInspect')] = function() { return pull.__doc__; };

  // Setup push documentation
  push.__doc__ = `\x1b[36mpush(request)\x1b[0m

Push a model to the registry

\x1b[33mParameters:\x1b[0m
  request: \x1b[90mObject\x1b[0m
    name: \x1b[90mstring\x1b[0m - Model name to push
    stream: \x1b[90mboolean\x1b[0m (optional) - Stream upload progress

\x1b[33mReturns:\x1b[0m Promise<Object|AsyncGenerator>

\x1b[33mExample:\x1b[0m
  await push({name: "myorg/mymodel", stream: false})
  \x1b[32m// → {status: "success"}\x1b[0m`;
  
  push[Symbol.for('Deno.customInspect')] = function() { return push.__doc__; };

  // Setup create documentation
  create.__doc__ = `\x1b[36mcreate(request)\x1b[0m

Create a custom model from a Modelfile

\x1b[33mParameters:\x1b[0m
  request: \x1b[90mObject\x1b[0m
    name: \x1b[90mstring\x1b[0m - Model name to create
    modelfile: \x1b[90mstring\x1b[0m - Modelfile content
    stream: \x1b[90mboolean\x1b[0m (optional) - Stream progress

\x1b[33mReturns:\x1b[0m Promise<Object|AsyncGenerator>

\x1b[33mExample:\x1b[0m
  await create({
    name: "mario",
    modelfile: "FROM llama3\\nSYSTEM You are Mario from Nintendo."
  })
  \x1b[32m// → {status: "success"}\x1b[0m`;
  
  create[Symbol.for('Deno.customInspect')] = function() { return create.__doc__; };

  // Setup copy documentation
  copy.__doc__ = `\x1b[36mcopy(request)\x1b[0m

Copy a model to a new name

\x1b[33mParameters:\x1b[0m
  request: \x1b[90mObject\x1b[0m
    source: \x1b[90mstring\x1b[0m - Source model name
    destination: \x1b[90mstring\x1b[0m - New model name

\x1b[33mReturns:\x1b[0m Promise<boolean>

\x1b[33mExample:\x1b[0m
  await copy({source: "llama3", destination: "my-llama"})
  \x1b[32m// → true\x1b[0m`;
  
  copy[Symbol.for('Deno.customInspect')] = function() { return copy.__doc__; };

  // Setup deleteModel documentation
  deleteModel.__doc__ = `\x1b[36mdeleteModel(request)\x1b[0m

Delete a model

\x1b[33mParameters:\x1b[0m
  request: \x1b[90mObject\x1b[0m
    name: \x1b[90mstring\x1b[0m - Model name to delete

\x1b[33mReturns:\x1b[0m Promise<boolean>

\x1b[33mExample:\x1b[0m
  await deleteModel({name: "my-custom-model"})
  \x1b[32m// → true\x1b[0m`;
  
  deleteModel[Symbol.for('Deno.customInspect')] = function() { return deleteModel.__doc__; };

  // Setup embeddings documentation
  embeddings.__doc__ = `\x1b[36membeddings(request)\x1b[0m

Generate embeddings from text

\x1b[33mParameters:\x1b[0m
  request: \x1b[90mObject\x1b[0m
    model: \x1b[90mstring\x1b[0m - Model name
    prompt: \x1b[90mstring\x1b[0m - Text to embed

\x1b[33mReturns:\x1b[0m Promise<Object> - Embedding vector

\x1b[33mExample:\x1b[0m
  await embeddings({model: "llama3", prompt: "Hello world"})
  \x1b[32m// → {embedding: [0.1, -0.2, 0.3, ...]}\x1b[0m`;
  
  embeddings[Symbol.for('Deno.customInspect')] = function() { return embeddings.__doc__; };

  // Setup ps documentation
  ps.__doc__ = `\x1b[36mps()\x1b[0m

List running models

\x1b[33mReturns:\x1b[0m Promise<Object> - Running models info

\x1b[33mExample:\x1b[0m
  await ps()
  \x1b[32m// → {models: [{name: "llama3", size: 4661224676, digest: "abc...", expires_at: "..."}]}\x1b[0m`;
  
  ps[Symbol.for('Deno.customInspect')] = function() { return ps.__doc__; };

  // Setup isRunning documentation
  isRunning.__doc__ = `\x1b[36misRunning()\x1b[0m

Check if Ollama service is running

\x1b[33mReturns:\x1b[0m Promise<boolean>

\x1b[33mExample:\x1b[0m
  await isRunning()
  \x1b[32m// → true\x1b[0m`;
  
  isRunning[Symbol.for('Deno.customInspect')] = function() { return isRunning.__doc__; };
}

// Initialize on module load
initializeDocs();