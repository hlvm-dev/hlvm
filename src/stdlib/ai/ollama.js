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

// Generate a completion
export async function generate(request) {
  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    const error = await response.text();
    let message = `Ollama generate failed: ${response.statusText}`;
    try {
      const parsed = JSON.parse(error);
      if (parsed.error) message = parsed.error;
    } catch {}
    throw new Error(message);
  }
  
  if (request.stream === false) {
    return await response.json();
  }
  
  // Return async generator for streaming
  return streamResponse(response);
}

// Chat completion
export async function chat(request) {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Ollama chat failed: ${response.statusText}`);
  }
  
  if (request.stream === false) {
    return await response.json();
  }
  
  return streamResponse(response);
}

// Create a model from a Modelfile
export async function create(request) {
  const response = await fetch(`${OLLAMA_HOST}/api/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Ollama create failed: ${response.statusText}`);
  }
  
  if (request.stream === false) {
    return await response.json();
  }
  
  return streamResponse(response);
}

// List local models
export async function list() {
  const response = await fetch(`${OLLAMA_HOST}/api/tags`);
  
  if (!response.ok) {
    throw new Error(`Ollama list failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Show model information
export async function show(request) {
  const response = await fetch(`${OLLAMA_HOST}/api/show`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Ollama show failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Copy a model
export async function copy(request) {
  const response = await fetch(`${OLLAMA_HOST}/api/copy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Ollama copy failed: ${response.statusText}`);
  }
  
  return response.ok;
}

// Delete a model
export async function deleteModel(request) {
  const response = await fetch(`${OLLAMA_HOST}/api/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Ollama delete failed: ${response.statusText}`);
  }
  
  return response.ok;
}

// Pull a model
export async function pull(request) {
  const response = await fetch(`${OLLAMA_HOST}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Ollama pull failed: ${response.statusText}`);
  }
  
  if (request.stream === false) {
    return await response.json();
  }
  
  return streamResponse(response);
}

// Push a model
export async function push(request) {
  const response = await fetch(`${OLLAMA_HOST}/api/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Ollama push failed: ${response.statusText}`);
  }
  
  if (request.stream === false) {
    return await response.json();
  }
  
  return streamResponse(response);
}

// Generate embeddings
export async function embeddings(request) {
  const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Ollama embeddings failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// List running models
export async function ps() {
  const response = await fetch(`${OLLAMA_HOST}/api/ps`);
  
  if (!response.ok) {
    throw new Error(`Ollama ps failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Check if Ollama is running
export async function isRunning() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}