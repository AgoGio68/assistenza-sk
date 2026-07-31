const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                walk(fullPath, results);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.json' || ext === '.csv' || ext === '.txt') {
                results.push({ path: fullPath, size: stat.size });
            }
        }
    });
    return results;
}

const allFiles = walk('c:/assistenza-sk');
console.log(`Found ${allFiles.length} files:`);
allFiles.forEach(f => {
    console.log(`- ${f.path.replace(/\\/g, '/')} (${f.size} bytes)`);
});
