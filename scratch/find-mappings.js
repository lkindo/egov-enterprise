const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.java')) {
            callback(path.join(dir, f));
        }
    });
}

function snakeToCamel(s) {
    return s.replace(/(_\w)/g, m => m[1].toUpperCase());
}

const mismatches = [];

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const colMatch = line.match(/@Column\s*\([^)]*name\s*=\s*["']([^"']+)["']/);
        if (colMatch) {
            const colName = colMatch[1];
            // find the next private field
            let fieldName = null;
            for (let j = i; j < Math.min(i + 5, lines.length); j++) {
                const fieldMatch = lines[j].match(/private\s+[A-Za-z0-9_<>]+\s+([a-zA-Z0-9_]+)\s*;/);
                if (fieldMatch) {
                    fieldName = fieldMatch[1];
                    break;
                }
            }
            
            if (fieldName) {
                const expectedCamel = snakeToCamel(colName.toLowerCase());
                if (expectedCamel !== fieldName) {
                    mismatches.push({
                        file: filePath.split('egov-enterprise')[1],
                        line: i + 1,
                        colName: colName,
                        fieldName: fieldName,
                        expected: expectedCamel
                    });
                }
            }
        }
    }
}

['api-server', 'business-suite', 'foundation'].forEach(dir => {
    const fullDir = path.join('d:\\project\\egov-enterprise', dir);
    if (fs.existsSync(fullDir)) walkDir(fullDir, checkFile);
});

console.log(JSON.stringify(mismatches, null, 2));
