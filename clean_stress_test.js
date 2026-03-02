const fs = require('fs');

const file = 'd:/project/egov-enterprise/api-server/src/test/java/com/company/project/performance/StressTest.java';
let content = fs.readFileSync(file, 'utf8');

// Remove all single-line comments that contain non-ASCII characters
content = content.replace(/\/\/.*[^\x00-\x7F].*/g, '// Korean comment removed');

fs.writeFileSync(file, content, 'utf8');
console.log('Cleaned StressTest.java from Korean comments');
