# hlvm.app

Control the HLVM GUI application via WebSocket when it's running on port 11436.

## Overview

The `hlvm.app` namespace provides control over the HLVM GUI application, including Spotlight integration, chat interface, and code playground. These functions require the macOS GUI app to be running.

## Connection Management

### app.connect(port?)
Connect to the GUI app WebSocket server.

```javascript
// Connect to default port 11436
await hlvm.app.connect();

// Connect to custom port
await hlvm.app.connect(8080);
```

### app.disconnect()
Disconnect from the GUI app.

```javascript
hlvm.app.disconnect();
```

### app.isConnected()
Check connection status.

```javascript
if (hlvm.app.isConnected()) {
  console.log("GUI app connected");
}
```

## Spotlight Control

### app.spotlight.toggle()
Toggle Spotlight window visibility.

```javascript
await hlvm.app.spotlight.toggle();
```

### app.spotlight.show()
Show Spotlight window.

```javascript
await hlvm.app.spotlight.show();
```

### app.spotlight.hide()
Hide Spotlight window.

```javascript
await hlvm.app.spotlight.hide();
```

### app.spotlight.search(query)
Search in Spotlight.

```javascript
await hlvm.app.spotlight.search("hello");
```

### app.spotlight.navigateIn()
Navigate into selected item.

```javascript
await hlvm.app.spotlight.navigateIn();
```

### app.spotlight.navigateOut()
Navigate back to parent level.

```javascript
await hlvm.app.spotlight.navigateOut();
```

## Chat Interface

### app.chat.toggle()
Toggle chat window.

```javascript
await hlvm.app.chat.toggle();
```

### app.chat.send(message)
Send message to chat.

```javascript
await hlvm.app.chat.send("Hello AI!");
```

### app.chat.createRoom(name)
Create new chat room.

```javascript
await hlvm.app.chat.createRoom("Project Ideas");
```

### app.chat.selectRoom(id)
Select chat room by ID.

```javascript
await hlvm.app.chat.selectRoom("room-123");
```

### app.chat.list()
List all chat rooms.

```javascript
const rooms = await hlvm.app.chat.list();
console.log(rooms);
```

### app.chat.ask(prompt)
Ask AI a question.

```javascript
const answer = await hlvm.app.chat.ask("What is HLVM?");
console.log(answer);
```

### app.chat.stop()
Stop current chat generation.

```javascript
await hlvm.app.chat.stop();
```

### app.chat.cancel()
Cancel chat operation.

```javascript
await hlvm.app.chat.cancel();
```

## Playground

### app.playground.toggle()
Toggle code playground.

```javascript
await hlvm.app.playground.toggle();
```

### app.playground.eval(code)
Evaluate code in playground.

```javascript
const result = await hlvm.app.playground.eval("2 + 2");
console.log(result); // 4
```

### app.playground.setCode(code)
Set playground code content.

```javascript
await hlvm.app.playground.setCode(`
  console.log("Hello!");
  return 42;
`);
```

### app.playground.increaseFont()
Increase font size.

```javascript
await hlvm.app.playground.increaseFont();
```

### app.playground.decreaseFont()
Decrease font size.

```javascript
await hlvm.app.playground.decreaseFont();
```

## Screenshot

### app.screenshot.capture()
Capture screenshot interactively.

```javascript
await hlvm.app.screenshot.capture();
```

### app.screenshot.captureScreen()
Capture full screen.

```javascript
await hlvm.app.screenshot.captureScreen();
```

### app.screenshot.captureEntire()
Capture entire desktop.

```javascript
await hlvm.app.screenshot.captureEntire();
```

### app.screenshot.captureSelection()
Capture selected area.

```javascript
await hlvm.app.screenshot.captureSelection();
```

## App Control

### app.preferences()
Open preferences window.

```javascript
await hlvm.app.preferences();
```

### app.settings()
Open settings.

```javascript
await hlvm.app.settings();
```

### app.textEditor()
Open text editor.

```javascript
await hlvm.app.textEditor();
```

### app.minimize()
Minimize app window.

```javascript
await hlvm.app.minimize();
```

### app.quit()
Quit the app.

```javascript
await hlvm.app.quit();
```

### app.escape()
Send escape key to app.

```javascript
await hlvm.app.escape();
```

## Code Operations

### app.code.paste(code)
Paste code into editor.

```javascript
await hlvm.app.code.paste("console.log('Hello');");
```

### app.code.copy()
Copy code from editor.

```javascript
const code = await hlvm.app.code.copy();
console.log(code);
```

## REPL Control

### app.repl.toggle()
Toggle REPL window.

```javascript
await hlvm.app.repl.toggle();
```

### app.repl.clear()
Clear REPL output.

```javascript
await hlvm.app.repl.clear();
```

### app.repl.execute(code)
Execute code in REPL.

```javascript
await hlvm.app.repl.execute("hlvm.status()");
```

## AI Writing

### app.ai.write(prompt)
Generate text with AI.

```javascript
const text = await hlvm.app.ai.write("Write a haiku about code");
console.log(text);
```

## Low-Level Control

### app.request(method, params?)
Send custom JSON-RPC request.

```javascript
const result = await hlvm.app.request("custom.method", {
  param1: "value"
});
```

### app.notify(method, params?)
Send notification (no response expected).

```javascript
hlvm.app.notify("log.message", {
  text: "Debug info"
});
```

## Examples

### Launch and Search Spotlight
```javascript
// Connect to app
await hlvm.app.connect();

// Show Spotlight
await hlvm.app.spotlight.show();

// Search for modules
await hlvm.app.spotlight.search("hello");
```

### Interactive Chat Session
```javascript
// Open chat
await hlvm.app.chat.toggle();

// Create new room
await hlvm.app.chat.createRoom("Coding Help");

// Ask question
const answer = await hlvm.app.chat.ask("How do I read a file in HLVM?");
console.log(answer);
```

### Code Playground
```javascript
// Open playground
await hlvm.app.playground.toggle();

// Set code
await hlvm.app.playground.setCode(`
  const data = await hlvm.fs.read('/tmp/test.txt');
  console.log(data);
  return data.length;
`);

// Execute
const result = await hlvm.app.playground.eval();
console.log("Result:", result);
```

## Notes

- Requires HLVM GUI app running on macOS
- Default WebSocket port: 11436
- All methods return Promises
- Connection auto-retry on first command if disconnected