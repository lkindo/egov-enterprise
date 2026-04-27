import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

async function run() {
    const browser = await chromium.launch();
    const storageState = path.resolve('playwright/.auth/admin.json');
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    
    console.log('>>> Navigating to /admin...');
    await page.goto('http://localhost:3001/admin');
    await page.waitForTimeout(3000);
    
    console.log('>>> Running Axe audit...');
    const results = await new AxeBuilder({ page })
        .disableRules(['heading-order'])
        .analyze();
    
    const outputPath = path.resolve('a11y-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results.violations, null, 2));
    console.log(`>>> Violations saved to ${outputPath}`);
    
    await browser.close();
}

run().catch(console.error);
