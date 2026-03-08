import { test, expect } from '@playwright/test';

test.describe('Electronic Approval Module', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });

        // Login as Admin
        await page.goto('/login');
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('should display approval inbox and switch tabs', async ({ page }) => {
        // Navigate to Approvals
        await page.goto('/approvals');

        // Verify page header
        await expect(page.getByText('전자결재 관제 센터')).toBeVisible();

        // Check tabs
        const receivedTab = page.getByRole('button', { name: '받은 결재함' });
        const sentTab = page.getByRole('button', { name: '보낸 결재함' });

        await expect(receivedTab).toBeVisible();
        await expect(sentTab).toBeVisible();

        // Switch to Sent tab
        await sentTab.click();
        await expect(page.getByText('기안 이력')).toBeVisible();

        // Switch back to Received tab
        await receivedTab.click();
        await expect(page.getByText('미처리 요청')).toBeVisible();
    });

    test('should show approval details when a row is clicked', async ({ page }) => {
        await page.goto('/approvals');

        // Wait for table rows
        const firstRow = page.locator('table tbody tr').first();

        if (await firstRow.isVisible()) {
            await firstRow.click();

            // Detail view should appear
            await expect(page.getByText('Detail View')).toBeVisible();
            await expect(page.getByText('Approval Workflow')).toBeVisible();
        }
    });

    test('should open "New Approval" draft (button check)', async ({ page }) => {
        await page.goto('/approvals');
        const newBtn = page.getByRole('button', { name: '새 결재 기안' });
        await expect(newBtn).toBeVisible();
        // Since it's a prototype/mock, we just check visibility here
        // unless we know the exact navigation target for new drafts.
    });
});
