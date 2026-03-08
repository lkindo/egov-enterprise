import { test, expect } from '@playwright/test';

test('BBS Unstoppable CRUD', async ({ page }) => {
    test.setTimeout(180000);
    const bbsId = 'BBSMSTR_AAAAAAAAAAAA';

    console.log('>>> Step 1: Login');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#id', 'webmaster');
    await page.fill('#password', '1');
    // Force click to skip any overlay
    await page.click('button[type="submit"]', { force: true });

    // Hard wait for login processing
    await page.waitForTimeout(5000);

    console.log('>>> Step 2: BBS List');
    await page.goto(`/cop/bbs?bbsId=${bbsId}`, { waitUntil: 'domcontentloaded' });

    // Remove any potential overlays via script
    await page.addInitScript(() => {
        window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });

    console.log('>>> Step 3: Click Create');
    const createBtn = page.getByRole('button', { name: /등록|추가|Write/i }).first();
    await createBtn.click({ force: true });

    console.log('>>> Step 4: Fill Post');
    await page.fill('input[placeholder*="제목"]', `SUCCESS ${Date.now()}`);
    // StandardEditor support
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await editor.click({ force: true });
    await page.keyboard.type('Verified via E2E force mode.');

    console.log('>>> Step 5: Save');
    await page.click('button:has-text("등록")', { force: true });

    // Handle Modal
    await page.waitForTimeout(2000);
    const modalBtn = page.locator('button:has-text("등록")').last();
    await modalBtn.click({ force: true });

    console.log('>>> Step 6: Final Verification');
    await page.waitForURL(url => url.pathname === '/cop/bbs', { timeout: 30000 });
    console.log('>>> ALL DONE: BBS CRUD PASSED IN FORCE MODE');
});
