/**
 * Platform detection module for HLVM
 * Provides cross-platform utilities for detecting and handling platform-specific behavior
 */

// Platform type definitions
export type Platform = 'darwin' | 'linux' | 'windows';

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
    const os = Deno.build.os;
    // Normalize windows platform name
    if (os === 'windows') {
        return 'windows';
    }
    if (os === 'darwin' || os === 'linux') {
        return os;
    }
    // Default to linux for unknown platforms
    return 'linux';
}

/**
 * Check if the current platform is macOS
 */
export function isDarwin(): boolean {
    return Deno.build.os === 'darwin';
}

/**
 * Check if the current platform is Linux
 */
export function isLinux(): boolean {
    return Deno.build.os === 'linux';
}

/**
 * Check if the current platform is Windows
 */
export function isWindows(): boolean {
    return Deno.build.os === 'windows';
}

/**
 * Get the platform-specific path separator
 */
export function getPathSeparator(): string {
    return isWindows() ? '\\' : '/';
}

/**
 * Normalize a path for the current platform
 */
export function normalizePath(path: string): string {
    if (isWindows()) {
        return path.replace(/\//g, '\\');
    }
    return path.replace(/\\/g, '/');
}

/**
 * Convert a path to POSIX format (forward slashes)
 */
export function toPosixPath(path: string): string {
    return path.replace(/\\/g, '/');
}

/**
 * Convert a path to Windows format (backslashes)
 */
export function toWindowsPath(path: string): string {
    return path.replace(/\//g, '\\');
}

/**
 * Check if a path is absolute
 */
export function isAbsolutePath(path: string): boolean {
    if (isWindows()) {
        // Windows: check for drive letter (C:\) or UNC path (\\server\)
        return /^[a-zA-Z]:[\\\/]/.test(path) || /^\\\\/.test(path);
    }
    // Unix-like: starts with /
    return path.startsWith('/');
}

/**
 * Get the home directory environment variable name for the platform
 */
export function getHomeEnvVar(): string {
    return isWindows() ? 'USERPROFILE' : 'HOME';
}

/**
 * Get the temp directory environment variable name for the platform
 */
export function getTempEnvVar(): string {
    return isWindows() ? 'TEMP' : 'TMPDIR';
}

/**
 * Get the executable file extension for the platform
 */
export function getExecutableExtension(): string {
    return isWindows() ? '.exe' : '';
}

/**
 * Get the script file extension for the platform
 */
export function getScriptExtension(): string {
    return isWindows() ? '.bat' : '.sh';
}

/**
 * Get the line ending for the platform
 */
export function getLineEnding(): string {
    return isWindows() ? '\r\n' : '\n';
}

/**
 * Get the platform name as a string
 */
export function getPlatformName(): string {
    switch (Deno.build.os) {
        case 'darwin':
            return 'macOS';
        case 'linux':
            return 'Linux';
        case 'windows':
            return 'Windows';
        default:
            return 'Unknown';
    }
}

// Export commonly used constants
export const PLATFORM = getPlatform();
export const IS_DARWIN = isDarwin();
export const IS_LINUX = isLinux();
export const IS_WINDOWS = isWindows();
export const PATH_SEPARATOR = getPathSeparator();
export const HOME_ENV_VAR = getHomeEnvVar();
export const EXECUTABLE_EXT = getExecutableExtension();
export const SCRIPT_EXT = getScriptExtension();
export const LINE_ENDING = getLineEnding();

// Default export with all utilities
export default {
    getPlatform,
    isDarwin,
    isLinux,
    isWindows,
    getPathSeparator,
    normalizePath,
    toPosixPath,
    toWindowsPath,
    isAbsolutePath,
    getHomeEnvVar,
    getTempEnvVar,
    getExecutableExtension,
    getScriptExtension,
    getLineEnding,
    getPlatformName,
    // Constants
    PLATFORM,
    IS_DARWIN,
    IS_LINUX,
    IS_WINDOWS,
    PATH_SEPARATOR,
    HOME_ENV_VAR,
    EXECUTABLE_EXT,
    SCRIPT_EXT,
    LINE_ENDING
};