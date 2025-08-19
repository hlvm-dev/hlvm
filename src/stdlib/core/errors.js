/**
 * Centralized error handling utilities (DRY + SOLID)
 */

/**
 * Standard error handler for operations
 */
export class ErrorHandler {
  static handle(error, operation, fallback = null) {
    const isOllamaError = error.message?.includes('fetch failed') || 
                         error.message?.includes('ECONNREFUSED');
    
    if (isOllamaError) {
      if (typeof process !== 'undefined' && process.stdout) {
        console.error('Ollama service is not running. Start it with: hlvm ollama serve');
      }
      return fallback ?? '[Service not available]';
    }
    
    // Log error in development only
    if (globalThis.hlvm?.env?.get('debug')) {
      console.error(`Failed to ${operation}:`, error.message);
    }
    
    return fallback;
  }
  
  static warn(message) {
    if (globalThis.hlvm?.env?.get('debug')) {
      console.warn(message);
    }
  }
}

/**
 * Validate input with standard error messages
 */
export function validateInput(value, validOptions, name) {
  if (!validOptions.includes(value)) {
    throw new Error(`Invalid ${name}: ${value}. Valid: ${validOptions.join(', ')}`);
  }
  return value;
}

/**
 * Get input from parameter or clipboard with validation
 */
export async function getInputWithFallback(input, errorMessage) {
  let value = input;
  if (!value && globalThis.hlvm?.core?.io?.clipboard) {
    value = await globalThis.hlvm.core.io.clipboard.read();
  }
  if (!value || value.trim() === '') {
    throw new Error(errorMessage);
  }
  return value;
}