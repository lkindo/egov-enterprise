const fs = require('fs');
const path = require('path');

const f = 'frontend/e2e/03-board-community.spec.ts';
const fullPath = path.resolve(f);

let content = fs.readFileSync(fullPath, 'utf8');
// Use a regex that matches the broken line even with different garbage characters
const brokenLineRegex = /await expect\(page\.getByText\(\/\?.*?\?\/\)\)\.toBeVisible\(\{ timeout: 15000 \}\);/;
if (brokenLineRegex.test(content)) {
  content = content.replace(brokenLineRegex, 
    'await expect(page.locator("text=/성공적으로|완료되었습니다/").first()).toBeVisible({ timeout: 15000 });');
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Fixed ${f}`);
} else {
  console.log(`Pattern not found in ${f}`);
  // Try a simpler replace if the above fails
  const lines = content.split('\n');
  const index = lines.findIndex(l => l.includes('getByText') && l.includes('timeout: 15000') && l.includes('?'));
  if (index !== -1) {
    lines[index] = '                await expect(page.locator("text=/성공적으로|완료되었습니다/").first()).toBeVisible({ timeout: 15000 });';
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
    console.log(`Fixed line ${index + 1} manually in ${f}`);
  }
}
