// HLVM CLI Progress UI - Terminal UI for long-running operations
// Provides spinners, progress bars, and status messages with HLVM purple theme

const HLVM_PURPLE = '\x1b[35m';  // Magenta/Purple color
const HLVM_BRIGHT_PURPLE = '\x1b[95m';  // Bright purple
const RESET = '\x1b[0m';
const CLEAR_LINE = '\x1b[2K';
const CURSOR_START = '\x1b[0G';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const YELLOW = '\x1b[33m';

// Spinner frames for different styles
const SPINNERS = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  dots2: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  line: ['─', '\\', '|', '/'],
  star: ['✶', '✸', '✹', '✺', '✹', '✸'],
  circle: ['◐', '◓', '◑', '◒'],
  arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
  pulse: ['·', '•', '●', '•'],
  bounce: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
};

class CLIProgress {
  constructor() {
    this.activeSpinner = null;
    this.activeProgress = null;
  }

  /**
   * Start a spinner with a message
   * @param {string} message - The message to display
   * @param {string} [style='dots'] - Spinner style
   * @returns {Object} Spinner controller with update() and stop() methods
   */
  startSpinner(message, style = 'dots') {
    // Stop any existing spinner
    if (this.activeSpinner) {
      this.activeSpinner.stop();
    }

    const frames = SPINNERS[style] || SPINNERS.dots;
    let frameIndex = 0;
    let currentMessage = message;
    let interval;
    
    // Hide cursor and start animation
    process.stdout.write(HIDE_CURSOR);
    
    const render = () => {
      const frame = frames[frameIndex];
      const output = `${CLEAR_LINE}${CURSOR_START}${HLVM_PURPLE}${frame}${RESET} ${currentMessage}`;
      process.stdout.write(output);
      frameIndex = (frameIndex + 1) % frames.length;
    };

    // Initial render
    render();
    interval = setInterval(render, 80);

    const spinner = {
      update: (newMessage) => {
        currentMessage = newMessage;
      },
      stop: (finalMessage = null) => {
        clearInterval(interval);
        process.stdout.write(CLEAR_LINE + CURSOR_START);
        if (finalMessage) {
          process.stdout.write(finalMessage + '\n');
        }
        process.stdout.write(SHOW_CURSOR);
        if (this.activeSpinner === spinner) {
          this.activeSpinner = null;
        }
      },
      succeed: (message) => {
        spinner.stop(`✅ ${message}`);
      },
      fail: (message) => {
        spinner.stop(`❌ ${message}`);
      },
      warn: (message) => {
        spinner.stop(`⚠️  ${message}`);
      }
    };

    this.activeSpinner = spinner;
    return spinner;
  }

  /**
   * Display a computing/thinking indicator like Claude's
   * @param {string} [message='Computing'] - The message to display
   * @param {boolean} [showInterrupt=true] - Show interrupt hint
   * @returns {Object} Computing indicator controller
   */
  startComputing(message = 'Computing', showInterrupt = true) {
    const dots = ['', '.', '..', '...'];
    let dotIndex = 0;
    let interval;
    
    process.stdout.write(HIDE_CURSOR);
    
    const render = () => {
      const dot = dots[dotIndex];
      let output = `${CLEAR_LINE}${CURSOR_START}`;
      output += `${YELLOW}✱${RESET} ${HLVM_BRIGHT_PURPLE}${BOLD}${message}${dot}${RESET}`;
      if (showInterrupt) {
        output += ` ${DIM}(esc to interrupt)${RESET}`;
      }
      process.stdout.write(output);
      dotIndex = (dotIndex + 1) % dots.length;
    };

    render();
    interval = setInterval(render, 500);

    const computing = {
      update: (newMessage) => {
        message = newMessage;
      },
      stop: (showDone = false) => {
        clearInterval(interval);
        process.stdout.write(CLEAR_LINE + CURSOR_START);
        if (showDone) {
          process.stdout.write(`${DIM}Done. Press Enter to continue.${RESET}\n`);
        }
        process.stdout.write(SHOW_CURSOR);
      }
    };

    return computing;
  }

  /**
   * Display a progress bar for operations with known progress
   * @param {string} message - The message to display
   * @param {number} total - Total steps
   * @returns {Object} Progress bar controller
   */
  startProgress(message, total = 100) {
    if (this.activeProgress) {
      this.activeProgress.stop();
    }

    let current = 0;
    const barWidth = 30;
    
    process.stdout.write(HIDE_CURSOR);

    const render = () => {
      const percentage = Math.min(100, Math.round((current / total) * 100));
      const filled = Math.round((percentage / 100) * barWidth);
      const empty = barWidth - filled;
      
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      const output = `${CLEAR_LINE}${CURSOR_START}${HLVM_PURPLE}[${bar}]${RESET} ${percentage}% ${message}`;
      process.stdout.write(output);
    };

    render();

    const progress = {
      update: (value, newMessage = null) => {
        current = Math.min(total, value);
        if (newMessage) message = newMessage;
        render();
      },
      increment: (amount = 1) => {
        progress.update(current + amount);
      },
      stop: (finalMessage = null) => {
        process.stdout.write(CLEAR_LINE + CURSOR_START);
        if (finalMessage) {
          process.stdout.write(finalMessage + '\n');
        }
        process.stdout.write(SHOW_CURSOR);
        if (this.activeProgress === progress) {
          this.activeProgress = null;
        }
      },
      complete: () => {
        current = total;
        render();
        setTimeout(() => progress.stop(`✅ ${message} - Complete`), 100);
      }
    };

    this.activeProgress = progress;
    return progress;
  }

  /**
   * Display a context usage indicator (like Opus limit warning)
   * @param {number} percentage - Context usage percentage
   * @param {string} [model] - Model name for context
   */
  showContextUsage(percentage, model = null) {
    const warningThreshold = 80;
    const criticalThreshold = 95;
    
    let color = HLVM_PURPLE;
    let icon = '○';
    
    if (percentage >= criticalThreshold) {
      color = '\x1b[91m'; // Bright red
      icon = '●';
    } else if (percentage >= warningThreshold) {
      color = YELLOW;
      icon = '◉';
    }
    
    const message = model 
      ? `Approaching ${model} usage limit : ${percentage}% context used`
      : `Context usage: ${percentage}%`;
    
    const output = `${color}${icon} ${message}${RESET}`;
    process.stdout.write(`\n${output}\n`);
  }

  /**
   * Clean up any active UI elements
   */
  cleanup() {
    if (this.activeSpinner) {
      this.activeSpinner.stop();
    }
    if (this.activeProgress) {
      this.activeProgress.stop();
    }
    process.stdout.write(SHOW_CURSOR);
  }
}

// Create singleton instance
const cliProgress = new CLIProgress();

// Clean up on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => cliProgress.cleanup());
  process.on('SIGINT', () => {
    cliProgress.cleanup();
    process.exit(0);
  });
}

// Export for use in AI and other modules
export default cliProgress;
export { cliProgress, CLIProgress, SPINNERS };