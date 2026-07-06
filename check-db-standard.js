const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.java') || f.endsWith('.xml') || f.endsWith('.ts')) {
            callback(path.join(dir, f));
        }
    });
}

const violations = {
    backend: [],
    frontend: []
};

const prefixPattern = /^(tb|vw|sq|fn|sp|tr)_[a-z0-9_]+$/;
const EXCLUDED_TABLES = ['ecopseq', 'ids', 'revinfo'];

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let fileViolations = [];

    lines.forEach((line, i) => {
        // Check JPA @Table
        const tableMatch = line.match(/@Table\s*\(\s*name\s*=\s*["']([^"']+)["']/);
        if (tableMatch) {
            const name = tableMatch[1];
            if (!EXCLUDED_TABLES.includes(name) && !prefixPattern.test(name)) {
                fileViolations.push(`L${i+1}: @Table name "${name}" violates standard.`);
            }
        }
        
        // Check JPA @Column
        const colMatch = line.match(/@Column\s*\([^)]*name\s*=\s*["']([^"']+)["']/);
        if (colMatch) {
            const name = colMatch[1];
            if (name !== name.toLowerCase()) {
                fileViolations.push(`L${i+1}: @Column name "${name}" contains uppercase.`);
            }
        }
    });

    if (fileViolations.length > 0) {
        if (filePath.includes('frontend')) {
            violations.frontend.push({ file: filePath, issues: fileViolations });
        } else {
            violations.backend.push({ file: filePath, issues: fileViolations });
        }
    }
}

['api-server', 'business-suite', 'foundation'].forEach(dir => {
    if (fs.existsSync(dir)) walkDir(dir, checkFile);
});

console.log("=== DB Standardization Violation Report ===");
console.log(`Backend Files with violations: ${violations.backend.length}`);
console.log(`Frontend Files with violations: ${violations.frontend.length}`);

if (violations.backend.length > 0) {
    console.log("\n[Backend Violations Summary - Showing first 5 files]");
    violations.backend.slice(0, 5).forEach(v => {
        console.log(`- ${v.file}`);
        v.issues.slice(0,3).forEach(iss => console.log(`    ${iss}`));
        if (v.issues.length > 3) console.log(`    ... and ${v.issues.length - 3} more`);
    });
}

// Write full report to a file
fs.writeFileSync('db-violation-report.json', JSON.stringify(violations, null, 2));
console.log("\nFull report saved to db-violation-report.json");
