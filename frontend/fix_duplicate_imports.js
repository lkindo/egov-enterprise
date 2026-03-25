const fs = require('fs');
const path = require('path');

const e2eDir = path.join('frontend', 'e2e');
const files = fs.readdirSync(e2eDir).filter(f => f.endsWith('.spec.ts') && !f.endsWith('.bak'));

files.forEach(file => {
  const filepath = path.join(e2eDir, file);
  let content = fs.readFileSync(filepath, 'utf8');

  // Remove duplicate base-test imports
  let baseTestImportCount = 0;
  content = content.replace(/import\s*{\s*test\s*(?:,\s*expect\s*)?}\s*from\s*['"]\.\/fixtures\/base-test['"];?/g, (match) => {
    baseTestImportCount++;
    return baseTestImportCount === 1 ? match : '';
  });

  // Remove duplicate playwright imports
  let playwrightImportCount = 0;
  content = content.replace(/import\s*{\s*test\s*(?:,\s*expect\s*)?}\s*from\s*['"]@playwright\/test['"];?/g, (match) => {
    playwrightImportCount++;
    return playwrightImportCount === 1 ? match : '';
  });

  // If base-test is imported, remove playwright/test import completely to avoid duplicate identifier 'test'
  if (content.includes("from './fixtures/base-test'")) {
    content = content.replace(/import\s*{\s*test\s*(?:,\s*expect\s*)?}\s*from\s*['"]@playwright\/test['"];?\n?/g, '');
  }

  // Check for path imports duplicate
  if (content.includes("import path from 'path';")) {
      content = content.replace(/import\s+path\s+from\s+['"]path['"];?\n?/g, '');
      content = "import path from 'path';\n" + content;
  }

  // Same for fs
  if (content.includes("import fs from 'fs';")) {
      content = content.replace(/import\s+fs\s+from\s+['"]fs['"];?\n?/g, '');
      content = "import fs from 'fs';\n" + content;
  }

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`Fixed duplicate imports for ${file}`);
});