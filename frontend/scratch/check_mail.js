const { chromium } = require('playwright');
const fs = require('fs');

async function checkMail() {
    const browser = await chromium.launch({ headless: true });
    // Use storage state if available
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    const page = await context.newPage();
    
    console.log("Navigating to Mail History...");
    await page.goto('http://localhost:3001/admin/collaboration/mail-history');
    await page.waitForLoadState('networkidle');
    
    // Wait for potential animation
    await page.waitForTimeout(2000);
    
    console.log("Current Page Title:", await page.title());
    
    // Capture console logs
    page.on("console", msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
    
    // Check for empty state
    const emptyMsg = page.locator('[data-testid="empty-table-msg"]');
    if (await emptyMsg.isVisible()) {
        console.log("Table is EMPTY");
        console.log("Empty Message Text:", await emptyMsg.innerText());
    }
    
    // Check for rows
    const rows = page.locator('[data-testid="mail-item"]');
    const count = await rows.count();
    console.log(`Found ${count} mail items`);
    
    for (let i = 0; i < count; i++) {
        console.log(`Row ${i} text:`, await rows.nth(i).innerText());
    }
    
    // Dump DOM for deep inspection
    fs.writeFileSync('scratch/mail_history_dom.html', await page.content(), 'utf8');
    console.log("DOM dumped to scratch/mail_history_dom.html");
    
    await browser.close();
}

checkMail().catch(console.error);
