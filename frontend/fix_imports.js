const fs = require('fs');
const path = require('path');

const e2eDir = path.join('frontend', 'e2e');
const files = fs.readdirSync(e2eDir).filter(f => f.endsWith('.spec.ts') && !f.endsWith('.bak'));

files.forEach(file => {
  const filepath = path.join(e2eDir, file);
  let content = fs.readFileSync(filepath, 'utf8');

  // Extract all imports (including those that got pushed down)
  const importRegex = /^\s*import\s+.*?;?\s*$/gm;
  let imports = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[0].trim());
  }

  // Ensure playwright import is always present
  if (!imports.some(i => i.includes('@playwright/test'))) {
      imports.push("import { test, expect } from '@playwright/test';");
  }

  // Remove imports from the content
  content = content.replace(importRegex, '');

  // Add unique imports at the very beginning
  const uniqueImports = [...new Set(imports)].join('\n');
  content = uniqueImports + '\n\n' + content;

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`Fixed imports for ${file}`);
});
