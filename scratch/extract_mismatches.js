const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('d:\\project\\egov-enterprise\\db-field-mismatch-report.json', 'utf8'));
const files = new Set();
data.forEach(item => {
    files.add(item.filePath);
});

console.log("Unique files with mismatches:");
Array.from(files).forEach(f => console.log(f));
