// src/stdlib/core/terminal.js
// HLVM Core Terminal - Shared terminal UI constants and utilities

// ─────────────────────────────────────────────────────────────────────────────
// ANSI Color codes
export const COLORS = {
  // Basic colors
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  PURPLE: '\x1b[35m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  GRAY: '\x1b[90m',
  
  // Bright colors
  BRIGHT_BLACK: '\x1b[90m',
  BRIGHT_RED: '\x1b[91m',
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_YELLOW: '\x1b[93m',
  BRIGHT_BLUE: '\x1b[94m',
  BRIGHT_PURPLE: '\x1b[95m',
  BRIGHT_MAGENTA: '\x1b[95m',
  BRIGHT_CYAN: '\x1b[96m',
  BRIGHT_WHITE: '\x1b[97m',
  
  // Styles
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  ITALIC: '\x1b[3m',
  UNDERLINE: '\x1b[4m',
  BLINK: '\x1b[5m',
  REVERSE: '\x1b[7m',
  HIDDEN: '\x1b[8m',
  STRIKETHROUGH: '\x1b[9m',
  
  // Reset
  RESET: '\x1b[0m'
};

// ─────────────────────────────────────────────────────────────────────────────
// Terminal control sequences
export const TERMINAL = {
  // Cursor control
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h',
  CURSOR_START: '\x1b[0G',
  CURSOR_UP: '\x1b[A',
  CURSOR_DOWN: '\x1b[B',
  CURSOR_RIGHT: '\x1b[C',
  CURSOR_LEFT: '\x1b[D',
  SAVE_CURSOR: '\x1b[s',
  RESTORE_CURSOR: '\x1b[u',
  
  // Line control
  CLEAR_LINE: '\x1b[2K',
  CLEAR_SCREEN: '\x1b[2J',
  CLEAR_TO_END: '\x1b[0J',
  CLEAR_TO_START: '\x1b[1J',
  
  // Scrolling
  SCROLL_UP: '\x1b[S',
  SCROLL_DOWN: '\x1b[T'
};

// ─────────────────────────────────────────────────────────────────────────────
// Spinner characters for different platforms
export const SPINNERS = {
  default: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  dots: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  line: ['—', '\\', '|', '/'],
  arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  bounce: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
  box: ['◰', '◳', '◲', '◱'],
  circle: ['◐', '◓', '◑', '◒']
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress bar characters
export const PROGRESS = {
  // Box drawing characters
  BAR_EMPTY: '░',
  BAR_QUARTER: '▒',
  BAR_HALF: '▓',
  BAR_FULL: '█',
  
  // Block characters
  BLOCK_EMPTY: '□',
  BLOCK_FULL: '■',
  
  // Line characters
  LINE_HORIZONTAL: '─',
  LINE_VERTICAL: '│',
  CORNER_TOP_LEFT: '┌',
  CORNER_TOP_RIGHT: '┐',
  CORNER_BOTTOM_LEFT: '└',
  CORNER_BOTTOM_RIGHT: '┘'
};

// ─────────────────────────────────────────────────────────────────────────────
// Common UI symbols
export const SYMBOLS = {
  // Status indicators
  SUCCESS: '✓',
  ERROR: '✗',
  WARNING: '⚠',
  INFO: 'ℹ',
  
  // Arrows
  ARROW_RIGHT: '→',
  ARROW_LEFT: '←',
  ARROW_UP: '↑',
  ARROW_DOWN: '↓',
  
  // Misc
  BULLET: '•',
  ELLIPSIS: '…',
  CHECK: '✔',
  CROSS: '✖',
  STAR: '★'
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions

/**
 * Start a computing spinner animation
 * @param {string} [message='Computing'] - Message to display
 * @param {number} [interval=80] - Animation interval in ms
 * @returns {{update: Function, stop: Function}} Object with update and stop methods
 * @example
 * const spinner = startComputing('Processing');
 * await someAsyncOperation();
 * spinner.update('Almost done');
 * await moreWork();
 * spinner.stop();
 */
export function startComputing(message = 'Computing', interval = 80) {
  const spinner = SPINNERS.default;
  let i = 0;
  let first = true;
  let currentMessage = message;
  
  try { process.stdout.write(TERMINAL.HIDE_CURSOR); } catch {}
  
  const render = () => {
    const prefix = first ? '\n' : (TERMINAL.CLEAR_LINE + TERMINAL.CURSOR_START);
    first = false;
    try {
      process.stdout.write(
        `${prefix}  ${COLORS.PURPLE}${spinner[i % spinner.length]}${COLORS.RESET}  ${currentMessage}...`
      );
    } catch {}
    i++;
  };
  
  render();
  const timer = setInterval(render, interval);
  
  return {
    update: (m) => { currentMessage = m; },
    stop: () => {
      clearInterval(timer);
      try {
        process.stdout.write(TERMINAL.CLEAR_LINE + TERMINAL.CURSOR_START);
        process.stdout.write(TERMINAL.SHOW_CURSOR + '\n');
      } catch {}
    }
  };
}

/**
 * Create a progress bar
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @param {number} [width=30] - Bar width
 * @returns {string} Formatted progress bar
 * @example
 * console.log(createProgressBar(50, 100));
 * // → [███████████████               ] 50%
 */
export function createProgressBar(current, total, width = 30) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  const bar = PROGRESS.BAR_FULL.repeat(filled) + ' '.repeat(empty);
  return `[${bar}] ${percentage}%`;
}

/**
 * Format text with color
 * @param {string} text - Text to format
 * @param {string} color - Color from COLORS object
 * @returns {string} Formatted text
 * @example
 * console.log(colorize('Success!', COLORS.GREEN));
 */
export function colorize(text, color) {
  return `${color}${text}${COLORS.RESET}`;
}

/**
 * Clear the terminal screen
 */
export function clearScreen() {
  process.stdout.write(TERMINAL.CLEAR_SCREEN);
  process.stdout.write('\x1b[H'); // Move cursor to top-left
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialize documentation
function initializeDocs() {
  const docs = {
    COLORS: 'Terminal color codes for text formatting',
    TERMINAL: 'Terminal control sequences for cursor and screen manipulation',
    SPINNERS: 'Spinner animation character sets',
    PROGRESS: 'Progress bar and box drawing characters',
    SYMBOLS: 'Common UI symbols and indicators',
    startComputing: startComputing.__doc__ || 'Start a computing spinner animation',
    createProgressBar: createProgressBar.__doc__ || 'Create a progress bar',
    colorize: colorize.__doc__ || 'Format text with color',
    clearScreen: clearScreen.__doc__ || 'Clear the terminal screen'
  };
  
  Object.entries(docs).forEach(([key, doc]) => {
    if (exports[key]) {
      exports[key].__doc__ = doc;
    }
  });
}

initializeDocs();