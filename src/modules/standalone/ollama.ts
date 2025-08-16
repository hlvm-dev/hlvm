/**
 * Ollama Direct API Module
 * 
 * Direct integration with Ollama LLM - works standalone without macOS app
 */

const OLLAMA_BASE_URL = 'http://localhost:11434';

/**
 * Direct Ollama chat (no UI needed)
 */
export async function ask(prompt: string, options: {
    model?: string;
    stream?: boolean;
} = {}): Promise<string> {
    const model = options.model || 'llama3.2';
    
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Chat error:', error);
        return `Error: ${error.message}. Is Ollama running on port 11434?`;
    }
}

/**
 * Stream chat responses
 */
export async function* stream(prompt: string, model = 'llama3.2') {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');
        
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            yield json.response;
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                    }
                }
            }
        }
    } catch (error) {
        yield `Error: ${error.message}`;
    }
}

/**
 * List available models
 */
export async function list(): Promise<any[]> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error('Failed to list models:', error);
        return [];
    }
}

/**
 * Pull a model
 */
export async function pull(modelName: string): Promise<void> {
    console.log(`Pulling model ${modelName}...`);
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
    }
    
    // Stream the progress
    const reader = response.body?.getReader();
    if (reader) {
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            process.stdout.write(chunk);
        }
    }
}

/**
 * Delete a model
 */
export async function deleteModel(modelName: string): Promise<void> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
    });
    
    if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.status}`);
    }
}

// Export as default module
export default {
    ask,
    stream,
    list,
    pull,
    delete: deleteModel
};