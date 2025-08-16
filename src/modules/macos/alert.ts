// Alert module
export function showAlert(message: string): string {
    const cmd = new Deno.Command("osascript", {
        args: ["-e", `display alert "${message}"`]
    });
    cmd.output();
    return "Alert shown from module: " + message;
}