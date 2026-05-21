const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.java')) {
            callback(dirPath);
        }
    });
}

const prefixPattern = /^(tb|vw|sq|fn|sp|tr)_[a-z0-9_]+$/;
let modifiedCount = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let isModified = false;

    // 1. @Table(name = "XXX") 소문자 변환
    content = content.replace(/(@Table\s*\(\s*name\s*=\s*["'])([^"']+)(["'])/g, (match, prefix, name, suffix) => {
        const lowerName = name.toLowerCase();
        if (name !== lowerName) {
            isModified = true;
            return prefix + lowerName + suffix;
        }
        return match;
    });

    // 2. @Column(name = "XXX") 소문자 변환
    content = content.replace(/(@Column\s*\([^)]*name\s*=\s*["'])([^"']+)(["'])/g, (match, prefix, name, suffix) => {
        const lowerName = name.toLowerCase();
        if (name !== lowerName) {
            isModified = true;
            return prefix + lowerName + suffix;
        }
        return match;
    });

    if (isModified) {
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedCount++;
        console.log(`Updated: ${filePath}`);
    }
}

console.log("Starting DB standardization refactoring...");
['api-server', 'business-suite', 'foundation'].forEach(dir => {
    if (fs.existsSync(dir)) {
        walkDir(dir, processFile);
    }
});
console.log(`\nRefactoring complete. Total files modified: ${modifiedCount}`);
