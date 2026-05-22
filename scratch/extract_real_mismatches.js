const fs = require('fs');
const path = require('path');

const mismatches = JSON.parse(fs.readFileSync(path.resolve('scratch/active-mismatches.json'), 'utf8'));

const realMismatches = mismatches.filter(m => !m.notes || !m.notes.includes('Both actual and expected'));

console.log(`=== REAL UNRESOLVED MISMATCHES: ${realMismatches.length} items ===`);

// Group by file path
const grouped = {};
realMismatches.forEach(m => {
    if (!grouped[m.filePath]) {
        grouped[m.filePath] = [];
    }
    grouped[m.filePath].push(m);
});

Object.keys(grouped).forEach((filePath, idx) => {
    const relativePath = path.relative(path.resolve('.'), filePath);
    console.log(`\n${idx + 1}. File: ${relativePath} (${grouped[filePath].length} mismatches)`);
    grouped[filePath].forEach(m => {
        console.log(`   - Column: ${m.columnName} | Current Field: ${m.actualField} -> Expected: ${m.expectedCamel} (Line: ${m.line})`);
    });
});

// Save to scratch/real-active-mismatches.json
fs.writeFileSync(
    path.resolve('scratch/real-active-mismatches.json'),
    JSON.stringify(realMismatches, null, 2),
    'utf8'
);
console.log('\nSaved to scratch/real-active-mismatches.json');
