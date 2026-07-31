const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const downloadsDir = 'C:/Users/gagos/Downloads';
        if (!fs.existsSync(downloadsDir)) {
            console.log('Downloads folder does not exist');
            return;
        }

        console.log('Listing CSV/Excel/Text files in C:/Users/gagos/Downloads...');
        const files = fs.readdirSync(downloadsDir);
        const candidates = files.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return ext === '.csv' || ext === '.xlsx' || ext === '.xls' || ext === '.txt';
        }).map(f => {
            const fullPath = path.join(downloadsDir, f);
            const stat = fs.statSync(fullPath);
            return { name: f, size: stat.size, mtime: stat.mtime };
        }).sort((a, b) => b.mtime - a.mtime);

        console.log(`Found ${candidates.length} candidate files:`);
        candidates.forEach((f, idx) => {
            console.log(`[${idx+1}] ${f.name} | Size: ${f.size} bytes | Modified: ${f.mtime.toLocaleString()}`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
}
run();
