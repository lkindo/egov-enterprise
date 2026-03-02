const fs = require('fs');

const files = [
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/StressTest.java',
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/LoadTest.java',
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/BottleneckIdentificationTest.java'
];

files.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix 1: Restore boolean allCompleted and long endTime
    // Pattern: latch.await(...); // Korean comment removed
    // We look for latch.await followed by long duration = endTime - startTime;
    // to determine if endTime needs to be restored.

    content = content.replace(/latch\.await\((.*?)\);\s*\/\/ Korean comment removed\s+long duration = (endTime|testEndTime|duration)/g, (match, p1, p2) => {
        let varName = p2 === 'testEndTime' ? 'testEndTime' : 'endTime';
        return `boolean allCompleted = latch.await(${p1});\n        long ${varName} = System.currentTimeMillis();\n\n        long duration = ${p2}`;
    });

    // Fix 2: Restore missing allCompleted if it's used in printf
    // System.out.printf(..., allCompleted);
    content = content.replace(/latch\.await\((.*?)\);\s*\/\/ Korean comment removed/g, (match, p1) => {
        // Only if it doesn't already have allCompleted assignment
        if (!match.includes('allCompleted =')) {
            return `boolean allCompleted = latch.await(${p1});\n        long endTime = System.currentTimeMillis();`;
        }
        return match;
    });

    // Fix 3: System.out.printf with too many parameters or missing ones
    // Just ensure allCompleted is available where needed

    // Fix missing endTime assignment specifically
    if (content.includes('endTime - startTime') && !content.includes('endTime =')) {
        content = content.replace(/latch\.await\((.*?)\);/g, 'boolean allCompleted = latch.await($1);\n        long endTime = System.currentTimeMillis();');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Processed ' + filePath);
});
