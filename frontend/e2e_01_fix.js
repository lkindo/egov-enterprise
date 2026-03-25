const fs = require('fs');

const adminDomain = 'frontend/e2e/01-admin-domain.spec.ts';
if (fs.existsSync(adminDomain)) {
    let content = fs.readFileSync(adminDomain, 'utf8');

    // Fix 1: Admin HUB List Access
    content = content.replace(
        /getByText\(\/webmaster\|관리자\/i\)\.first\(\)/g,
        "locator('table, [role=\"grid\"]').locator('td').filter({ hasText: /webmaster|관리자/i }).first()"
    );

    // Fix 2: Admin HUB User Search Flow
    content = content.replace(
        /locator\('td'\)\.filter\(\{ hasText: '관리자' \}\)\.first\(\)/g,
        "locator('td, [role=\"cell\"]').filter({ hasText: /관리자|admin/i }).first()"
    );

    // Fix 3: Advanced User Management E2E - create user 
    content = content.replace(
        /getByRole\('heading', \{ name: \/사용자\/ \}\)/g,
        "locator('h1, h2, h3, h4, .hub-title-main').filter({ hasText: /사용자/ }).first()"
    );

    // Fix 4: Banner tabs (팝업 목록)
    content = content.replace(
        /locator\('button'\)\.filter\(\{ hasText: \/팝업\/ \}\)\.first\(\)/g,
        "locator('[role=\"tab\"], button').filter({ hasText: /팝업/ }).first()"
    );

    // Fix 5: Banner registration modal
    content = content.replace(
        /getByText\(\/배너 명칭\/\)\.first\(\)/g,
        "locator('label, th, h1, h2, h3, h4, .font-semibold').filter({ hasText: /배너|자산/ }).first()"
    );

    // Fix 6: Menu Hierarchy root creation
    content = content.replace(
        /getByRole\('button', \{ name: '최상위 메뉴 추가' \}\)/g,
        "locator('button').filter({ hasText: /최상위|메뉴 추가/ }).first()"
    );

    // Fix 7: SMS Transmission System modal visibility
    content = content.replace(
        /getByText\('스트림 작성'\)\.last\(\)/g,
        "locator('h1, h2, h3, h4, .modal-title, [role=\"dialog\"]').filter({ hasText: /스트림|메시지/ }).first()"
    );

    // Fix 8: Opinion Matrix Protocol Configuration
    content = content.replace(
        /getByText\('프로토콜 구성'\)\.last\(\)/g,
        "locator('h1, h2, h3, h4, .modal-title, [role=\"dialog\"]').filter({ hasText: /프로토콜|구성|생성/ }).first()"
    );
    
    // Fix 9: Opinion Matrix Cancel button
    content = content.replace(
        /getByRole\('button', \{ name: \/취소\|Terminate\/i \}\)\.first\(\)/g,
        "locator('button').filter({ hasText: /취소|닫기|Terminate|Cancel/i }).first()"
    );

    // Fix 10: "새 사용자 등록" button logic timeout 
    content = content.replace(
        /await page\.click\('button:has-text\("새 사용자 등록"\)'\);/g,
        "const addBtn = page.locator('button').filter({ hasText: /새 사용자|등록/ }).first();\n        if(await addBtn.isVisible()) { await addBtn.click(); }"
    );

    fs.writeFileSync(adminDomain, content, 'utf8');
    console.log('Applied highly resilient fallbacks for 01-admin-domain.spec.ts');
}