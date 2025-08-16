/**
 * Enhanced screen module with integrated screenshot functionality
 */

import { exec } from './system.ts';
import { getPlatform } from './platform.ts';
import { notify } from './notification.ts';

export interface CaptureOptions {
    format?: 'png' | 'jpg' | 'jpeg';
    quality?: number;
    region?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    display?: number;
    interactive?: boolean;
}

export interface ScreenSize {
    width: number;
    height: number;
}

export interface Display {
    id: number;
    width: number;
    height: number;
    x: number;
    y: number;
    isPrimary: boolean;
}

class ScreenEnhanced {
    private platform = getPlatform();
    private screencapturePath = '/usr/sbin/screencapture';
    private soundPath = '/System/Library/Audio/UISounds/photoShutter.caf';

    /**
     * Get default screenshot path
     */
    private getDefaultPath(format: string = 'png'): string {
        const home = Deno.env.get('HOME') || '~';
        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/[/:]/g, '-').replace(', ', ' at ');
        
        return `${home}/Desktop/Screenshot ${timestamp}.${format}`;
    }

    /**
     * Play shutter sound
     */
    private async playSound(): Promise<void> {
        try {
            await exec(`afplay "${this.soundPath}"`);
        } catch {
            // Ignore sound errors
        }
    }

    /**
     * Get screen size
     */
    async getSize(): Promise<ScreenSize> {
        if (this.platform === 'darwin') {
            try {
                const result = await exec('/usr/sbin/system_profiler SPDisplaysDataType');
                const match = result.stdout.match(/Resolution:\s*(\d+)\s*x\s*(\d+)/);
                if (match) {
                    return {
                        width: parseInt(match[1]),
                        height: parseInt(match[2])
                    };
                }
            } catch {}
            
            // Fallback
            return { width: 1920, height: 1080 };
        }
        
        throw new Error('Not implemented for this platform');
    }

    /**
     * Get all displays
     */
    async getDisplays(): Promise<Display[]> {
        if (this.platform === 'darwin') {
            try {
                const result = await exec('/usr/sbin/system_profiler SPDisplaysDataType -json');
                const data = JSON.parse(result.stdout);
                const displays: Display[] = [];
                
                // Parse the complex structure
                let displayId = 0;
                if (data.SPDisplaysDataType && data.SPDisplaysDataType[0]) {
                    const controller = data.SPDisplaysDataType[0];
                    if (controller.spdisplays_ndrvs) {
                        for (const display of controller.spdisplays_ndrvs) {
                            const resolution = display._spdisplays_resolution || '';
                            const match = resolution.match(/(\d+)\s*x\s*(\d+)/);
                            if (match) {
                                displays.push({
                                    id: displayId++,
                                    width: parseInt(match[1]),
                                    height: parseInt(match[2]),
                                    x: 0,
                                    y: 0,
                                    isPrimary: displayId === 1
                                });
                            }
                        }
                    }
                }
                
                if (displays.length > 0) {
                    return displays;
                }
            } catch {}
            
            // Fallback to at least one display
            const size = await this.getSize();
            return [{
                id: 0,
                width: size.width,
                height: size.height,
                x: 0,
                y: 0,
                isPrimary: true
            }];
        }
        
        throw new Error('Not implemented for this platform');
    }

    /**
     * Capture screenshot with various options
     */
    async capture(pathOrOptions?: string | CaptureOptions): Promise<Uint8Array | string | void> {
        if (this.platform !== 'darwin') {
            throw new Error('Screenshot not implemented for this platform');
        }

        // Parse parameters
        let outputPath: string | undefined;
        let options: CaptureOptions = {};
        
        if (typeof pathOrOptions === 'string') {
            outputPath = pathOrOptions.replace(/^~/, Deno.env.get('HOME') || '');
        } else if (pathOrOptions) {
            options = pathOrOptions;
        }

        // If no path specified and not returning data, use default path
        if (!outputPath && !options.interactive && options.display === undefined && !options.region) {
            // This is a basic capture, return data
            const tmpFile = await Deno.makeTempFile({ suffix: '.png' });
            try {
                await exec(`${this.screencapturePath} "${tmpFile}"`);
                const data = await Deno.readFile(tmpFile);
                await Deno.remove(tmpFile);
                return data;
            } catch (e) {
                await Deno.remove(tmpFile).catch(() => {});
                throw e;
            }
        }

        // For file-based captures
        if (!outputPath) {
            outputPath = this.getDefaultPath(options.format || 'png');
        }

        // Build command
        const args = [this.screencapturePath];
        
        if (options.interactive) {
            args.push('-i');
        }
        
        if (options.region) {
            const r = options.region;
            args.push('-R', `${r.x},${r.y},${r.width},${r.height}`);
        }
        
        if (options.display !== undefined) {
            args.push('-D', options.display.toString());
        }
        
        if (options.format === 'jpg' || options.format === 'jpeg') {
            args.push('-t', 'jpg');
        }
        
        args.push(`"${outputPath}"`);
        
        // Execute
        const result = await exec(args.join(' '));
        
        if (result.code === 1 && options.interactive) {
            throw new Error('Screenshot cancelled by user');
        }
        
        if (result.code !== 0) {
            throw new Error(result.stderr || 'Screenshot failed');
        }
        
        // Play sound and notify
        await this.playSound();
        await notify('Screenshot saved', outputPath.split('/').pop() || 'Screenshot');
        
        return outputPath;
    }

    /**
     * Fullscreen capture
     */
    async fullscreen(path?: string): Promise<string> {
        const outputPath = path || this.getDefaultPath();
        await this.capture(outputPath);
        return outputPath;
    }

    /**
     * Interactive selection
     */
    async selection(path?: string): Promise<string> {
        const outputPath = path || this.getDefaultPath();
        await this.capture(outputPath);
        return outputPath;
    }

    /**
     * Window capture
     */
    async window(path?: string): Promise<string> {
        const outputPath = path || this.getDefaultPath();
        const args = [this.screencapturePath, '-w', `"${outputPath}"`];
        
        const result = await exec(args.join(' '));
        
        if (result.code === 1) {
            throw new Error('Window capture cancelled');
        }
        
        if (result.code !== 0) {
            throw new Error('Window capture failed');
        }
        
        await this.playSound();
        await notify('Screenshot saved', outputPath.split('/').pop() || 'Screenshot');
        
        return outputPath;
    }

    /**
     * Capture to clipboard
     */
    async toClipboard(mode: 'fullscreen' | 'selection' = 'fullscreen'): Promise<void> {
        const args = [this.screencapturePath, '-c'];
        
        if (mode === 'selection') {
            args.push('-i');
        }
        
        const result = await exec(args.join(' '));
        
        if (result.code === 1) {
            return; // User cancelled
        }
        
        if (result.code !== 0) {
            throw new Error('Screenshot to clipboard failed');
        }
        
        await this.playSound();
        await notify('Screenshot copied to clipboard', 'Press Cmd+V to paste');
    }

    // Shortcuts
    cmd3 = () => this.fullscreen();
    cmd4 = () => this.selection();
    cmdCtrl3 = () => this.toClipboard('fullscreen');
    cmdCtrl4 = () => this.toClipboard('selection');
}

// Export singleton
export default new ScreenEnhanced();