/**
 * Unified progress indicator for terminal operations
 */

const COLORS = {
  purple: '\x1b[35m',
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  clear: '\x1b[2K',
  cursorStart: '\x1b[0G',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h'
};

export class ProgressIndicator {
  constructor(message = 'Processing', showInterrupt = true) {
    this.message = message;
    this.showInterrupt = showInterrupt;
    this.dotIndex = 0;
    this.dots = ['', '.', '..', '...'];
    this.interval = null;
    this.isFirstRender = true;
    this.start();
  }
  
  start() {
    if (typeof process === 'undefined' || !process.stdout) return;
    
    try {
      process.stdout.write(COLORS.hideCursor);
    } catch {}
    
    this.render();
    this.interval = setInterval(() => this.render(), 500);
  }
  
  render() {
    if (typeof process === 'undefined' || !process.stdout) return;
    
    try {
      let output = this.isFirstRender ? '\n\n' : `${COLORS.clear}${COLORS.cursorStart}`;
      output += `${COLORS.purple}⚡${COLORS.reset} ${COLORS.purple}${this.message}${this.dots[this.dotIndex]}${COLORS.reset}`;
      
      if (this.showInterrupt) {
        output += ` ${COLORS.dim}(esc to interrupt)${COLORS.reset}`;
      }
      
      process.stdout.write(output);
      this.isFirstRender = false;
      this.dotIndex = (this.dotIndex + 1) % this.dots.length;
    } catch {}
  }
  
  update(newMessage) {
    this.message = newMessage;
  }
  
  stop(showDone = false) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    if (typeof process === 'undefined' || !process.stdout) return;
    
    try {
      process.stdout.write(`${COLORS.clear}${COLORS.cursorStart}${COLORS.showCursor}`);
      if (showDone) {
        process.stdout.write(`\n${COLORS.dim}Done. Press Enter to continue.${COLORS.reset}\n`);
      } else {
        process.stdout.write('\n');
      }
    } catch {}
  }
}