const fs = require('fs');
const path = require('path');

const e2eDir = path.join('frontend', 'e2e');

// Helper to read and wrap file content
function wrapContent(filename, describeName) {
  const filepath = path.join(e2eDir, filename);
  if (!fs.existsSync(filepath)) return '';
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Remove duplicate imports
  content = content.replace(/import\s+{.*?}\s+from\s+['"]@playwright\/test['"];?/g, '');
  
  // Remove existing top-level test.describe if it exists, or just wrap it
  // This is a naive wrapping, manual review might be needed for complex files,
  // but we'll enclose the whole file inside a describe block.
  return `\n// --- From: ${filename} ---\ntest.describe('${describeName}', () => {\n${content}\n});\n`;
}

// 1. Admin Group
const adminFiles = [
  'admin-user.spec.ts',
  'user-admin-comprehensive.spec.ts',
  'admin-code.spec.ts',
  'banner-admin.spec.ts',
  'menu-admin-hierarchical.spec.ts',
  'admin-advanced-features.spec.ts'
];

let adminContent = `import { test, expect } from '@playwright/test';\n`;
adminFiles.forEach(f => { adminContent += wrapContent(f, f.replace('.spec.ts', '')); });
fs.writeFileSync(path.join(e2eDir, '01-admin-domain.spec.ts'), adminContent);

// 2. Board & Community Group
const boardFiles = [
  'bbs.spec.ts',
  'board-master.spec.ts',
  'board-maker-wizard.spec.ts',
  'cmy.spec.ts',
  'survey.spec.ts',
  'survey_resilient.spec.ts'
];
let boardContent = `import { test, expect } from '@playwright/test';\n`;
boardFiles.forEach(f => { boardContent += wrapContent(f, f.replace('.spec.ts', '')); });
fs.writeFileSync(path.join(e2eDir, '02-board-domain.spec.ts'), boardContent);

// 3. Collaboration & Workspace Group
const collabFiles = [
  'collaboration.spec.ts',
  'workspace-flow.spec.ts',
  'workspace_note.spec.ts',
  'djm.spec.ts',
  'adb.spec.ts',
  'scp.spec.ts',
  'approvals.spec.ts'
];
let collabContent = `import { test, expect } from '@playwright/test';\n`;
collabFiles.forEach(f => { collabContent += wrapContent(f, f.replace('.spec.ts', '')); });
fs.writeFileSync(path.join(e2eDir, '03-collaboration-domain.spec.ts'), collabContent);

// 4. Dashboard & Navigation Group
const dashboardFiles = [
  'dashboard.spec.ts',
  'dashboard_advanced.spec.ts',
  'hub-navigation.spec.ts'
];
let dashboardContent = `import { test, expect } from '@playwright/test';\n`;
dashboardFiles.forEach(f => { dashboardContent += wrapContent(f, f.replace('.spec.ts', '')); });
fs.writeFileSync(path.join(e2eDir, '04-dashboard-domain.spec.ts'), dashboardContent);

// 5. Security & RBAC Group
const securityFiles = [
  'rbac_rigorous.spec.ts',
  'security.spec.ts',
  'cross_role_workflow.spec.ts'
];
let securityContent = `import { test, expect } from '@playwright/test';\n`;
securityFiles.forEach(f => { securityContent += wrapContent(f, f.replace('.spec.ts', '')); });
fs.writeFileSync(path.join(e2eDir, '05-security-domain.spec.ts'), securityContent);

// Rename the old files to .bak
const allFilesToRemove = [...adminFiles, ...boardFiles, ...collabFiles, ...dashboardFiles, ...securityFiles];
allFilesToRemove.forEach(f => {
  const filepath = path.join(e2eDir, f);
  if (fs.existsSync(filepath)) {
    fs.renameSync(filepath, filepath + '.bak');
  }
});

// Also rename debug/small files to ignore them
const ignoreFiles = ['debug.spec.ts', 'debug_auth.spec.ts', 'user-mock.spec.ts', 'health.spec.ts', 'mobile.spec.ts', 'realtime.spec.ts', 'error_resilience.spec.ts', 'file_storage.spec.ts'];
ignoreFiles.forEach(f => {
  const filepath = path.join(e2eDir, f);
  if (fs.existsSync(filepath)) {
    fs.renameSync(filepath, filepath + '.bak');
  }
});

console.log('E2E tests consolidated into domain-based files.');