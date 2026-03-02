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
    content = content.replace(/boolean allCompleted = boolean allCompleted =/g, 'boolean allCompleted =');

    // Fix double endTime/testEndTime if they appear together
    // Usually testEndTime is used in some methods, endTime in others. 
    // If both System.currentTimeMillis() are there, we might only need one.
    // But let's just make it clean.

    fs.writeFileSync(filePath, content, 'utf8');
});
