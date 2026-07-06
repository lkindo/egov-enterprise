const fs = require('fs');
const path = require('path');

const dir = 'd:\\project\\egov-enterprise\\frontend\\src';

function replaceInFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    let modified = original;

    // We only replace exact matches to avoid partial word replacements if any, but in this case they are specific enough.
    modified = modified.replace(/bbsAttrCd/g, 'bbsAtrbCd');
    modified = modified.replace(/recptnTelno/g, 'rcptnTelno');

    if (original !== modified) {
        fs.writeFileSync(filePath, modified, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walk(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            replaceInFile(fullPath);
        }
    }
}

walk(dir);
console.log('Frontend fix complete.');
