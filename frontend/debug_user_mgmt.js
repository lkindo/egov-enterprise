
const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: 'playwright/.auth/admin.json',
    baseURL: 'http://localhost:3001'
  });
  const page = await context.newPage();

  console.log('>>> Navigating to User Management');
  await page.goto('/admin/user/users', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'admin_user_list.png' });

  console.log('>>> Opening Add User Modal');
  const addBtn = page.locator('button').filter({ hasText: /등록|Add/i }).first();
  await addBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'admin_user_add_modal.png' });

  console.log('>>> Filling User Info');
  const testId = `debug_user_${Date.now()}`;
  await page.locator('input[name="userId"]').fill(testId);
  await page.locator('input[name="userNm"]').fill('Debug User');
  await page.locator('input[name="password"]').fill('test1234!');
  await page.locator('input[name="emailAdres"]').fill('debug@example.com');
  await page.screenshot({ path: 'admin_user_filled.png' });

  console.log('>>> Clicking Submit');
  await page.locator('button:has-text("등록"), button:has-text("확인"), button[type="submit"]').first().click();
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'admin_user_after_submit.png' });
  
  console.log('>>> Content after submit:');
  const content = await page.content();
  console.log(content.substring(0, 1000));

  await browser.close();
})();
