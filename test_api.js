import './src/hlvm-init.js';
await new Promise(r => setTimeout(r, 100));

function getPaths(obj, prefix = '') {
    let paths = [];
    for (let key in obj) {
        if (key.startsWith('_')) continue;
        const path = prefix ? `${prefix}.${key}` : key;
        const val = obj[key];
        if (typeof val === 'function') {
            paths.push(path + '()');
        } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            paths.push(path);
            paths = paths.concat(getPaths(val, path));
        } else {
            paths.push(path);
        }
    }
    return paths;
}

if (typeof hlvm !== 'undefined') {
    const allPaths = getPaths(hlvm, 'hlvm');
    // Filter to reasonable size for testing
    const filtered = allPaths.filter(p => {
        const depth = (p.match(/\./g) || []).length;
        return depth <= 3 && !p.includes('.PS.') && !p.includes('.ERRORS.');
    });
    console.log(JSON.stringify(filtered));
} else {
    console.log('[]');
}
