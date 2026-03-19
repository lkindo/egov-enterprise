const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const storagePath = 'd:/project/egov-enterprise/frontend/playwright/.auth/admin.json';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        storageState: fs.existsSync(storagePath) ? storagePath : undefined
    });
    const page = await context.newPage();

    console.log("--- User Management ---");
    await page.goto('http://localhost:3001/admin/user/manage');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'd:/project/egov-enterprise/user_manage_debug.png', fullPage: true });
    console.log("Title:", await page.title());
    console.log("Current URL:", page.url());
    const user_buttons = await page.getByRole('button').all();
    console.log("Buttons:");
    for (const btn of user_buttons) {
        console.log(" -", await btn.innerText());
    }

    console.log("\n--- Online Poll ---");
    await page.goto('http://localhost:3001/admin/survey/polls');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'd:/project/egov-enterprise/poll_manage_debug.png', fullPage: true });
    console.log("Current URL:", page.url());
    const poll_buttons = await page.getByRole('button').all();
    console.log("Buttons:");
    for (const btn of poll_buttons) {
        console.log(" -", await btn.innerText());
    }

    await browser.close();
})();
