const fs = require('fs');

const files = [
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/StressTest.java',
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/LoadTest.java',
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/BottleneckIdentificationTest.java'
];

files.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix double boolean allCompleted
    content = content.replace(/boolean allCompleted = latch\.await\((.*?)\);\s+boolean allCompleted = latch\.await\((.*?)\);/g, 'boolean allCompleted = latch.await($1);');

    // Fix double endTime
    content = content.replace(/long endTime = System\.currentTimeMillis\(\);\s+long endTime = System\.currentTimeMillis\(\);/g, 'long endTime = System.currentTimeMillis();');

    // Fix double testEndTime
    content = content.replace(/long testEndTime = System\.currentTimeMillis\(\);\s+long testEndTime = System\.currentTimeMillis\(\);/g, 'long testEndTime = System.currentTimeMillis();');

    // Fix mixed endTime and testEndTime if they are identical
    content = content.replace(/long endTime = System\.currentTimeMillis\(\);\s+long testEndTime = System\.currentTimeMillis\(\);/g, 'long endTime = System.currentTimeMillis();\n        long testEndTime = endTime;');

    fs.writeFileSync(filePath, content, 'utf8');
});
