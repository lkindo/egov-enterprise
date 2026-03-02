const fs = require('fs');

const files = [
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/StressTest.java',
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/LoadTest.java',
    'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/BottleneckIdentificationTest.java'
];

files.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace Korean comments and immediately following code if it was joined
    // This regex looks for // followed by non-ASCII, then greedily captures until it sees a 
    // keyword that definitely should be on a new line but was joined.

    // First, just clean comments like before but globally
    content = content.replace(/\/\/.*[^\x00-\x7F].*/g, '// Korean comment removed');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Cleaned ' + filePath);
});
