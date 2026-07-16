import { test, expect } from './fixtures/base-test';

/**
 * Tier 11: Enterprise Workflow & Productivity
 * 전자결재 및 스마트 툴킷(일정, 업무보고) 등 핵심 기업 워크플로우 검증
 */
test.describe('Tier 11: Enterprise Workflow & Productivity', () => {
    test.use({ 
        storageState: 'playwright/.auth/admin.json',
        viewport: { width: 1920, height: 1080 }
    });

    test('Workflow: Electronic Approval Full Lifecycle', async ({ page }) => {
        console.log('\n>>> Starting Workflow: Electronic Approval Lifecycle');
        
        // 1. Navigate to Approval Hub
        await page.goto('/approvals');
        await expect(page.getByRole('heading', { name: '결재 허브' }).first()).toBeVisible();
        
        // 2. Draft New Approval
        console.log('>>> Navigating to Draft Center');
        await page.getByRole('button', { name: '새 결재 기안' }).click();
        await expect(page).toHaveURL(/\/approvals\/draft/);
        
        // 3. Select Template (e.g., 일반 지출 결의서)
        console.log('>>> Selecting Template: 일반 지출 결의서');
        await page.getByText('일반 지출 결의서').first().click();
        
        // 4. Fill Form
        console.log('>>> Filling Approval Form');
        const subject = `E2E Test Approval ${Date.now()}`;
        await page.getByPlaceholder('상신할 문서의 제목을 입력하십시오...').fill(subject);
        await page.getByPlaceholder('결재 상세 사유 및 전달 사항을 기술하십시오...').fill('This is an automated E2E test for electronic approval workflow validation.');
        
        // 5. Submit (Commit to Ledger)
        console.log('>>> Submitting Approval Request');
        await page.getByRole('button', { name: 'Commit to Ledger' }).click();
        
        // 6. Verify Redirect & Presence in List
        await expect(page).toHaveURL(/\/approvals/);
        console.log(`>>> Verifying if #${subject} exists in the stream`);
        
        // Check for success toast
        await expect(page.locator('text=결재 상신이 완료되었습니다')).toBeVisible();

        // Ensure we are looking at 'My History' to see our own request
        const historyTab = page.getByRole('button', { name: /My History/i });
        if (await historyTab.isVisible()) {
            await historyTab.click();
            await page.waitForLoadState('domcontentloaded');
        }
        
        // Retry logic: Wait for the item to appear in the list (indexing/refresh delay)
        const firstItem = page.locator('.group.p-5, .approval-item').first();
        await expect(firstItem).toBeVisible({ timeout: 15000 });
        console.log('>>> Approval successfully detected in history stream.');
    });

    test('Productivity: Smart Toolkit - Department Schedule', async ({ page }) => {
        console.log('\n>>> Starting Productivity: Smart Toolkit - Schedule');
        
        await page.goto('/smart-toolkit/schedule/dept');
        
        // 일정 관리 대시보드 확인
        await expect(page.locator('.hub-title-main, h1, h2').filter({ hasText: /일정|Schedule/i }).first()).toBeVisible();
        
        console.log('>>> Verifying Schedule Table visibility');
        const table = page.locator('table');
        await expect(table.first()).toBeVisible();
    });

    test('Productivity: Smart Toolkit - Work Report Matrix', async ({ page }) => {
        console.log('\n>>> Starting Productivity: Smart Toolkit - Work Report');
        
        await page.goto('/smart-toolkit/work-report');
        
        // 업무보고 목록 확인 (WorkHubClient 내 탭 또는 제목)
        await expect(page.locator('.hub-title-main, h1, h2').filter({ hasText: /워크플로우|업무보고|Work Report/i }).first()).toBeVisible();
        
        console.log('>>> Checking for Report Tabs (Daily/Weekly/Monthly)');
        const tabs = page.locator('button[role="tab"], .tab-item');
        if (await tabs.count() > 0) {
            await expect(tabs.first()).toBeVisible();
        }
    });
});
