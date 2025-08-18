#!/usr/bin/env node

/**
 * JSDoc Parser for HLVM Build Process
 * Extracts JSDoc comments and attaches them to functions for REPL display
 */

function parseJSDoc(source) {
  const result = [];
  
  // Match JSDoc comment blocks followed by function declarations
  const jsDocPattern = /\/\*\*([\s\S]*?)\*\/\s*(?:export\s+)?(?:async\s+)?(?:function|const|let|var|static)\s+(\w+)/g;
  
  let match;
  while ((match = jsDocPattern.exec(source)) !== null) {
    const [fullMatch, comment, functionName] = match;
    
    // Parse the JSDoc comment
    const doc = parseJSDocComment(comment, functionName);
    
    result.push({
      name: functionName,
      doc: doc,
      position: match.index
    });
  }
  
  return result;
}

function parseJSDocComment(comment, functionName) {
  const lines = comment.split('\n').map(line => 
    line.replace(/^\s*\*\s?/, '').trim()
  );
  
  let description = '';
  const params = [];
  let returns = '';
  const examples = [];
  
  let currentSection = 'description';
  let currentExample = '';
  
  for (const line of lines) {
    if (line.startsWith('@param')) {
      currentSection = 'param';
      const paramMatch = line.match(/@param\s+\{([^}]+)\}\s+(\[?\w+\]?)\s*-?\s*(.*)/);
      if (paramMatch) {
        params.push({
          type: paramMatch[1],
          name: paramMatch[2],
          description: paramMatch[3]
        });
      }
    } else if (line.startsWith('@returns') || line.startsWith('@return')) {
      currentSection = 'returns';
      const returnMatch = line.match(/@returns?\s+\{([^}]+)\}\s*(.*)/);
      if (returnMatch) {
        returns = `${returnMatch[1]} ${returnMatch[2]}`.trim();
      }
    } else if (line.startsWith('@example')) {
      currentSection = 'example';
      if (currentExample) {
        examples.push(currentExample.trim());
      }
      currentExample = '';
    } else if (line.startsWith('@')) {
      currentSection = 'other';
    } else {
      if (currentSection === 'description' && line) {
        description += (description ? ' ' : '') + line;
      } else if (currentSection === 'example') {
        currentExample += line + '\n';
      }
    }
  }
  
  // Add last example if exists
  if (currentExample) {
    examples.push(currentExample.trim());
  }
  
  // Build signature
  const paramStr = params.map(p => {
    const optional = p.name.includes('[') ? '?' : '';
    const cleanName = p.name.replace(/[\[\]]/g, '');
    return cleanName + optional;
  }).join(', ');
  
  const signature = `${functionName}(${paramStr})`;
  
  // Build formatted documentation
  let formattedDoc = `\x1b[36m${signature}\x1b[0m\n\n`;
  
  if (description) {
    formattedDoc += `${description}\n\n`;
  }
  
  if (params.length > 0) {
    formattedDoc += `\x1b[33mParameters:\x1b[0m\n`;
    params.forEach(p => {
      const optional = p.name.includes('[') ? ' (optional)' : '';
      const cleanName = p.name.replace(/[\[\]]/g, '');
      formattedDoc += `  ${cleanName}: \x1b[90m${p.type}\x1b[0m${optional}`;
      if (p.description) {
        formattedDoc += ` - ${p.description}`;
      }
      formattedDoc += '\n';
    });
    formattedDoc += '\n';
  }
  
  if (returns) {
    formattedDoc += `\x1b[33mReturns:\x1b[0m ${returns}\n\n`;
  }
  
  if (examples.length > 0) {
    formattedDoc += `\x1b[33mExamples:\x1b[0m\n`;
    examples.forEach(ex => {
      const lines = ex.split('\n');
      lines.forEach(line => {
        if (line.startsWith('//')) {
          // Output line
          formattedDoc += `\x1b[32m${line}\x1b[0m\n`;
        } else if (line.trim()) {
          // Code line
          formattedDoc += `  ${line}\n`;
        }
      });
    });
  }
  
  return formattedDoc.trim();
}

function injectDocs(source, docs) {
  let result = source;
  
  // Sort docs by position in reverse to maintain positions
  docs.sort((a, b) => b.position - a.position);
  
  for (const doc of docs) {
    // Find the function in the source
    const functionPattern = new RegExp(
      `((?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|static)\\s+${doc.name}[^{]*\\{)`,
      'g'
    );
    
    result = result.replace(functionPattern, (match) => {
      // Add doc property after the function opening
      return match + `\n  if (typeof ${doc.name}.__doc__ === 'undefined') ${doc.name}.__doc__ = ${JSON.stringify(doc.doc)};`;
    });
  }
  
  return result;
}

// Export for use in build process
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseJSDoc, injectDocs };
}

// CLI usage
if (process.argv[2]) {
  const fs = require('fs');
  const source = fs.readFileSync(process.argv[2], 'utf8');
  const docs = parseJSDoc(source);
  const result = injectDocs(source, docs);
  console.log(result);
}