# hlvm.notification

UI dialogs and system notifications.

## Functions

### notify(message, title)

Show system notification.

```javascript
await hlvm.notification.notify("Task complete!", "HLVM");
```

**Parameters:**
- `message` (string) - Notification message
- `title` (string) - Notification title

**Returns:** Promise<void>

---

### alert(message, title)

Show alert dialog. Blocks until user clicks OK.

```javascript
await hlvm.notification.alert("Operation finished", "Success");
```

**Parameters:**
- `message` (string) - Alert message
- `title` (string) - Alert title

**Returns:** Promise<void>

---

### confirm(message, title)

Show confirmation dialog with OK/Cancel buttons.

```javascript
const confirmed = await hlvm.notification.confirm("Delete file?", "Confirm");
if (confirmed) {
  // User clicked OK
}
```

**Parameters:**
- `message` (string) - Confirmation message
- `title` (string) - Dialog title

**Returns:** Promise<boolean> - true if OK clicked, false if Cancel

---

### prompt(message, defaultValue)

Show input prompt dialog.

```javascript
const name = await hlvm.notification.prompt("Enter your name:", "John");
if (name !== null) {
  console.log(`Hello ${name}`);
}
```

**Parameters:**
- `message` (string) - Prompt message
- `defaultValue` (string) - Default input value (optional)

**Returns:** Promise<string|null> - User input or null if cancelled

## Examples

### Sequential Notifications

```javascript
await hlvm.notification.notify("Starting process...", "Status");
// Do work...
await hlvm.notification.notify("Process complete!", "Status");
```

### Error Handling with Alerts

```javascript
try {
  await riskyOperation();
} catch (error) {
  await hlvm.notification.alert(
    `Error: ${error.message}`,
    "Operation Failed"
  );
}
```

### User Confirmation Flow

```javascript
const proceed = await hlvm.notification.confirm(
  "This will delete all data. Continue?",
  "Warning"
);

if (proceed) {
  await hlvm.notification.notify("Deleting...", "Status");
  await deleteAllData();
  await hlvm.notification.alert("Data deleted", "Complete");
}
```

### Input Collection

```javascript
const name = await hlvm.notification.prompt("Your name:");
const age = await hlvm.notification.prompt("Your age:");

if (name && age) {
  await hlvm.notification.alert(
    `Hello ${name}, age ${age}`,
    "Welcome"
  );
}
```

### Progress Notifications

```javascript
async function processFiles(files) {
  for (let i = 0; i < files.length; i++) {
    await hlvm.notification.notify(
      `Processing ${i + 1}/${files.length}`,
      "Progress"
    );
    await processFile(files[i]);
  }
  await hlvm.notification.alert("All files processed!", "Done");
}
```

## Platform Notes

- **macOS**: Uses native NSAlert and NSUserNotification
- **Windows**: Uses Windows notification system
- **Linux**: Uses system notification daemon

## Best Practices

1. Keep messages concise
2. Use `notify()` for non-blocking status updates
3. Use `alert()` for important messages requiring acknowledgment
4. Use `confirm()` for destructive operations
5. Provide default values for `prompt()` when appropriate