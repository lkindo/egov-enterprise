const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', 'src');

// 성공적인 테스트 패턴 (Sidebar.test.tsx 기반)
const SUCCESS_PATTERN = `vi.mock('next/config', () => { const c = () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }); c.default = c; return { default: c }; });
`;

function fixTestFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // 1. Remove existing config mocks (any variation)
  content = content.replace(/vi\.mock\('next\/config'.*?\);\n?/g, '');
  
  // 2. Add the successful pattern at the very top
  if (!content.startsWith(SUCCESS_PATTERN.trim().split('\n')[0])) {
    content = SUCCESS_PATTERN + content;
  }
  
  // 3. Ensure vi is imported from vitest
  if (!content.includes("import { vi") && !content.includes("from 'vitest'")) {
    // Add vi import to existing vitest import
    content = content.replace(
      /import { (.+?) } from ['"]vitest['"]/g,
      (match, imports) => {
        if (!imports.includes('vi')) {
          return `import { ${imports}, vi } from 'vitest'`;
        }
        return match;
      }
    );
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

console.log('Applying successful test pattern from Sidebar.test.tsx...\n');
const fixedCount = processDirectory(TEST_DIR);
console.log(`\n✅ Fixed ${fixedCount} test files!`);
console.log('\nPattern applied:');
console.log('- next/config mock at the very top');
console.log('- Proper vi import from vitest');
console.log('- Consistent mock structure');
