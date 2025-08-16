/**
 * TextEdit app control
 */

// Helper to send commands to Swift
function sendCommand(command: string, data: string = ''): void {
  const message = data ? `${command}:${data}` : command;
  Deno.stdout.writeSync(new TextEncoder().encode(message + '\n'));
}

export default function textEdit(content: string) {
  const data = JSON.stringify({ 
    content: content, 
    title: '' 
  });
  sendCommand('__HLVM_TEXT_EDITOR__', data);
  return `Opening text editor`;
}