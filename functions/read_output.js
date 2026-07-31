const fs = require('fs');
const path = require('path');

try {
    const filePath = path.join(__dirname, 'output.txt');
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf16le');
        console.log('--- CONTENT OF functions/output.txt ---');
        console.log(content.substring(0, 5000)); // print up to 5000 chars
        console.log('--- END OF CONTENT ---');
    } else {
        console.log('functions/output.txt does not exist');
    }
} catch (e) {
    console.error('Error:', e);
}
