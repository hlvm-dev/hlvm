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
 * Start a spinner animation
 * @param {string} [message='Computing'] - Message to display
 * @param {number} [interval=80] - Animation interval in ms
 * @returns {{update: Function, stop: Function}} Object with update and stop methods
 * @example
 * const spinner = spinner('Processing');
 * await someAsyncOperation();
 * spinner.update('Almost done');
 * await moreWork();
 * spinner.stop();
 */
export function spinner(message = 'Computing', interval = 80) {
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


// ─────────────────────────────────────────────────────────────────────────────
// Initialize documentation
function initDocs() {
  const docs = {
    COLORS: 'Terminal color codes for text formatting',
    TERMINAL: 'Terminal control sequences for cursor and screen manipulation',
    SPINNERS: 'Spinner animation character sets',
    PROGRESS: 'Progress bar and box drawing characters',
    SYMBOLS: 'Common UI symbols and indicators',
    spinner: 'Start a spinner animation'
  };
  
  // Set documentation on exported objects
  COLORS.__doc__ = docs.COLORS;
  TERMINAL.__doc__ = docs.TERMINAL;
  SPINNERS.__doc__ = docs.SPINNERS;
  PROGRESS.__doc__ = docs.PROGRESS;
  SYMBOLS.__doc__ = docs.SYMBOLS;
  spinner.__doc__ = docs.spinner;
}

initDocs();