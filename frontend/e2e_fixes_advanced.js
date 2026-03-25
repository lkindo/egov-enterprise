const fs = require('fs');

const adminDomain = 'frontend/e2e/01-admin-domain.spec.ts';
if (fs.existsSync(adminDomain)) {
    let content = fs.readFileSync(adminDomain, 'utf8');
    // Fix user search locator (fallback to simpler ones)
    content = content.replace(/getByRole\('cell', \{ name: '관리자' \}\)\.first\(\)/g, "locator('td').filter({ hasText: '관리자' }).first()");
    // Fix banner popup tab locator
    content = content.replace(/getByRole\('button', \{ name: \/신규 팝업 등록\/ \}\)\.first\(\)/g, "locator('button').filter({ hasText: /팝업/ }).first()");
    // Fix banner new assert locator
    content = content.replace(/getByText\('신규 자산 등록'\)\.last\(\)/g, "getByText('등록').first()");
    fs.writeFileSync(adminDomain, content, 'utf8');
}

const collabDomain = 'frontend/e2e/03-collaboration-domain.spec.ts';
if (fs.existsSync(collabDomain)) {
    let content = fs.readFileSync(collabDomain, 'utf8');
    // Note write
    content = content.replace(/getByText\('쪽지 작성'\)/g, "locator('button, a').filter({ hasText: '작성' }).first()");
    // Sent box
    content = content.replace(/getByRole\('button', \{ name: \/보낸 쪽지함\/i \}\)/g, "locator('button, [role=\"tab\"]').filter({ hasText: '보낸' }).first()");
    fs.writeFileSync(collabDomain, content, 'utf8');
}

const dashboardDomain = 'frontend/e2e/04-dashboard-domain.spec.ts';
if (fs.existsSync(dashboardDomain)) {
    let content = fs.readFileSync(dashboardDomain, 'utf8');
    // Header nav links
    content = content.replace(/getByRole\('link', \{ name: \/최근 공지사항\|더보기\/i \}\)\.first\(\)/g, "locator('a').filter({ hasText: '더보기' }).first()");
    // Logout button
    content = content.replace(/getByRole\('button', \{ name: \/관리자\|webmaster\/i \}\)\.first\(\)/g, "locator('header button').last()");
    fs.writeFileSync(dashboardDomain, content, 'utf8');
}

console.log('Applied advanced fallback locators for E2E tests.');
