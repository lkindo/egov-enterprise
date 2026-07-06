const fs = require('fs');
const path = require('path');

const targetDirs = [
    'd:\\project\\egov-enterprise\\business-suite\\src\\main\\java',
    'd:\\project\\egov-enterprise\\api-server\\src\\main\\java'
];

let totalEntities = 0;
let eagerCount = 0;
let missingLazyCount = 0;
const violations = [];

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDirectory(fullPath);
        } else if (fullPath.endsWith('.java')) {
            analyzeFile(fullPath);
        }
    });
}

function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it's an entity or contains JPA relations
    if (!content.includes('@Entity') && !content.includes('@ManyToOne') && !content.includes('@OneToOne') && !content.includes('@OneToMany') && !content.includes('@ManyToMany')) {
        return;
    }
    
    totalEntities++;
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for explicit EAGER
        if (line.includes('FetchType.EAGER')) {
            violations.push({
                file: filePath,
                line: i + 1,
                content: line.trim(),
                reason: 'Explicit FetchType.EAGER detected (N+1 risk)'
            });
            eagerCount++;
            continue;
        }
        
        // Check for @ManyToOne or @OneToOne missing LAZY
        if (line.includes('@ManyToOne') || line.includes('@OneToOne')) {
            // It might be multi-line annotation, but usually it's on one line.
            // Let's do a simple check. If the line doesn't have fetch=FetchType.LAZY and the next few lines don't either
            let hasLazy = line.includes('FetchType.LAZY');
            if (!hasLazy) {
                // Check if it's a simple annotation without parenthesis
                if (line.match(/@(ManyToOne|OneToOne)\s*$/) || line.match(/@(ManyToOne|OneToOne)\s*\(/)) {
                    // Check next line just in case it's broken down
                    let j = i;
                    let foundEnd = false;
                    let block = line;
                    while (j < lines.length - 1 && !line.includes(')')) {
                         j++;
                         block += lines[j];
                         if (lines[j].includes(')')) break;
                         // safety break
                         if (j > i + 5) break;
                    }
                    if (!block.includes('FetchType.LAZY')) {
                        violations.push({
                            file: filePath,
                            line: i + 1,
                            content: line.trim(),
                            reason: 'Default EAGER fetching in @ManyToOne or @OneToOne (missing fetch = FetchType.LAZY)'
                        });
                        missingLazyCount++;
                    }
                }
            }
        }
    }
}

targetDirs.forEach(dir => scanDirectory(dir));

console.log(`Scan Complete.`);
console.log(`Total files with JPA relations scanned: ${totalEntities}`);
console.log(`Violations found: ${violations.length}`);
console.log(`  - Explicit EAGER: ${eagerCount}`);
console.log(`  - Missing LAZY (@ManyToOne, @OneToOne): ${missingLazyCount}`);

if (violations.length > 0) {
    console.log('\n--- Details ---');
    violations.forEach(v => {
        const relPath = v.file.split('egov-enterprise')[1];
        console.log(`File: ${relPath}:${v.line}`);
        console.log(`Reason: ${v.reason}`);
        console.log(`Code:   ${v.content}\n`);
    });
}
