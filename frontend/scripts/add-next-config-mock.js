const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', 'src');

// vi.mock for next/config - MUST be at the very top of the file
const CONFIG_MOCK = `vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

`;

function addConfigMock(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Check if already has next/config mock
  if (content.includes("vi.mock('next/config'")) {
    return false;
  }
  
  // Add at the very beginning (before any imports)
  content = CONFIG_MOCK + content;
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ ${path.relative(TEST_DIR, filePath)}`);
  return true;
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
      // Skip Sidebar.test.tsx - it already works
      if (entry.name !== 'Sidebar.test.tsx') {
        if (addConfigMock(fullPath)) fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

console.log('Adding vi.mock(next/config) to all test files...\n');
const fixedCount = processDirectory(TEST_DIR);
console.log(`\n✅ Fixed ${fixedCount} test files!`);
console.log('\nNote: vi.mock must be at the top of each file for hoisting to work.');
