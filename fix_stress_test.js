const fs = require('fs');

const file = 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/StressTest.java';
let content = fs.readFileSync(file, 'utf8');

// Fix the joined lines after Korean comments
// Pattern: // ... boolean allCompleted = ...; // ... long endTime = 
content = content.replace(/\/\/.*boolean allCompleted = (latch\.await\(.*?\)); \/\/.*long endTime =/g, (match, p1) => {
    return `\n        boolean allCompleted = ${p1};\n        long endTime =`;
});

// Also fix potential issue where long endTime = is separated from System.currentTimeMillis()
content = content.replace(/long endTime =\s+System\.currentTimeMillis\(\);/g, 'long endTime = System.currentTimeMillis();');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed StressTest.java');
