const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', 'src');

function removeConfigMock(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Remove vi.mock for next/config (multi-line)
  content = content.replace(/vi\.mock\('next\/config',\s*\(\)\s*=>\s*\({[\s\S]*?}\)\);\s*\n/g, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ ${path.relative(TEST_DIR, filePath)}`);
    return true;
  }
  return false;
}

function processDirectory(dir) {
  let fixedCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        fixedCount += processDirectory(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.ts'))) {
      // Skip Sidebar.test.tsx - it doesn't have the mock
      if (removeConfigMock(fullPath)) fixedCount++;
    }
  }
  
  return fixedCount;
}

console.log('Removing duplicate vi.mock(next/config) from test files...\n');
const fixedCount = processDirectory(TEST_DIR);
console.log(`\n✅ Removed from ${fixedCount} test files!`);
console.log('\nNote: The global mock in vitest.setup.ts will be used instead.');
