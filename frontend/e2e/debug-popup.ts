import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function debugPopup() {
    console.log('Starting debug session...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Disable onboarding tour via localStorage
    await page.addInitScript(() => {
        window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });

    // Enable console and network logging
    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('request', request => {
        if (request.url().includes('/api/v1')) {
            console.log(`[Network Request] ${request.method()} ${request.url()}`);
        }
    });
    page.on('response', response => {
        if (response.url().includes('/api/v1')) {
            console.log(`[Network Response] ${response.status()} ${response.url()}`);
        }
    });

    try {
        console.log('Navigating to login...');
        await page.goto('http://localhost:3001/login');
        await page.fill('input[name="id"]', 'webmaster');
        await page.fill('input[name="password"]', '1');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/admin/work-hub');
        console.log('Logged in successfully');

        console.log('Navigating to Banner/Popup Admin...');
        await page.goto('http://localhost:3001/admin/system/banner');
        await page.waitForLoadState('networkidle');

        console.log('Opening popup creation modal...');

        console.log('Opening popup creation modal...');
        await page.click('button:has-text("팝업 설정")');
        await page.click('button:has-text("팝업 등록")');

        console.log('Filling form...');
        await page.getByPlaceholder(/팝업 제목|Header/i).fill('E2E Debug Popup');
        
        // Date inputs
        const startDateInput = page.locator('div').filter({ hasText: /^게시 시작 시점/ }).locator('input').first();
        const endDateInput = page.locator('div').filter({ hasText: /^게시 종료 시점/ }).locator('input').first();
        await startDateInput.fill('2026-05-01');
        await endDateInput.fill('2026-12-31');

        await page.locator('div').filter({ hasText: /^가로 좌표/ }).locator('input').first().fill('100');
        await page.locator('div').filter({ hasText: /^세로 좌표/ }).locator('input').first().fill('100');
        await page.locator('div').filter({ hasText: /^가로 폭/ }).locator('input').first().fill('400');
        await page.locator('div').filter({ hasText: /^세로 높이/ }).locator('input').first().fill('300');

        console.log('Uploading image...');
        const os = require('os');
        const dummyPath = path.join(os.tmpdir(), 'e2e-dummy.png');
        fs.writeFileSync(dummyPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
        await page.setInputFiles('input[type="file"]', dummyPath);
        await page.waitForTimeout(1000);

        console.log('Submitting form...');
        // Find the submit button in the modal
        const submitBtn = page.locator('button:has-text("운영 배포")').first();
        await submitBtn.click();
        
        console.log('Waiting for response...');
        // Wait for the server action response or toast
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: 'debug-result.png', fullPage: true });
        console.log('Screenshot saved to debug-result.png');

    } catch (error) {
        console.error('Debug session failed:', error);
        await page.screenshot({ path: 'debug-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

debugPopup();
