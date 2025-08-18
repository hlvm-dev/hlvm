// HLVM Model Manager - Handles automatic model downloading with progress
// This ensures AI features work out-of-the-box without blocking startup

const EMBEDDED_MODEL = globalThis.EMBEDDED_MODEL || "qwen2.5-coder:1.5b";

let modelChecked = false;
let modelAvailable = false;
let downloadInProgress = false;

/**
 * Ensure model is available, download if needed with progress display
 * @returns {Promise<boolean>} True if model is ready
 */
export async function ensureModel() {
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
    const hasModel = models.models?.some(m => m.name === EMBEDDED_MODEL);
    
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
    console.log(`║  Downloading model: ${EMBEDDED_MODEL.padEnd(40)}  ║`);
    console.log("║  This will take a few minutes but only happens once.            ║");
    console.log("║                                                                  ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    // Pull model with progress
    const pullProcess = await globalThis.hlvm.core.system.exec(
      ["./resources/ollama", "pull", EMBEDDED_MODEL],
      { stream: true }
    );

    // Display progress
    let lastLine = "";
    for await (const chunk of pullProcess) {
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        // Clear previous line if it was a progress update
        if (lastLine.includes('%') || lastLine.includes('pulling')) {
          process.stdout.write('\r\x1b[K'); // Clear line
        }
        
        // Display current line
        if (line.includes('%') || line.includes('pulling')) {
          process.stdout.write(`  ${line}`);
          lastLine = line;
        } else if (line.includes('success')) {
          console.log("\n✅ Model downloaded successfully!");
        }
      }
    }

    // Verify download
    const verifyModels = await globalThis.hlvm.core.ai.ollama.list();
    modelAvailable = verifyModels.models?.some(m => m.name === EMBEDDED_MODEL);
    
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