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

// API Methods - now much more concise
export async function generate(request) {
  const response = await apiRequest("generate", "POST", request);
  return handleResponse(response, request);
}

export async function chat(request) {
  const response = await apiRequest("chat", "POST", request);
  return handleResponse(response, request);
}

export async function create(request) {
  const response = await apiRequest("create", "POST", request);
  return handleResponse(response, request);
}

export async function list() {
  const response = await apiRequest("tags");
  return response.json();
}

export async function show(request) {
  const response = await apiRequest("show", "POST", request);
  return response.json();
}

export async function copy(request) {
  await apiRequest("copy", "POST", request);
  return true;
}

export async function deleteModel(request) {
  await apiRequest("delete", "DELETE", request);
  return true;
}

export async function pull(request) {
  const response = await apiRequest("pull", "POST", request);
  return handleResponse(response, request);
}

export async function push(request) {
  const response = await apiRequest("push", "POST", request);
  return handleResponse(response, request);
}

export async function embeddings(request) {
  const response = await apiRequest("embeddings", "POST", request);
  return response.json();
}

export async function ps() {
  const response = await apiRequest("ps");
  return response.json();
}

export async function isRunning() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}