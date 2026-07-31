const fs = require('fs');
const path = require('path');
const os = require('os');

function searchDirectories(baseDir) {
    const results = [];
    if (!fs.existsSync(baseDir)) return results;

    function walk(dir) {
        try {
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const fullPath = path.join(dir, file);
                let stat;
                try {
                    stat = fs.statSync(fullPath);
                } catch (e) {
                    return; // skip if cannot stat
                }
                if (stat && stat.isDirectory()) {
                    if (file.toLowerCase().includes('indexeddb') || file.toLowerCase().includes('local storage') || file.toLowerCase().includes('firestore')) {
                        results.push(fullPath);
                    }
                    // limit depth to avoid scan freeze
                    const depth = fullPath.split(path.sep).length - baseDir.split(path.sep).length;
                    if (depth < 6) {
                        walk(fullPath);
                    }
                }
            });
        } catch (e) {
            // ignore permission errors
        }
    }
    walk(baseDir);
    return results;
}

const localAppData = path.join(os.homedir(), 'AppData', 'Local');
console.log('Searching Chrome / Edge Local AppData for databases...');
const paths = [];
const chromeDir = path.join(localAppData, 'Google', 'Chrome', 'User Data');
const edgeDir = path.join(localAppData, 'Microsoft', 'Edge', 'User Data');

if (fs.existsSync(chromeDir)) {
    console.log('Found Chrome User Data directory');
    paths.push(...searchDirectories(chromeDir));
}
if (fs.existsSync(edgeDir)) {
    console.log('Found Edge User Data directory');
    paths.push(...searchDirectories(edgeDir));
}

console.log(`\nFound ${paths.length} relevant folders:`);
paths.forEach(p => {
    // List all files/folders inside it that contain "assistenza-sk" or "firestore"
    console.log(`- ${p}`);
    try {
        const subFiles = fs.readdirSync(p);
        subFiles.forEach(sf => {
            if (sf.toLowerCase().includes('assistenza-sk') || sf.toLowerCase().includes('official') || sf.toLowerCase().includes('firestore')) {
                console.log(`   -> ${sf}`);
            }
        });
    } catch(e) {}
});
