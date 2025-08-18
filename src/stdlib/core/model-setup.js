// HLVM Model Setup - Extract and install embedded model on first run
// Use global EMBEDDED_MODEL set by hlvm-init.js
const EMBEDDED_MODEL = globalThis.EMBEDDED_MODEL || "qwen3:0.6b";

/**
 * Check if the embedded model is already installed
 */
async function isModelInstalled() {
  try {
    // Check if ollama has our model
    const { exec } = await import("./system.js");
    const result = await exec(["./resources/ollama", "list"]);
    return result.includes(EMBEDDED_MODEL);
  } catch {
    return false;
  }
}

/**
 * Extract and install the embedded model bundle
 */
export async function setupEmbeddedModel() {
  // Check if model already installed
  if (await isModelInstalled()) {
    return true; // Already set up
  }
  
  console.log(`🤖 Setting up embedded model ${EMBEDDED_MODEL}...`);
  
  try {
    // The model bundle is extracted to temp dir alongside deno/ollama
    // Find it in the same temp directory where our runtime is
    const tempBase = Deno.execPath().replace(/\/hlvm-deno$/, "");
    let modelBundlePath = `${tempBase}/hlvm-model`;
    
    // Check if model bundle exists in temp (as executable)
    try {
      await Deno.stat(modelBundlePath);
      console.log("  Found embedded model bundle");
      // Strip the shebang line when extracting
      const modelData = await Deno.readFile(modelBundlePath);
      // Find where tar.gz actually starts (after #!/bin/sh\n)
      const shebangEnd = 10; // "#!/bin/sh\n" is 10 bytes
      const tarData = modelData.slice(shebangEnd);
      // Write clean tar.gz to temp
      const cleanTarPath = `${tempBase}/model-clean.tar.gz`;
      await Deno.writeFile(cleanTarPath, tarData);
      modelBundlePath = cleanTarPath;
    } catch {
      // Fallback: check resources directory (for development)
      const devPath = "resources/model-bundle.tar.gz";
      try {
        await Deno.stat(devPath);
        modelBundlePath = devPath;
      } catch {
        console.log("⚠️  Model bundle not found. Model will be downloaded on first use.");
        return false;
      }
    }
    
    // Ensure ~/.ollama directory exists
    const ollamaDir = `${Deno.env.get("HOME")}/.ollama`;
    await Deno.mkdir(ollamaDir, { recursive: true });
    
    // Extract to ~/.ollama
    const { exec } = await import("./system.js");
    console.log("  Extracting model files...");
    await exec(["tar", "-xzf", modelBundlePath, "-C", ollamaDir]);
    
    console.log(`✅ Model ${EMBEDDED_MODEL} installed successfully`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to setup embedded model: ${error.message}`);
    console.error(`   You may need to run: ./resources/ollama pull ${EMBEDDED_MODEL}`);
    return false;
  }
}

// Auto-setup on module load (runs once at startup)
let setupPromise = null;

export function ensureModelSetup() {
  if (!setupPromise) {
    setupPromise = setupEmbeddedModel();
  }
  return setupPromise;
}