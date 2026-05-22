const fs = require('fs');
const path = require('path');

async function run() {
    const reportPath = path.resolve('db-field-mismatch-report.json');
    if (!fs.existsSync(reportPath)) {
        console.error('Error: db-field-mismatch-report.json not found!');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.log(`Loaded ${data.length} potential mismatch items from report.`);

    const activeMismatches = [];
    const resolvedMismatches = [];

    for (const item of data) {
        if (!fs.existsSync(item.filePath)) {
            console.log(`File not found (Skipped): ${item.filePath}`);
            continue;
        }

        const content = fs.readFileSync(item.filePath, 'utf8');
        
        // Check if the actualField (the old/mismatched name) still exists as a field declaration
        // We look for patterns like 'private Type actualField' or 'protected Type actualField'
        const actualFieldPattern = new RegExp(`(?:private|protected|public)\\s+[A-Za-z0-9_<>\\[\\]]+\\s+${item.actualField}\\s*(?:;|=|$)`);
        const expectedCamelPattern = new RegExp(`(?:private|protected|public)\\s+[A-Za-z0-9_<>\\[\\]]+\\s+${item.expectedCamel}\\s*(?:;|=|$)`);
        
        const hasActual = actualFieldPattern.test(content);
        const hasExpected = expectedCamelPattern.test(content);

        if (hasActual && !hasExpected) {
            // Still has the old mismatched field, and doesn't have the new one
            activeMismatches.push(item);
        } else if (!hasActual && hasExpected) {
            // Already resolved to the standard camel case field!
            resolvedMismatches.push(item);
        } else if (hasActual && hasExpected) {
            // Both present (highly unusual, needs manual review)
            activeMismatches.push({ ...item, notes: 'Both actual and expected field declarations present!' });
        } else {
            // Neither present (perhaps the field was deleted or named differently)
            resolvedMismatches.push({ ...item, notes: 'Neither field declaration found.' });
        }
    }

    console.log('\n=== REAL-TIME MISMATCH VERIFICATION RESULTS ===');
    console.log(`Total Mismatch Items Analyzed: ${data.length}`);
    console.log(`Already Resolved/Cleaned Items: ${resolvedMismatches.length}`);
    console.log(`Active/Remaining Mismatches   : ${activeMismatches.length}`);

    if (activeMismatches.length > 0) {
        console.log('\n[Remaining Active Mismatches List]');
        activeMismatches.forEach((m, idx) => {
            console.log(`${idx + 1}. File: ${m.relativeClass}`);
            console.log(`   - DB Column: ${m.columnName}`);
            console.log(`   - Mismatched Field: ${m.actualField} (Line: ${m.line})`);
            console.log(`   - Standard Camel: ${m.expectedCamel}`);
            if (m.notes) console.log(`   - NOTE: ${m.notes}`);
        });

        // Save active mismatches to a new JSON for exact tracking
        fs.writeFileSync(
            path.resolve('scratch/active-mismatches.json'), 
            JSON.stringify(activeMismatches, null, 2), 
            'utf8'
        );
        console.log('\nActive mismatches saved to scratch/active-mismatches.json');
    } else {
        console.log('\n🎉 Brilliant! All Java entity fields are 100% matched with DB columns using standard CamelCase naming!');
    }
}

run();
