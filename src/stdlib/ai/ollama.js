// Ollama module - AI integration

export const list = async () => {
  const response = await fetch("http://localhost:11434/api/tags");
  if (!response.ok) throw new Error("Ollama not running");
  const data = await response.json();
  return data.models || [];
};

export const chat = async (prompt, model = "qwen2.5-coder:3b") => {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false })
  });
  if (!response.ok) throw new Error("Ollama chat failed");
  const data = await response.json();
  return data.response;
};