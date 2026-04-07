import { test } from '@playwright/test';
import fs from 'fs';

test('inspect-dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle' });
    
    // Capture inner HTML of body or main content
    const html = await page.content();
    fs.writeFileSync('dashboard_inspect.html', html);
    
    // List all buttons and links for selector reference
    const buttons = await page.locator('button, a').allInnerTexts();
    console.log('>>> BUTTONS & LINKS:', buttons);
    
    await page.screenshot({ path: 'dashboard_screenshot.png' });
});
