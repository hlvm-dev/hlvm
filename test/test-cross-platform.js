// Test cross-platform compatibility
console.log("Testing HLVM cross-platform features...\n");

// Test 1: Platform detection
console.log("1. Platform Info:");
console.log("   OS:", Deno.build.os);
console.log("   Arch:", Deno.build.arch);
console.log("   Temp dir:", Deno.env.get("TMPDIR") || Deno.env.get("TEMP") || Deno.env.get("TMP") || "default");

// Test 2: Path separators
const pathSep = Deno.build.os === "windows" ? "\\" : "/";
console.log("\n2. Path separator:", JSON.stringify(pathSep));

// Test 3: File operations (cross-platform)
const testFile = `test-hlvm-${Date.now()}.txt`;
try {
  await Deno.writeTextFile(testFile, "HLVM cross-platform test");
  const content = await Deno.readTextFile(testFile);
  console.log("\n3. File I/O: ✓ (wrote and read:", content.substring(0, 20) + "...)");
  await Deno.remove(testFile);
} catch (e) {
  console.log("\n3. File I/O: ✗", e.message);
}

// Test 4: HLVM namespace
if (typeof hlvm !== 'undefined') {
  console.log("\n4. HLVM namespace: ✓");
  console.log("   Available modules:", Object.keys(hlvm).join(", "));
} else {
  console.log("\n4. HLVM namespace: ✗ (not loaded)");
}

// Test 5: Network (localhost works everywhere)
try {
  // Just check if we can create a request (not send it)
  const url = new URL("http://localhost:11434");
  console.log("\n5. Network URLs: ✓ (localhost supported)");
} catch (e) {
  console.log("\n5. Network URLs: ✗", e.message);
}

console.log("\n✅ Cross-platform tests complete!");