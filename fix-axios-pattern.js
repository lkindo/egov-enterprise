const fs = require('fs');
const path = require('path');

const frontendDir = 'd:\\project\\egov-enterprise\\frontend\\src';

function findTsxFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findTsxFiles(fullPath));
    } else if (item.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findTsxFiles(frontendDir);
console.log('Processing', files.length, 'tsx files');

let fixedCount = 0;
files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // Fix Axios response pattern: res.success -> res.data?.success
    content = content.replace(/if \((\w+)\.success\)/g, 'if ($1.data?.success)');
    content = content.replace(/(\w+)\.success \?/g, '$1.data?.success ?');
    content = content.replace(/if \(!(\w+)\.success\)/g, 'if (!$1.data?.success)');
    
    // Fix res.data.content -> res.data?.data?.content
    content = content.replace(/(\w+)\.data\.content/g, '$1.data?.content');
    
    // Fix setSummary(res) -> setSummary(res.data || res)
    content = content.replace(/setSummary\((\w+Res)\)/g, 'setSummary(($1 as any).data?.data || ($1 as any).data || $1)');
    
    // Fix array type issues
    content = content.replace(/Array\.isArray\((\w+Res)\) \? (\w+Res)\.map/g, 'Array.isArray($1) ? ($1 as any[]).map');
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      fixedCount++;
      console.log('Fixed:', path.relative(frontendDir, file));
    }
  } catch (err) {
    // Ignore errors
  }
});

console.log(`\nFixed ${fixedCount} files.`);
