const fs = require('fs');

const data = JSON.parse(fs.readFileSync('d:\\project\\egov-enterprise\\db-field-mismatch-report.json', 'utf8'));
const authMismatches = data.filter(item => item.filePath.includes('\\domain\\auth\\'));

console.log(JSON.stringify(authMismatches, null, 2));
