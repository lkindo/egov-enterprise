const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', 'src');
// This mock MUST be at the very top of each test file, before any imports
const CONFIG_MOCK = "vi.mock('next/config', () => { const c = () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }); c.default = c; return { default: c }; });\n";

function addConfigMock(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already has next/config mock
  if (content.includes("vi.mock('next/config'")) {
    console.log(`✓ Skipping ${filePath} - already has config mock`);
    return;
  }
  
  // Add at the very beginning (before any imports)
  content = CONFIG_MOCK + content;
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Added config mock to ${filePath}`);
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        processDirectory(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.ts'))) {
      addConfigMock(fullPath);
    }
  }
}

console.log('Adding next/config mock to all test files...\n');
processDirectory(TEST_DIR);
console.log('\n✅ Done!');
