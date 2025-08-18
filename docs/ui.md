# hlvm.ui

UI control and Spotlight module management.

## Module Management Note

Module management has been moved to the generic `hlvm.modules.*` API since modules can be used by any UI, not just Spotlight. See [modules.md](modules.md) for full documentation.

```javascript
// Use generic module APIs
await hlvm.modules.save('mymodule', '...');
await hlvm.modules.remove('mymodule');
const modules = hlvm.modules.list();
```

## Spotlight Control

### hlvm.ui.spotlight.toggle()

Toggle Spotlight visibility.

```javascript
await hlvm.ui.spotlight.toggle();
```

---

### hlvm.ui.spotlight.show()

Show Spotlight interface.

```javascript
await hlvm.ui.spotlight.show();
```

---

### hlvm.ui.spotlight.hide()

Hide Spotlight interface.

```javascript
await hlvm.ui.spotlight.hide();
```

---

### hlvm.ui.spotlight.search(query)

Search in Spotlight.

```javascript
await hlvm.ui.spotlight.search('my query');
```

## Chat Interface

### hlvm.ui.chat.toggle()

Toggle chat interface.

```javascript
await hlvm.ui.chat.toggle();
```

---

### hlvm.ui.chat.send(message)

Send a message to chat.

```javascript
await hlvm.ui.chat.send('Hello AI');
```

---

### hlvm.ui.chat.ask(prompt)

Ask AI a question.

```javascript
const response = await hlvm.ui.chat.ask('What is HLVM?');
```

## Playground

### hlvm.ui.playground.toggle()

Toggle code playground.

```javascript
await hlvm.ui.playground.toggle();
```

---

### hlvm.ui.playground.eval(code)

Evaluate code in playground.

```javascript
const result = await hlvm.ui.playground.eval('2 + 2');
```

---

### hlvm.ui.playground.setCode(code)

Set playground code.

```javascript
await hlvm.ui.playground.setCode('console.log("Hello")');
```

## Screenshot

### hlvm.ui.screenshot.capture()

Interactive screenshot capture.

```javascript
await hlvm.ui.screenshot.capture();
```

---

### hlvm.ui.screenshot.captureScreen()

Capture entire screen.

```javascript
await hlvm.ui.screenshot.captureScreen();
```

---

### hlvm.ui.screenshot.captureSelection()

Capture selected area.

```javascript
await hlvm.ui.screenshot.captureSelection();
```

## App Control

### hlvm.ui.preferences()

Open preferences.

```javascript
await hlvm.ui.preferences();
```

---

### hlvm.ui.minimize()

Minimize the UI.

```javascript
await hlvm.ui.minimize();
```

---

### hlvm.ui.quit()

Quit the application.

```javascript
await hlvm.ui.quit();
```

## WebSocket Connection

### hlvm.ui.connect(port)

Connect to UI WebSocket server.

```javascript
await hlvm.ui.connect(11436);
```

**Parameters:**
- `port` (number) - WebSocket server port (default: 11436)

**Returns:** Promise<boolean>

---

### hlvm.ui.disconnect()

Disconnect from UI.

```javascript
hlvm.ui.disconnect();
```

---

### hlvm.ui.isConnected()

Check connection status.

```javascript
const connected = hlvm.ui.isConnected();
```

**Returns:** boolean

## Example Usage

```javascript
// Add a module (available to all UIs including Spotlight)
await hlvm.modules.save('timer', `
  export default async function(seconds = 5) {
    await hlvm.ui.notification.notify(\`Timer started for \${seconds}s\`, "Timer");
    await new Promise(r => setTimeout(r, seconds * 1000));
    await hlvm.ui.notification.alert("Time's up!", "Timer");
  }
`);

// Control the UI
await hlvm.ui.spotlight.show();
await hlvm.ui.spotlight.search('timer');

// Work with chat
await hlvm.ui.chat.toggle();
const answer = await hlvm.ui.chat.ask('How do I use HLVM?');

// Use playground
await hlvm.ui.playground.toggle();
await hlvm.ui.playground.eval('hlvm.status()');
```