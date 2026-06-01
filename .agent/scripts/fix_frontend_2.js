const fs = require('fs');
const path = require('path');

const dir = 'd:\\project\\egov-enterprise\\frontend\\src';

function replaceInFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    let modified = original;

    modified = modified.replace(/replyPsblYn/g, 'ansPsblYn');
    modified = modified.replace(/replyPosblAt/g, 'ansPsblYn');
    modified = modified.replace(/fileAtchPosblAt/g, 'fileAtchPsblYn');
    modified = modified.replace(/bbsIntrcn/g, 'bbsIntroCn');
    modified = modified.replace(/bbsAttrbCode/g, 'bbsAtrbCd');
    modified = modified.replace(/bbsTyCode/g, 'bbsTypeCd');

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
console.log('Frontend additional fix complete.');
