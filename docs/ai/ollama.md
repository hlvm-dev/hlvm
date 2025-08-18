# hlvm.ollama

AI/LLM integration with embedded Ollama.

## Functions

### chat(prompt, options)

Chat with AI model.

```javascript
const response = await hlvm.ollama.chat("Explain quantum physics");
console.log(response);
```

**Parameters:**
- `prompt` (string) - User prompt
- `options` (object) - Optional settings
  - `model` (string) - Model name (default: "llama3.2")
  - `temperature` (number) - Creativity (0-1)
  - `system` (string) - System prompt

**Returns:** Promise<string> - AI response

---

### list()

List available models.

```javascript
const models = await hlvm.ollama.list();
models.forEach(m => console.log(m.name, m.size));
```

**Returns:** Promise<Array<Model>> - Array of model objects

---

### pull(model)

Download a model from Ollama library.

```javascript
await hlvm.ollama.pull("llama2");
```

**Parameters:**
- `model` (string) - Model name to download

**Returns:** Promise<void>

---

### delete(model)

Delete a downloaded model.

```javascript
await hlvm.ollama.delete("llama2");
```

**Parameters:**
- `model` (string) - Model name to delete

**Returns:** Promise<void>

---

### show(model)

Show model information.

```javascript
const info = await hlvm.ollama.show("llama3.2");
console.log(info);
```

**Parameters:**
- `model` (string) - Model name

**Returns:** Promise<ModelInfo> - Model details

## Shorthand

### hlvm.ask(prompt)

Shorthand for `hlvm.ollama.chat()`.

```javascript
const answer = await hlvm.ask("What is 2+2?");
```

## Examples

### Simple Chat

```javascript
const response = await hlvm.ollama.chat("Write a haiku about coding");
console.log(response);
```

### Chat with Options

```javascript
const response = await hlvm.ollama.chat("Be creative", {
  model: "llama3.2",
  temperature: 0.9,
  system: "You are a creative writer"
});
```

### Model Management

```javascript
// List models
const models = await hlvm.ollama.list();
console.log("Available models:", models.map(m => m.name));

// Download new model
await hlvm.ollama.pull("codellama");

// Use the new model
const code = await hlvm.ollama.chat("Write a Python function", {
  model: "codellama"
});
```

### AI Assistant Module

```javascript
await hlvm.app.spotlight.modules.add('ai-assistant', `
  export default async function() {
    const prompt = await hlvm.notification.prompt("Ask AI:");
    if (!prompt) return;
    
    await hlvm.notification.notify("Thinking...", "AI");
    
    const response = await hlvm.ollama.chat(prompt);
    
    await hlvm.clipboard.write(response);
    await hlvm.notification.alert(response, "AI Response");
  }
`);
```

### Code Generator

```javascript
async function generateCode(description) {
  const prompt = `Write JavaScript code for: ${description}`;
  
  const code = await hlvm.ollama.chat(prompt, {
    model: "codellama",
    system: "You are a code generator. Return only code, no explanations."
  });
  
  // Save to file
  await hlvm.fs.write('/tmp/generated.js', code);
  
  return code;
}
```

### Multi-turn Conversation

```javascript
let context = [];

async function conversation(message) {
  context.push({ role: "user", content: message });
  
  const response = await hlvm.ollama.chat(message, {
    context: context
  });
  
  context.push({ role: "assistant", content: response });
  
  return response;
}

// Usage
await conversation("Hello");
await conversation("What did I just say?");
```

## Available Models

Common models (download with `pull()`):
- `llama3.2` - General purpose (default)
- `llama2` - Previous version
- `codellama` - Code generation
- `mistral` - Fast and efficient
- `phi` - Small but capable

## Notes

- Ollama service starts automatically with HLVM
- Models are stored in `~/.ollama/models`
- First chat may be slow if model needs loading
- Internet required for pulling new models