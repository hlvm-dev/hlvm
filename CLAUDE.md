# CLAUDE.md - Instructions for Claude AI Assistant

## CRITICAL: API Documentation Requirements

### EVERY TIME You Add/Remove/Modify Public APIs

**You MUST update this documentation immediately when:**
- Adding new CLI commands
- Adding new REPL JavaScript/TypeScript APIs  
- Modifying existing APIs
- Removing deprecated APIs
- Changing API signatures or behavior

**Documentation Format:**
- Use markdown format suitable for GitHub docs
- Include examples for every API
- Mark deprecated APIs clearly
- Test all examples before documenting

## Self-Documenting REPL API Requirements

### EVERY Public Function MUST Have JSDoc Documentation

**All public functions in HLVM must include JSDoc comments for self-documentation in the REPL.**

When users type a function name in the REPL (without calling it), they should see:
- Function signature
- Description
- Parameters with types
- Return value
- Examples with expected output

**Required JSDoc Format:**
```javascript
/**
 * Brief description of what the function does
 * @param {type} paramName - Parameter description
 * @param {type} [optionalParam] - Optional parameter description
 * @returns {Promise<type>} Return value description
 * @example
 * await functionName("input")
 * // → "expected output"
 * @example
 * await functionName("input2", {option: "value"})
 * // → "different output"
 */
export async function functionName(param, optionalParam = {}) {
  // implementation
}
```

**Implementation Pattern:**

For functions that need runtime initialization, add documentation setup:

```javascript
// At module level, after function definitions:
function initializeDocs() {
  functionName.__doc__ = `formatted documentation string`;
  functionName[Symbol.for('Deno.customInspect')] = function() {
    return this.__doc__;
  };
}

initializeDocs(); // Call on module load
```

**REPL Experience:**
```javascript
> hlvm.stdlib.ai.revise
// Shows full documentation with examples

> hlvm.core.io.fs.read
// Shows file reading documentation
```

This makes the API self-discoverable - users can explore functionality without leaving the REPL or checking external documentation.

## HLVM Testing Requirements

### The Master Test
```bash
./test/test.sh
```
This runs 82+ tests covering:
- All 59 stdlib functions
- All 24 CLI commands
- Real operations (not fake type checks)

### IMPORTANT: Test After Every Milestone

**When you complete a milestone (not every single feature), you MUST:**

1. Run the master test:
```bash
./test/test.sh
```

2. Ensure all existing tests pass (82/82)

3. If you added new features in the milestone, add tests for them:
   - Add to the appropriate section in `/test/test.sh`
   - Use `run_test` for REPL tests
   - Use `cli_test` for CLI command tests

### What Counts as a Milestone

A milestone is completed when:
- A major feature is fully implemented (e.g., new module, CLI interface)
- A significant refactoring is done
- Multiple related features are added
- User explicitly asks to test
- You're about to commit changes

NOT every single function or small change - only complete, coherent feature sets.

### How to Add New Tests

When you add new functionality:

```bash
# For stdlib functions - add to appropriate module section:
run_test "module.newFunction()" "console.log(await hlvm.module.newFunction())" "expected_output"

# For CLI commands - add to CLI section:
cli_test "new command" "new subcmd args" "expected_output"
```

### Test Coverage Requirements

The test must verify:
- Function actually works (not just typeof)
- Real operations occur (files created, data saved, etc.)
- Output matches expected results
- Error cases handled properly (if critical)

### Example: Adding a New Feature

If you add a new `hlvm.network.fetch()` function:

1. Complete the implementation
2. Add test to test.sh:
```bash
run_test "network.fetch()" "const r = await hlvm.network.fetch('http://example.com'); console.log(r.ok)" "true"
```
3. Run full test suite
4. Confirm 83/83 pass (was 82, now 83)

### Test Guidelines

- Test real functionality, not types
- Test actual operations (file I/O, database ops, etc.)
- Keep tests fast but thorough
- If a test requires user interaction, use type checks only
- Clean up test artifacts (temp files, database entries)

### Current Test Status

As of last run:
- Total tests: 82
- All passing: ✅
- Coverage: 100% of public API

### Remember

**ALWAYS run `./test/test.sh` after completing a milestone and before any commit.**

If tests fail:
1. Fix the issue
2. Re-run tests
3. Only proceed when all pass

This ensures HLVM remains 100% functional at all times.

## Public API Documentation Responsibility

**You are responsible for maintaining complete API documentation.**

When you add/modify/remove ANY public API, you MUST create or update the corresponding documentation in a format suitable for `docs/*.md` files.

Current public APIs that need documentation:
- CLI commands: `hlvm`, `hlvm save`, `hlvm revise`, `hlvm deno *`, `hlvm ollama *`
- JavaScript APIs: `hlvm.*` namespace (core, app, stdlib, env)
  - Core: system, storage, io, computer, ui, ai, event, fn
  - Stdlib: ai (ask, revise, draw, refactor)
  - Function aliases: `hlvm.core.fn.*` for global function management
- WebSocket Bridge API (port 11436, JSON-RPC)

Documentation should follow the style of https://github.com/ollama/ollama/blob/main/docs/api.md

## Important Instructions

**DO ONLY WHAT IS ASKED. DO NOT CREATE FILES OR DOCUMENTATION UNLESS EXPLICITLY REQUESTED.**

When user asks to inspect or analyze code/structure:
- Analyze and respond with findings
- DO NOT create new documentation files
- DO NOT write files unless explicitly asked

When user provides a task:
- Complete ONLY that specific task
- Do not add extra features or documentation
- Do not create files beyond what was requested