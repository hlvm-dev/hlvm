// Notification module - Cross-platform UI dialogs and notifications

import * as platform from "../core/platform.js";
import { escapeShell, decode, powershell, PS, ERRORS } from "../core/platform.js";

// DRY: Generic Linux dialog handler
async function linuxDialog(type, message, title, defaultValue = "") {
  const tools = [
    {
      cmd: "zenity",
      args: {
        alert: ["--info", "--text", message, "--title", title],
        confirm: ["--question", "--text", message, "--title", title],
        prompt: ["--entry", "--text", message, "--title", title, ...(defaultValue ? ["--entry-text", defaultValue] : [])]
      }
    },
    {
      cmd: "kdialog",
      args: {
        alert: ["--msgbox", message, "--title", title],
        confirm: ["--yesno", message, "--title", title],
        prompt: ["--inputbox", message, defaultValue, "--title", title]
      }
    }
  ];
  
  for (const tool of tools) {
    try {
      const result = await new Deno.Command(tool.cmd, {
        args: tool.args[type]
      }).output();
      
      if (type === "alert") return;
      if (type === "confirm") return result.code === 0;
      if (type === "prompt") return result.code === 0 ? decode(result.stdout).trim() : null;
    } catch {
      // Try next tool
    }
  }
  
  // Fallback
  if (type === "alert") {
    await notify(message, title);
  } else {
    console.error(ERRORS.LINUX_DIALOG);
    return type === "confirm" ? false : null;
  }
}

// DRY: Generic osascript handler
async function osascriptDialog(type, message, title, defaultValue = "") {
  const escapedMessage = escapeShell(message);
  const escapedTitle = escapeShell(title);
  const escapedDefault = escapeShell(defaultValue);
  
  const scripts = {
    alert: `display alert "${escapedTitle}" message "${escapedMessage}"`,
    confirm: `
      button returned of (display dialog "${escapedMessage}" ¬
        with title "${escapedTitle}" ¬
        buttons {"Cancel", "OK"} ¬
        default button "OK")
    `,
    prompt: `
      text returned of (display dialog "${escapedMessage}" ¬
        with title "${escapedTitle}" ¬
        default answer "${escapedDefault}" ¬
        buttons {"Cancel", "OK"} ¬
        default button "OK")
    `
  };
  
  try {
    const result = await new Deno.Command("osascript", { 
      args: ["-e", scripts[type]] 
    }).output();
    
    if (type === "alert") return;
    if (type === "confirm") return decode(result.stdout).trim() === "OK";
    if (type === "prompt") return decode(result.stdout).trim();
  } catch {
    return type === "confirm" ? false : null;
  }
}

// DRY: Generic PowerShell dialog handler
async function windowsDialog(type, message, title, defaultValue = "") {
  const escapedMessage = escapeShell(message);
  const escapedTitle = escapeShell(title);
  const escapedDefault = escapeShell(defaultValue);
  
  const scripts = {
    alert: `
      ${PS.forms}
      [System.Windows.Forms.MessageBox]::Show("${escapedMessage}", "${escapedTitle}")
    `,
    confirm: `
      ${PS.forms}
      $result = [System.Windows.Forms.MessageBox]::Show(
        "${escapedMessage}", 
        "${escapedTitle}", 
        [System.Windows.Forms.MessageBoxButtons]::YesNo
      )
      if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        Write-Host "true"
      } else {
        Write-Host "false"
      }
    `,
    prompt: `
      ${PS.visualBasic}
      $result = [Microsoft.VisualBasic.Interaction]::InputBox(
        "${escapedMessage}", 
        "${escapedTitle}", 
        "${escapedDefault}"
      )
      if ($result -eq "") {
        if ($LastExitCode -eq 0) { Write-Host "" }
      } else {
        Write-Host $result
      }
    `
  };
  
  const { stdout } = await powershell(scripts[type]);
  
  if (type === "alert") return;
  if (type === "confirm") return decode(stdout).trim() === "true";
  if (type === "prompt") return decode(stdout).trim();
}

// Public API - Now much cleaner
export async function alert(message, title = "Alert") {
  if (platform.isDarwin) {
    return osascriptDialog("alert", message, title);
  } else if (platform.isWindows) {
    return windowsDialog("alert", message, title);
  } else {
    return linuxDialog("alert", message, title);
  }
}

export async function confirm(message, title = "Confirm") {
  if (platform.isDarwin) {
    return osascriptDialog("confirm", message, title);
  } else if (platform.isWindows) {
    return windowsDialog("confirm", message, title);
  } else {
    return linuxDialog("confirm", message, title);
  }
}

export async function prompt(message, defaultValue = "", title = "Input") {
  if (platform.isDarwin) {
    return osascriptDialog("prompt", message, title, defaultValue);
  } else if (platform.isWindows) {
    return windowsDialog("prompt", message, title, defaultValue);
  } else {
    return linuxDialog("prompt", message, title, defaultValue);
  }
}

export async function notify(message, title = "Notification", subtitle = "") {
  const escapedMessage = escapeShell(message);
  const escapedTitle = escapeShell(title);
  
  if (platform.isDarwin) {
    let script = `display notification "${escapedMessage}" with title "${escapedTitle}"`;
    if (subtitle) {
      script += ` subtitle "${escapeShell(subtitle)}"`;
    }
    await new Deno.Command("osascript", { args: ["-e", script] }).output();
    
  } else if (platform.isWindows) {
    // Windows toast notification
    try {
      const script = `
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
        
        $template = @"
        <toast>
          <visual>
            <binding template="ToastGeneric">
              <text>${escapedTitle}</text>
              <text>${escapedMessage}</text>
            </binding>
          </visual>
        </toast>
"@
        $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
        $xml.LoadXml($template)
        $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("HLVM").Show($toast)
      `;
      await powershell(script);
    } catch {
      await alert(message, title);
    }
    
  } else {
    // Linux notify-send
    try {
      await new Deno.Command("notify-send", {
        args: [title, message]
      }).output();
    } catch {
      console.error(ERRORS.LINUX_NOTIFY);
    }
  }
}