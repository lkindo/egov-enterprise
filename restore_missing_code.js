const fs = require('fs');

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Restore missing assignments
    // Pattern: // Korean comment removed \n latch.await
    content = content.replace(/\/\/ Korean comment removed\s+latch\.await/g, (match) => {
        return '\n        boolean allCompleted = latch.await';
    });

    // Fix endTime if it's missing part of the line
    content = content.replace(/long endTime =\s+System\.currentTimeMillis\(\);/g, 'long endTime = System.currentTimeMillis();');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + filePath);
}

fixFile('d:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/StressTest.java');
fixFile('d:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/LoadTest.java');
fixFile('d:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/BottleneckIdentificationTest.java');
