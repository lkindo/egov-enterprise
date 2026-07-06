const fs = require('fs');
const path = require('path');

const f = 'frontend/e2e/scripts/cleanup-db.ts';
const fullPath = path.resolve(f);

let content = fs.readFileSync(fullPath, 'utf8');

// Replace bbsNm with bbsTtl and handle undefined
content = content.replace(/b\.bbsNm\.startsWith/g, '(b.bbsTtl || b.bbsNm || "").startsWith');
content = content.replace(/board\.bbsNm/g, '(board.bbsTtl || board.bbsNm)');

// Also check for other fields that might have changed
content = content.replace(/pollNm/g, '(pollTtl || pollNm)');

fs.writeFileSync(fullPath, content, 'utf8');
console.log(`Fixed ${f}`);
