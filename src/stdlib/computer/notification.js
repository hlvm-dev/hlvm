// Notification module - Cross-platform UI dialogs and notifications

import * as platform from "../core/platform.js";

// Escape string for shell command (cross-platform)
function escapeShell(str) {
  if (platform.isWindows) {
    // PowerShell escaping
    return str.replace(/"/g, '`"').replace(/\$/g, '`$');
  } else {
    // Unix shell escaping
    return str.replace(/'/g, "'\\''");
  }
}

export async function alert(message, title = "Alert") {
  const escapedMessage = escapeShell(message);
  const escapedTitle = escapeShell(title);
  
  if (platform.isDarwin) {
    // macOS: osascript (built-in)
    const script = `display alert "${escapedTitle}" message "${escapedMessage}"`;
    await new Deno.Command("osascript", { args: ["-e", script] }).output();
    
  } else if (platform.isWindows) {
    // Windows: PowerShell MessageBox (built-in)
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.MessageBox]::Show("${escapedMessage}", "${escapedTitle}")
    `;
    await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    
  } else {
    // Linux: Try multiple tools
    try {
      // Try zenity first (most common)
      await new Deno.Command("zenity", {
        args: ["--info", "--text", message, "--title", title]
      }).output();
    } catch {
      try {
        // Fallback to kdialog (KDE)
        await new Deno.Command("kdialog", {
          args: ["--msgbox", message, "--title", title]
        }).output();
      } catch {
        // Last resort: notify-send (notification, not dialog)
        await notify(message, title);
      }
    }
  }
}

export async function notify(message, title = "Notification", subtitle = "") {
  const escapedMessage = escapeShell(message);
  const escapedTitle = escapeShell(title);
  
  if (platform.isDarwin) {
    // macOS: osascript notification (built-in)
    let script = `display notification "${escapedMessage}" with title "${escapedTitle}"`;
    if (subtitle) {
      script += ` subtitle "${escapeShell(subtitle)}"`;
    }
    await new Deno.Command("osascript", { args: ["-e", script] }).output();
    
  } else if (platform.isWindows) {
    // Windows: PowerShell BurntToast or fallback to balloon tip
    try {
      // Try Windows 10+ toast notification
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
      await new Deno.Command("powershell", {
        args: ["-NoProfile", "-Command", script]
      }).output();
    } catch {
      // Fallback to simple alert
      await alert(message, title);
    }
    
  } else {
    // Linux: notify-send (most universal)
    try {
      await new Deno.Command("notify-send", {
        args: [title, message]
      }).output();
    } catch {
      console.error("Notification failed. Install libnotify-bin (notify-send)");
    }
  }
}

export async function confirm(message, title = "Confirm") {
  const escapedMessage = escapeShell(message);
  const escapedTitle = escapeShell(title);
  
  if (platform.isDarwin) {
    // macOS: osascript dialog (built-in)
    const script = `
      button returned of (display dialog "${escapedMessage}" ¬
        with title "${escapedTitle}" ¬
        buttons {"Cancel", "OK"} ¬
        default button "OK")
    `;
    try {
      const { stdout } = await new Deno.Command("osascript", { 
        args: ["-e", script] 
      }).output();
      return new TextDecoder().decode(stdout).trim() === "OK";
    } catch {
      return false; // User cancelled
    }
    
  } else if (platform.isWindows) {
    // Windows: PowerShell YesNo MessageBox (built-in)
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
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
    `;
    const { stdout } = await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    return new TextDecoder().decode(stdout).trim() === "true";
    
  } else {
    // Linux: Try zenity or kdialog
    try {
      const { code } = await new Deno.Command("zenity", {
        args: ["--question", "--text", message, "--title", title]
      }).output();
      return code === 0;
    } catch {
      try {
        const { code } = await new Deno.Command("kdialog", {
          args: ["--yesno", message, "--title", title]
        }).output();
        return code === 0;
      } catch {
        console.error("Confirm dialog failed. Install zenity or kdialog");
        return false;
      }
    }
  }
}

export async function prompt(message, defaultValue = "", title = "Input") {
  const escapedMessage = escapeShell(message);
  const escapedTitle = escapeShell(title);
  const escapedDefault = escapeShell(defaultValue);
  
  if (platform.isDarwin) {
    // macOS: osascript input dialog (built-in)
    const script = `
      text returned of (display dialog "${escapedMessage}" ¬
        with title "${escapedTitle}" ¬
        default answer "${escapedDefault}" ¬
        buttons {"Cancel", "OK"} ¬
        default button "OK")
    `;
    try {
      const { stdout } = await new Deno.Command("osascript", { 
        args: ["-e", script] 
      }).output();
      return new TextDecoder().decode(stdout).trim();
    } catch {
      return null; // User cancelled
    }
    
  } else if (platform.isWindows) {
    // Windows: PowerShell InputBox (built-in)
    const script = `
      Add-Type -AssemblyName Microsoft.VisualBasic
      $result = [Microsoft.VisualBasic.Interaction]::InputBox(
        "${escapedMessage}", 
        "${escapedTitle}", 
        "${escapedDefault}"
      )
      if ($result -eq "") {
        # Could be cancelled or empty input
        if ($LastExitCode -eq 0) {
          Write-Host ""
        }
      } else {
        Write-Host $result
      }
    `;
    const { stdout } = await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script]
    }).output();
    const result = new TextDecoder().decode(stdout).trim();
    return result;
    
  } else {
    // Linux: Try zenity or kdialog
    try {
      const args = ["zenity", "--entry", "--text", message, "--title", title];
      if (defaultValue) args.push("--entry-text", defaultValue);
      const { stdout, code } = await new Deno.Command(args[0], {
        args: args.slice(1)
      }).output();
      return code === 0 ? new TextDecoder().decode(stdout).trim() : null;
    } catch {
      try {
        const { stdout, code } = await new Deno.Command("kdialog", {
          args: ["--inputbox", message, defaultValue, "--title", title]
        }).output();
        return code === 0 ? new TextDecoder().decode(stdout).trim() : null;
      } catch {
        console.error("Prompt dialog failed. Install zenity or kdialog");
        return null;
      }
    }
  }
}