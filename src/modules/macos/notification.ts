/**
 * Cross-platform notification module for HLVM
 * Provides unified API for alerts, notifications, and dialogs
 */

import { getPlatform, Platform } from './platform.ts';

/**
 * Escape string for shell command
 */
function escapeShellArg(arg: string): string {
    // Replace backslashes first, then quotes
    return arg.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Show a system alert dialog
 * @param message The message to display
 * @param title Optional title for the alert
 * @returns Promise that resolves when the alert is dismissed
 */
export async function alert(message: string, title?: string): Promise<void> {
    const platform = getPlatform();
    
    switch (platform) {
        case 'darwin':
            await showMacAlert(message, title);
            break;
        case 'linux':
            await showLinuxAlert(message, title);
            break;
        case 'windows':
            await showWindowsAlert(message, title);
            break;
    }
}

/**
 * Show a system notification
 * @param message The notification message
 * @param title Optional title
 * @param subtitle Optional subtitle (macOS only)
 * @returns Promise that resolves when the notification is sent
 */
export async function notify(message: string, title?: string, subtitle?: string): Promise<void> {
    const platform = getPlatform();
    
    switch (platform) {
        case 'darwin':
            await showMacNotification(message, title, subtitle);
            break;
        case 'linux':
            await showLinuxNotification(message, title);
            break;
        case 'windows':
            await showWindowsNotification(message, title);
            break;
    }
}

/**
 * Show a confirmation dialog
 * @param message The message to display
 * @param title Optional title
 * @returns Promise that resolves to true if user clicked OK/Yes, false otherwise
 */
export async function confirm(message: string, title?: string): Promise<boolean> {
    const platform = getPlatform();
    
    switch (platform) {
        case 'darwin':
            return await showMacConfirm(message, title);
        case 'linux':
            return await showLinuxConfirm(message, title);
        case 'windows':
            return await showWindowsConfirm(message, title);
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

/**
 * Show an input dialog
 * @param message The prompt message
 * @param defaultValue Optional default value
 * @param title Optional title
 * @returns Promise that resolves to the user input, or null if cancelled
 */
export async function prompt(message: string, defaultValue?: string, title?: string): Promise<string | null> {
    const platform = getPlatform();
    
    switch (platform) {
        case 'darwin':
            return await showMacPrompt(message, defaultValue, title);
        case 'linux':
            return await showLinuxPrompt(message, defaultValue, title);
        case 'windows':
            return await showWindowsPrompt(message, defaultValue, title);
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

// macOS implementations
async function showMacAlert(message: string, title?: string): Promise<void> {
    const escapedMessage = escapeShellArg(message);
    const escapedTitle = title ? escapeShellArg(title) : 'Alert';
    
    const script = `display alert "${escapedTitle}" message "${escapedMessage}"`;
    
    const cmd = new Deno.Command('osascript', {
        args: ['-e', script]
    });
    
    await cmd.output();
}

async function showMacNotification(message: string, title?: string, subtitle?: string): Promise<void> {
    const escapedMessage = escapeShellArg(message);
    let script = `display notification "${escapedMessage}"`;
    
    if (title) {
        script += ` with title "${escapeShellArg(title)}"`;
    }
    
    if (subtitle) {
        script += ` subtitle "${escapeShellArg(subtitle)}"`;
    }
    
    const cmd = new Deno.Command('osascript', {
        args: ['-e', script]
    });
    
    await cmd.output();
}

async function showMacConfirm(message: string, title?: string): Promise<boolean> {
    const escapedMessage = escapeShellArg(message);
    const escapedTitle = title ? escapeShellArg(title) : 'Confirm';
    
    const script = `
        set theButton to button returned of (display dialog "${escapedMessage}" with title "${escapedTitle}" buttons {"Cancel", "OK"} default button "OK")
        if theButton is "OK" then
            return "true"
        else
            return "false"
        end if
    `;
    
    const cmd = new Deno.Command('osascript', {
        args: ['-e', script.trim()]
    });
    
    const output = await cmd.output();
    const result = new TextDecoder().decode(output.stdout).trim();
    return result === 'true';
}

async function showMacPrompt(message: string, defaultValue?: string, title?: string): Promise<string | null> {
    const escapedMessage = escapeShellArg(message);
    const escapedTitle = title ? escapeShellArg(title) : 'Input';
    const escapedDefault = defaultValue ? escapeShellArg(defaultValue) : '';
    
    const script = `
        try
            set theResponse to text returned of (display dialog "${escapedMessage}" with title "${escapedTitle}" default answer "${escapedDefault}" buttons {"Cancel", "OK"} default button "OK")
            return theResponse
        on error
            return ""
        end try
    `;
    
    const cmd = new Deno.Command('osascript', {
        args: ['-e', script.trim()]
    });
    
    const output = await cmd.output();
    const result = new TextDecoder().decode(output.stdout).trim();
    
    // If empty string and no error, user cancelled
    if (result === '' && output.code !== 0) {
        return null;
    }
    
    return result;
}

// Linux implementations
async function showLinuxAlert(message: string, title?: string): Promise<void> {
    // Try zenity first, fall back to notify-send
    try {
        const cmd = new Deno.Command('zenity', {
            args: ['--info', '--text', message, '--title', title || 'Alert']
        });
        await cmd.output();
    } catch {
        // Fall back to notify-send if zenity is not available
        await showLinuxNotification(message, title);
    }
}

async function showLinuxNotification(message: string, title?: string): Promise<void> {
    const args = ['notify-send'];
    
    if (title) {
        args.push(title);
        args.push(message);
    } else {
        args.push(message);
    }
    
    const cmd = new Deno.Command('notify-send', {
        args: args
    });
    
    await cmd.output();
}

async function showLinuxConfirm(message: string, title?: string): Promise<boolean> {
    const cmd = new Deno.Command('zenity', {
        args: ['--question', '--text', message, '--title', title || 'Confirm']
    });
    
    const output = await cmd.output();
    return output.code === 0;
}

async function showLinuxPrompt(message: string, defaultValue?: string, title?: string): Promise<string | null> {
    const args = ['zenity', '--entry', '--text', message];
    
    if (title) {
        args.push('--title', title);
    }
    
    if (defaultValue) {
        args.push('--entry-text', defaultValue);
    }
    
    const cmd = new Deno.Command('zenity', {
        args: args
    });
    
    const output = await cmd.output();
    
    if (output.code !== 0) {
        return null;
    }
    
    return new TextDecoder().decode(output.stdout).trim();
}

// Windows implementations
async function showWindowsAlert(message: string, title?: string): Promise<void> {
    const escapedMessage = escapeShellArg(message);
    const escapedTitle = title ? escapeShellArg(title) : 'Alert';
    
    const script = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show("${escapedMessage}", "${escapedTitle}")
    `;
    
    const cmd = new Deno.Command('powershell', {
        args: ['-Command', script]
    });
    
    await cmd.output();
}

async function showWindowsNotification(message: string, title?: string): Promise<void> {
    const escapedMessage = escapeShellArg(message);
    const escapedTitle = title ? escapeShellArg(title) : 'Notification';
    
    // Windows 10+ toast notification
    const script = `
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.UI.Notifications.NotificationData, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
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
    
    try {
        const cmd = new Deno.Command('powershell', {
            args: ['-Command', script]
        });
        await cmd.output();
    } catch {
        // Fall back to simple message box if toast fails
        await showWindowsAlert(message, title);
    }
}

async function showWindowsConfirm(message: string, title?: string): Promise<boolean> {
    const escapedMessage = escapeShellArg(message);
    const escapedTitle = title ? escapeShellArg(title) : 'Confirm';
    
    const script = `
        Add-Type -AssemblyName System.Windows.Forms
        $result = [System.Windows.Forms.MessageBox]::Show("${escapedMessage}", "${escapedTitle}", [System.Windows.Forms.MessageBoxButtons]::YesNo)
        if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
            Write-Host "true"
        } else {
            Write-Host "false"
        }
    `;
    
    const cmd = new Deno.Command('powershell', {
        args: ['-Command', script]
    });
    
    const output = await cmd.output();
    const result = new TextDecoder().decode(output.stdout).trim();
    return result === 'true';
}

async function showWindowsPrompt(message: string, defaultValue?: string, title?: string): Promise<string | null> {
    const escapedMessage = escapeShellArg(message);
    const escapedTitle = title ? escapeShellArg(title) : 'Input';
    const escapedDefault = defaultValue ? escapeShellArg(defaultValue) : '';
    
    const script = `
        Add-Type -AssemblyName Microsoft.VisualBasic
        $result = [Microsoft.VisualBasic.Interaction]::InputBox("${escapedMessage}", "${escapedTitle}", "${escapedDefault}")
        if ($result -eq "") {
            # Check if user clicked Cancel (empty string could be valid input)
            if ([System.Windows.Forms.DialogResult]::Cancel) {
                Write-Host "<<<CANCELLED>>>"
            } else {
                Write-Host ""
            }
        } else {
            Write-Host $result
        }
    `;
    
    const cmd = new Deno.Command('powershell', {
        args: ['-Command', script]
    });
    
    const output = await cmd.output();
    const result = new TextDecoder().decode(output.stdout).trim();
    
    if (result === '<<<CANCELLED>>>') {
        return null;
    }
    
    return result;
}

// Export platform-specific functions for advanced use cases
export const platformSpecific = {
    darwin: {
        showAlert: showMacAlert,
        showNotification: showMacNotification,
        showConfirm: showMacConfirm,
        showPrompt: showMacPrompt
    },
    linux: {
        showAlert: showLinuxAlert,
        showNotification: showLinuxNotification,
        showConfirm: showLinuxConfirm,
        showPrompt: showLinuxPrompt
    },
    windows: {
        showAlert: showWindowsAlert,
        showNotification: showWindowsNotification,
        showConfirm: showWindowsConfirm,
        showPrompt: showWindowsPrompt
    }
};

// Default export with all main functions
export default {
    alert,
    notify,
    confirm,
    prompt
};