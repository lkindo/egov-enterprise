import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function debug() {
    const browser = await chromium.launch();
    // Load storage state
    const storagePath = path.resolve('playwright/.auth/admin.json');
    console.log(`Using storage: ${storagePath}`);
    
    const context = await browser.newContext({
        storageState: storagePath,
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    const targetUrl = 'http://localhost:3002/admin/community/boards/selectBoardList';
    
    console.log(`Navigating to: ${targetUrl}`);
    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(`Current URL: ${page.url()}`);
        
        // Wait for aside
        console.log('Waiting for aside...');
        await page.waitForSelector('aside', { timeout: 10000 }).catch(() => console.log('Aside not found in 10s'));

        // Take screenshot
        const screenshotPath = path.resolve('debug_screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to: ${screenshotPath}`);
        
        // Check for aside
        const asideExists = await page.locator('aside').isVisible();
        console.log(`Aside visible: ${asideExists}`);
        
        // Check HTML content summary
        const content = await page.content();
        console.log(`HTML length: ${content.length}`);
        if (content.includes('404')) console.log('Found 404 in HTML');
        if (content.includes('Login')) console.log('Found Login in HTML');
        
    } catch (e: any) {
        console.error(`Error: ${e.message}`);
    } finally {
        await browser.close();
    }
}

debug();
