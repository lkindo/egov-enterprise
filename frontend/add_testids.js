const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk('frontend/src');

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // 1. Sidebar NavItem - Add testid to sidebar links
  if (file.includes('sidebar.tsx')) {
    // Look for <Link href={href} ... className={cn(...)}
    newContent = newContent.replace(
      /(<Link[^>]*href=\{[a-zA-Z0-9_\.]+\}[^>]*className=\{cn\([^>]*\))/g,
      "$1 data-testid={`sidebar-menu-${title}`}"
    );
    // Look for <button onClick={toggleOpen}
    newContent = newContent.replace(
      /(<button[^>]*onClick=\{toggleOpen\}[^>]*className=\{cn\([^>]*\))/g,
      "$1 data-testid={`sidebar-accordion-${title}`}"
    );
  }

  // 2. User Management - UserManageClient.tsx
  if (file.includes('UserManageClient.tsx')) {
    newContent = newContent.replace(
      /<Input([^>]*)placeholder=\{([^}]*)\}([^>]*)>/g,
      "<Input$1placeholder={$2}$3 data-testid=\"user-search-input\" />"
    );
    newContent = newContent.replace(
      /<Button([^>]*)onClick=\{handleOpenProvision\}([^>]*)>/g,
      "<Button$1onClick={handleOpenProvision}$2 data-testid=\"user-provision-btn\">"
    );
    newContent = newContent.replace(
      /<Table([^>]*)>/g,
      "<Table$1 data-testid=\"user-data-table\">"
    );
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
    console.log(`Added data-testid to: ${file}`);
  }
});

console.log(`Total files modified with data-testid: ${modifiedCount}`);
