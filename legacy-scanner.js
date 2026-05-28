const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (dirPath.includes('node_modules') || dirPath.includes('.git') || dirPath.includes('build') || dirPath.includes('generated-api.d.ts') || dirPath.includes('artifacts')) return;
        
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.java') || f.endsWith('.xml') || f.endsWith('.ts') || f.endsWith('.tsx')) {
            callback(dirPath);
        }
    });
}

const report = JSON.parse(fs.readFileSync('db-field-mismatch-report.json', 'utf8'));
const legacyFields = [...new Set(report.map(r => r.actualField))];

console.log(`Scanning for ${legacyFields.length} legacy fields...`);

let matches = [];

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        legacyFields.forEach(field => {
            // Check if field exists as a whole word
            const regex = new RegExp(`\\b${field}\\b`, 'g');
            if (regex.test(line)) {
                matches.push(`${filePath}:${i+1} - found '${field}'`);
            }
        });
    });
}

walkDir('.', scanFile);

if (matches.length > 0) {
    console.log(`Found ${matches.length} occurrences of legacy fields.`);
    fs.writeFileSync('legacy-scan-results.txt', matches.join('\n'));
    console.log('Results written to legacy-scan-results.txt');
} else {
    console.log('No legacy fields found. All clean!');
}
