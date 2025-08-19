// HLVM Documentation Registry - Simple hardcoded documentation strings

const docs = new Map();

// ===== AI Module Documentation =====

docs.set('hlvm.stdlib.ai.revise', `\x1b[36mrevise(input?, options?)\x1b[0m

Revises text using AI to improve clarity, grammar, and tone

\x1b[33mParameters:\x1b[0m
  input: \x1b[90mstring\x1b[0m (optional) - Text to revise (uses clipboard if empty)
  options: \x1b[90mObject\x1b[0m (optional)
    tone: 'default'|'professional'|'casual'|'friendly'|'concise'|'formal'

\x1b[33mReturns:\x1b[0m Promise<string> - Revised text

\x1b[33mExamples:\x1b[0m
  await revise("thx for ur help")
  \x1b[32m// → "Thank you for your help"\x1b[0m
  
  await revise("hey can u send the files", {tone: "professional"})
  \x1b[32m// → "Could you please send the files?"\x1b[0m
  
  await revise() // Revises clipboard content
  \x1b[32m// → [Revised text from clipboard]\x1b[0m`);

docs.set('hlvm.stdlib.ai.draw', `\x1b[36mdraw(input?, options?)\x1b[0m

Creates ASCII diagrams from text using AI

\x1b[33mParameters:\x1b[0m
  input: \x1b[90mstring\x1b[0m (optional) - Text to visualize (uses clipboard if empty)
  options: \x1b[90mObject\x1b[0m (optional)
    type: 'auto'|'flowchart'|'sequence'|'tree'|'graph'|'mindmap'|'table'
    style: 'simple'|'detailed'

\x1b[33mReturns:\x1b[0m Promise<string> - ASCII diagram

\x1b[33mExamples:\x1b[0m
  await draw("login -> validate -> dashboard")
  \x1b[32m// → ┌─────┐    ┌──────────┐    ┌───────────┐
  //   │login│───▶│ validate │───▶│ dashboard │
  //   └─────┘    └──────────┘    └───────────┘\x1b[0m
  
  await draw("user story steps", {type: "sequence"})
  \x1b[32m// → User     System     Database
  //   │         │           │
  //   │─login──▶│           │
  //   │         │──query───▶│
  //   │         │◀──result──│\x1b[0m`);

docs.set('hlvm.stdlib.ai.refactor', `\x1b[36mrefactor(input?, options?)\x1b[0m

Refactors code using AI to improve quality and apply best practices

\x1b[33mParameters:\x1b[0m
  input: \x1b[90mstring\x1b[0m (optional) - Code to refactor (uses clipboard if empty)
  options: \x1b[90mObject\x1b[0m (optional)
    type: 'all'|'clean'|'solid'|'dry'|'unused'|'simplify'|'modern'|'performance'

\x1b[33mTypes:\x1b[0m
  all        - Comprehensive refactor (default)
  clean      - Clean Code principles
  solid      - SOLID principles
  dry        - Remove redundancy
  unused     - Remove unused code
  simplify   - Make code simpler
  modern     - Update to modern syntax
  performance - Optimize performance

\x1b[33mReturns:\x1b[0m Promise<string> - Refactored code

\x1b[33mExamples:\x1b[0m
  await refactor(uglyCode)
  \x1b[32m// → [Clean, well-structured code]\x1b[0m
  
  await refactor(code, {type: "unused"})
  \x1b[32m// → [Code with unused elements removed]\x1b[0m`);

docs.set('hlvm.stdlib.ai.ask', `\x1b[36mask(input?, options?)\x1b[0m

Simple chat with AI - ask any question and get an answer

\x1b[33mParameters:\x1b[0m
  input: \x1b[90mstring\x1b[0m (optional) - Question to ask (uses clipboard if empty)
  options: \x1b[90mObject\x1b[0m (optional)
    model: Model to use
    stream: Stream response (default: true)
    temperature: Creativity 0-2 (default: 0.7)

\x1b[33mReturns:\x1b[0m Promise<string> - AI response

\x1b[33mExamples:\x1b[0m
  await ask("What is the capital of France?")
  \x1b[32m// → "The capital of France is Paris."\x1b[0m
  
  await ask("Explain quantum computing")
  \x1b[32m// → [Detailed explanation...]\x1b[0m`);

// ===== File System Documentation =====

docs.set('hlvm.core.io.fs.read', `\x1b[36mread(path)\x1b[0m

Reads text content from a file

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - File path to read

\x1b[33mReturns:\x1b[0m Promise<string> - File content

\x1b[33mExample:\x1b[0m
  await read('/tmp/test.txt')
  \x1b[32m// → "Hello World"\x1b[0m`);

docs.set('hlvm.core.io.fs.write', `\x1b[36mwrite(path, content)\x1b[0m

Writes text content to a file

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - File path
  content: \x1b[90mstring\x1b[0m - Text to write

\x1b[33mReturns:\x1b[0m Promise<void>

\x1b[33mExample:\x1b[0m
  await write('/tmp/test.txt', 'Hello')
  \x1b[32m// → File created\x1b[0m`);

docs.set('hlvm.core.io.fs.exists', `\x1b[36mexists(path)\x1b[0m

Checks if file or directory exists

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - Path to check

\x1b[33mReturns:\x1b[0m Promise<boolean>

\x1b[33mExample:\x1b[0m
  await exists('/tmp/test.txt')
  \x1b[32m// → true\x1b[0m`);

docs.set('hlvm.core.io.fs.mkdir', `\x1b[36mmkdir(path, options?)\x1b[0m

Creates a directory

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - Directory path
  options: \x1b[90mObject\x1b[0m (optional)
    recursive: Create parent dirs

\x1b[33mExample:\x1b[0m
  await mkdir('/tmp/test/deep')
  \x1b[32m// → Directory created\x1b[0m`);

docs.set('hlvm.core.io.fs.remove', `\x1b[36mremove(path, options?)\x1b[0m

Removes file or directory

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m - Path to remove
  options: \x1b[90mObject\x1b[0m (optional)
    recursive: Remove contents

\x1b[33mExample:\x1b[0m
  await remove('/tmp/test')
  \x1b[32m// → Removed\x1b[0m`);

// ===== Clipboard Documentation =====

docs.set('hlvm.core.io.clipboard.read', `\x1b[36mread()\x1b[0m

Reads text from system clipboard

\x1b[33mReturns:\x1b[0m Promise<string> - Clipboard content

\x1b[33mExample:\x1b[0m
  await clipboard.read()
  \x1b[32m// → "copied text"\x1b[0m`);

docs.set('hlvm.core.io.clipboard.write', `\x1b[36mwrite(text)\x1b[0m

Writes text to system clipboard

\x1b[33mParameters:\x1b[0m
  text: \x1b[90mstring\x1b[0m - Text to copy

\x1b[33mExample:\x1b[0m
  await clipboard.write("Hello")
  \x1b[32m// → Copied to clipboard\x1b[0m`);

// ===== Keyboard Documentation =====

docs.set('hlvm.core.computer.keyboard.type', `\x1b[36mtype(text)\x1b[0m

Types text as if typed on keyboard

\x1b[33mParameters:\x1b[0m
  text: \x1b[90mstring\x1b[0m - Text to type

\x1b[33mExample:\x1b[0m
  await keyboard.type("Hello")
  \x1b[32m// → Types each character\x1b[0m`);

docs.set('hlvm.core.computer.keyboard.press', `\x1b[36mpress(keys)\x1b[0m

Presses keyboard shortcut

\x1b[33mParameters:\x1b[0m
  keys: \x1b[90mstring | string[]\x1b[0m - Key(s) to press

\x1b[33mExamples:\x1b[0m
  await keyboard.press("enter")
  \x1b[32m// → Presses Enter\x1b[0m
  
  await keyboard.press(["cmd", "s"])
  \x1b[32m// → Presses Cmd+S\x1b[0m`);

// ===== Mouse Documentation =====

docs.set('hlvm.core.computer.mouse.click', `\x1b[36mclick(x?, y?, button?)\x1b[0m

Clicks mouse at position

\x1b[33mParameters:\x1b[0m
  x: \x1b[90mnumber\x1b[0m (optional) - X coordinate
  y: \x1b[90mnumber\x1b[0m (optional) - Y coordinate
  button: \x1b[90mstring\x1b[0m (optional) - 'left'|'right'

\x1b[33mExample:\x1b[0m
  await mouse.click(100, 200)
  \x1b[32m// → Clicks at (100, 200)\x1b[0m`);

docs.set('hlvm.core.computer.mouse.move', `\x1b[36mmove(x, y)\x1b[0m

Moves mouse to position

\x1b[33mParameters:\x1b[0m
  x: \x1b[90mnumber\x1b[0m - X coordinate
  y: \x1b[90mnumber\x1b[0m - Y coordinate

\x1b[33mExample:\x1b[0m
  await mouse.move(500, 300)
  \x1b[32m// → Moves to (500, 300)\x1b[0m`);

// ===== Screen Documentation =====

docs.set('hlvm.core.computer.screen.capture', `\x1b[36mcapture(path?)\x1b[0m

Captures screenshot

\x1b[33mParameters:\x1b[0m
  path: \x1b[90mstring\x1b[0m (optional) - Save path

\x1b[33mReturns:\x1b[0m Promise<string> - Screenshot path

\x1b[33mExample:\x1b[0m
  await screen.capture("/tmp/shot.png")
  \x1b[32m// → "/tmp/shot.png"\x1b[0m`);

// ===== Notification Documentation =====

docs.set('hlvm.core.ui.notification.notify', `\x1b[36mnotify(message, title?)\x1b[0m

Shows system notification

\x1b[33mParameters:\x1b[0m
  message: \x1b[90mstring\x1b[0m - Message text
  title: \x1b[90mstring\x1b[0m (optional) - Title

\x1b[33mExample:\x1b[0m
  await notify("Task done!", "HLVM")
  \x1b[32m// → Shows notification\x1b[0m`);

// ===== Event System Documentation =====

docs.set('hlvm.core.event.observe', `\x1b[36mobserve(target, hooks)\x1b[0m

Observe function calls or file changes

\x1b[33mParameters:\x1b[0m
  target: \x1b[90mstring\x1b[0m - Path to observe
  hooks: \x1b[90mObject\x1b[0m - Event hooks
    before: Before function call
    after: After function call
    onChange: On file change

\x1b[33mExample:\x1b[0m
  observe('hlvm.core.io.fs.write', {
    before: (args) => console.log('Writing:', args[0])
  })`);

// Export the documentation map
export default docs;