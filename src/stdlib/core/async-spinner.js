// HLVM Async Spinner - Shows progress for long-running async operations

let spinnerTimeout = null;
let spinnerInterval = null;
let spinnerActive = false;

// Simple animated dots
function startSpinner() {
  if (spinnerActive) return;
  spinnerActive = true;
  
  const dots = ['   ', '.  ', '.. ', '...'];
  let i = 0;
  
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r\x1b[36m⏳ Processing${dots[i++ % 4]}\x1b[0m`);
  }, 300);
}

function stopSpinner() {
  if (spinnerTimeout) {
    clearTimeout(spinnerTimeout);
    spinnerTimeout = null;
  }
  
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  
  if (spinnerActive) {
    spinnerActive = false;
    process.stdout.write('\r\x1b[K'); // Clear line
  }
}

// Wrap Promise.prototype.then to show spinner for slow async ops
export function enableAsyncSpinner() {
  const originalThen = Promise.prototype.then;
  
  Promise.prototype.then = function(onFulfilled, onRejected) {
    // Only show spinner if operation takes longer than 100ms
    if (!spinnerActive && !spinnerTimeout) {
      spinnerTimeout = setTimeout(() => {
        startSpinner();
      }, 100);
    }
    
    // Wrap callbacks to stop spinner when done
    const wrappedFulfilled = onFulfilled && function(value) {
      stopSpinner();
      return onFulfilled(value);
    };
    
    const wrappedRejected = onRejected && function(reason) {
      stopSpinner();
      return onRejected(reason);
    };
    
    return originalThen.call(this, wrappedFulfilled, wrappedRejected);
  };
}

export default { enableAsyncSpinner };