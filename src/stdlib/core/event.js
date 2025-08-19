// HLVM Core Event System - Observe functions, properties, and files
// Smart observation API that detects what you're trying to observe

// Store all active observers
const observers = new Map();
const fileWatchers = new Map();

/**
 * Observe function calls, property changes, or file modifications
 * @param {string} target - Path to observe (hlvm.*, file path, or pattern)
 * @param {Object} hooks - Observation hooks
 * @param {Function} [hooks.before] - Called before function execution
 * @param {Function} [hooks.after] - Called after function execution  
 * @param {Function} [hooks.error] - Called on function error
 * @param {Function} [hooks.onChange] - Called on property/file change
 * @returns {boolean} True if observer was added successfully
 * @example
 * // Observe function calls
 * hlvm.core.event.observe('hlvm.core.io.fs.write', {
 *   before: (args) => console.log('Writing:', args[0]),
 *   after: (result) => console.log('Wrote successfully')
 * })
 * @example
 * // Observe file changes
 * hlvm.core.event.observe('/tmp/watch.txt', {
 *   onChange: (event) => console.log('File changed:', event.kind)
 * })
 * @example  
 * // Observe pattern (all fs functions)
 * hlvm.core.event.observe('hlvm.core.io.fs.*', {
 *   before: (args, path) => console.log(`Calling ${path}:`, args)
 * })
 */
export function observe(target, hooks) {
  if (typeof target !== 'string') {
    throw new Error('Target must be a string path');
  }
  
  // Detect what type of target this is
  if (isFilePath(target)) {
    return observeFile(target, hooks);
  }
  
  if (target.includes('*')) {
    return observePattern(target, hooks);
  }
  
  if (target.startsWith('hlvm.')) {
    return observeHlvmPath(target, hooks);
  }
  
  throw new Error(`Cannot observe: ${target}`);
}

/**
 * Stop observing a target or all targets
 * @param {string} [target] - Path to stop observing. If omitted, removes ALL observers
 * @returns {number|boolean} Count of removed observers (if no target) or success boolean
 * @example
 * // Remove specific observer
 * hlvm.core.event.unobserve('hlvm.core.io.fs.write')
 * @example
 * // Remove all observers
 * const count = hlvm.core.event.unobserve()
 * console.log(`Removed ${count} observers`)
 */
export function unobserve(target) {
  // If no target, remove ALL observers
  if (target === undefined) {
    let count = 0;
    
    // Remove all function/property observers
    for (const [path] of observers) {
      if (unobserve(path)) count++;
    }
    
    // Remove all file watchers
    for (const [path] of fileWatchers) {
      if (unobserve(path)) count++;
    }
    
    return count;
  }
  
  // Remove specific observer
  if (observers.has(target)) {
    const observer = observers.get(target);
    
    // Restore original function if it was wrapped
    if (observer.type === 'function' && observer.original) {
      const parts = target.split('.');
      let obj = globalThis;
      
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      
      obj[parts[parts.length - 1]] = observer.original;
    }
    
    // Remove property descriptor if it was modified
    if (observer.type === 'property' && observer.descriptor) {
      const parts = target.split('.');
      let obj = globalThis;
      
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      
      Object.defineProperty(obj, parts[parts.length - 1], observer.descriptor);
    }
    
    observers.delete(target);
    return true;
  }
  
  // Remove file watcher
  if (fileWatchers.has(target)) {
    const watcher = fileWatchers.get(target);
    watcher.close();
    fileWatchers.delete(target);
    return true;
  }
  
  // Remove pattern observers
  if (target.includes('*')) {
    let removed = false;
    for (const [key, observer] of observers) {
      if (observer.pattern === target) {
        unobserve(key);
        removed = true;
      }
    }
    return removed;
  }
  
  return false;
}

// Helper: Check if string is a file path
function isFilePath(str) {
  return str.startsWith('/') || 
         str.startsWith('./') || 
         str.startsWith('../') ||
         str.startsWith('~') ||
         (str.includes('.') && !str.startsWith('hlvm.'));
}

// Helper: Observe a file for changes
function observeFile(path, hooks) {
  if (!hooks.onChange) {
    throw new Error('File observation requires onChange hook');
  }
  
  // Use Deno.watchFs for file watching
  const watcher = Deno.watchFs(path);
  
  // Store watcher for cleanup
  fileWatchers.set(path, watcher);
  
  // Start watching in background
  (async () => {
    try {
      for await (const event of watcher) {
        if (event.kind === 'modify' || event.kind === 'create') {
          await hooks.onChange(event, path);
        }
      }
    } catch (error) {
      if (hooks.error) {
        await hooks.error(error, path);
      }
    }
  })();
  
  return true;
}

// Helper: Observe pattern (e.g., hlvm.core.io.fs.*)
function observePattern(pattern, hooks) {
  const base = pattern.replace('*', '');
  
  // Find all matching functions
  const parts = base.split('.');
  let obj = globalThis;
  
  for (const part of parts) {
    if (part) {
      obj = obj[part];
      if (!obj) return false;
    }
  }
  
  // Wrap all functions in the object
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'function') {
      const fullPath = base + key;
      observeHlvmPath(fullPath, hooks);
      count++;
    }
  }
  
  return count > 0;
}

// Helper: Observe HLVM path (function or property)
function observeHlvmPath(path, hooks) {
  const parts = path.split('.');
  let obj = globalThis;
  
  // Navigate to parent object
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
    if (!obj) {
      throw new Error(`Path not found: ${path}`);
    }
  }
  
  const propName = parts[parts.length - 1];
  const value = obj[propName];
  
  // Check if it's a function
  if (typeof value === 'function') {
    return observeFunction(obj, propName, path, hooks);
  } else {
    return observeProperty(obj, propName, path, hooks);
  }
}

// Helper: Observe a function
function observeFunction(obj, propName, path, hooks) {
  const original = obj[propName];
  
  // Store original for restoration
  observers.set(path, {
    type: 'function',
    original: original,
    hooks: hooks
  });
  
  // Create wrapper function
  obj[propName] = async function(...args) {
    let modifiedArgs = args;
    
    // Call before hook
    if (hooks.before) {
      const result = await hooks.before(args, path);
      if (result !== undefined) {
        modifiedArgs = Array.isArray(result) ? result : [result];
      }
    }
    
    try {
      // Call original function
      const result = await original.apply(this, modifiedArgs);
      
      // Call after hook
      if (hooks.after) {
        await hooks.after(result, modifiedArgs, path);
      }
      
      return result;
    } catch (error) {
      // Call error hook
      if (hooks.error) {
        await hooks.error(error, modifiedArgs, path);
      }
      throw error;
    }
  };
  
  // Preserve function name and properties
  Object.defineProperty(obj[propName], 'name', { value: original.name });
  Object.setPrototypeOf(obj[propName], original);
  
  return true;
}

// Helper: Observe a property
function observeProperty(obj, propName, path, hooks) {
  if (!hooks.onChange) {
    throw new Error('Property observation requires onChange hook');
  }
  
  const descriptor = Object.getOwnPropertyDescriptor(obj, propName);
  let currentValue = obj[propName];
  
  // Store original descriptor for restoration
  observers.set(path, {
    type: 'property',
    descriptor: descriptor,
    hooks: hooks
  });
  
  // Define new property with getter/setter
  Object.defineProperty(obj, propName, {
    get() {
      return currentValue;
    },
    set(newValue) {
      const oldValue = currentValue;
      
      // Call onChange hook
      const result = hooks.onChange(newValue, oldValue, path);
      
      // Allow hook to modify or reject the value
      if (result !== undefined) {
        newValue = result;
      }
      
      currentValue = newValue;
      return true;
    },
    enumerable: descriptor ? descriptor.enumerable : true,
    configurable: true
  });
  
  return true;
}

/**
 * List all active observers
 * @returns {Array<{path: string, type: string, hooks: string[]}>} Array of observer info
 * @example
 * const observers = hlvm.core.event.list()
 * observers.forEach(o => console.log(`${o.path} (${o.type}): ${o.hooks.join(', ')}`)) 
 */
export function list() {
  const result = [];
  
  // Add function/property observers
  for (const [path, observer] of observers) {
    result.push({
      path: path,
      type: observer.type,
      hooks: Object.keys(observer.hooks)
    });
  }
  
  // Add file watchers
  for (const [path] of fileWatchers) {
    result.push({
      path: path,
      type: 'file',
      hooks: ['onChange']
    });
  }
  
  return result;
}

// Setup self-documentation
function initializeDocs() {
  const inspectSymbol = Symbol.for('Deno.customInspect');
  
  // Documentation for observe
  observe.__doc__ = `\x1b[36mobserve(target, hooks)\x1b[0m

Observe function calls, property changes, or file modifications

\x1b[33mParameters:\x1b[0m
  target: \x1b[90mstring\x1b[0m - Path to observe (hlvm.*, file path, or pattern)
  hooks: \x1b[90mObject\x1b[0m - Observation hooks
    before: Called before function execution
    after: Called after function execution
    error: Called on function error
    onChange: Called on property/file change

\x1b[33mReturns:\x1b[0m boolean - True if observer was added

\x1b[33mExamples:\x1b[0m
  // Observe function calls
  observe('hlvm.core.io.fs.write', {
    before: (args) => console.log('Writing:', args[0])
  })
  
  // Observe file changes
  observe('/tmp/watch.txt', {
    onChange: (event) => console.log('Changed:', event.kind)
  })
  
  // Observe pattern (all fs functions)
  observe('hlvm.core.io.fs.*', {
    before: (args, path) => console.log(\`Calling \${path}\`)
  })`;
  
  observe[inspectSymbol] = function() {
    return observe.__doc__;
  };
  
  // Documentation for unobserve
  unobserve.__doc__ = `\x1b[36munobserve(target?)\x1b[0m

Stop observing a target or all targets

\x1b[33mParameters:\x1b[0m
  target: \x1b[90mstring\x1b[0m (optional) - Path to stop observing
          If omitted, removes ALL observers

\x1b[33mReturns:\x1b[0m number|boolean - Count if no target, else success

\x1b[33mExamples:\x1b[0m
  // Remove specific observer
  unobserve('hlvm.core.io.fs.write')
  
  // Remove all observers
  const count = unobserve()
  console.log(\`Removed \${count} observers\`)`;
  
  unobserve[inspectSymbol] = function() {
    return unobserve.__doc__;
  };
  
  // Documentation for list
  list.__doc__ = `\x1b[36mlist()\x1b[0m

List all active observers

\x1b[33mReturns:\x1b[0m Array<Object> - Observer information
  Each object contains:
    path: The observed path
    type: 'function'|'property'|'file'
    hooks: Array of hook names

\x1b[33mExample:\x1b[0m
  const observers = list()
  observers.forEach(o => {
    console.log(\`\${o.path} (\${o.type}): \${o.hooks.join(', ')}\`)
  })`;
  
  list[inspectSymbol] = function() {
    return list.__doc__;
  };
}

// Initialize documentation on module load
initializeDocs();