const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', 'src');

// 간단한 mock 패턴 (한 줄)
const CONFIG_MOCK = "vi.mock('next/config', () => ({ default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }) }));\n";

function fixTestFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Remove existing config mocks (any variation)
  content = content.replace(/vi\.mock\('next\/config'.*?\);\n?/g, '');
  
  // Add the simple pattern at the very top
  if (!content.startsWith(CONFIG_MOCK.trim().split(' ')[0])) {
    content = CONFIG_MOCK + content;
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed ${filePath}`);
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
    } else if (entry.isFile() && entry.name.endsWith('.test.tsx')) {
      if (entry.name !== 'Sidebar.test.tsx') {
        if (fixTestFile(fullPath)) fixedCount++;
      }
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      if (fixTestFile(fullPath)) fixedCount++;
    }
  }
  
  return fixedCount;
}

console.log('Applying simple config mock pattern...\n');
const fixedCount = processDirectory(TEST_DIR);
console.log(`\n✅ Fixed ${fixedCount} test files!`);
