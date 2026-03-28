const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..', 'src');

function removeConfigMock(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remove next/config mock line
  const original = content;
  content = content.replace(/vi\.mock\('next\/config'.*?\);\n?/g, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Removed config mock from ${filePath}`);
  }
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
      removeConfigMock(fullPath);
    }
  }
}

console.log('Removing next/config mock from all test files...\n');
processDirectory(TEST_DIR);
console.log('\n✅ Done!');
