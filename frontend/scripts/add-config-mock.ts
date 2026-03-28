// add-config-mock.ts - Automatically add next/config mock to all test files
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(__dirname, 'src');
const CONFIG_MOCK = `vi.mock('next/config', () => ({ default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }) }));\n`;

function addConfigMock(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already has next/config mock
  if (content.includes("vi.mock('next/config'") || content.includes('next/config')) {
    console.log(`✓ Skipping ${filePath} - already has config mock`);
    return;
  }
  
  // Find the position after the last import
  const importRegex = /^(import[\s\S]*?from\s+['"].*?['"];?\n)+/;
  const match = content.match(importRegex);
  
  if (match) {
    const insertPos = match.index! + match[0].length;
    content = content.slice(0, insertPos) + CONFIG_MOCK + content.slice(insertPos);
  } else {
    // No imports found, add at the beginning after vitest imports
    content = CONFIG_MOCK + content;
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Added config mock to ${filePath}`);
}

function processDirectory(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        processDirectory(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.test.tsx')) {
      addConfigMock(fullPath);
    }
  }
}

console.log('Adding next/config mock to all test files...\n');
processDirectory(TEST_DIR);
console.log('\n✅ Done!');
