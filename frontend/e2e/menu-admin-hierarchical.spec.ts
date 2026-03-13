import { test, expect } from '@playwright/test';

test.describe('Hierarchical Menu Management', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });

        // Login as admin
        await page.goto('/login');
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');
        
        await expect(page).toHaveURL(/.*dashboard|.*home|.*/, { timeout: 30000 });
        await page.waitForTimeout(1000);
    });

    test('should manage menu hierarchy', async ({ page }) => {
        const rootMenuName = `Root_${Date.now()}`;
        const subMenuName = `Sub_${Date.now()}`;

        // 1. Navigate to Menu Management
        await page.goto('/admin/system/menus');
        await expect(page.getByText('시스템 메뉴 아키텍처')).toBeVisible();

        // 2. Create Root Menu
        await page.click('button:has-text("Create Root Domain")');
        await page.fill('input >> nth=0', rootMenuName); // Entity Name
        await page.click('button:has-text("Complete Extraction")');

        // Verify success and reload (UI calls window.location.reload())
        await expect(page.locator('text=성공적으로 저장되었습니다')).toBeVisible();
        
        // 3. Create Sub Menu under the new Root Menu
        // Find the root menu node and click its "Plus" button
        const rootNode = page.locator('div.group').filter({ hasText: rootMenuName }).first();
        await rootNode.hover();
        await rootNode.locator('button:has(svg.lucide-plus)').click();

        await page.fill('input >> nth=0', subMenuName);
        await page.click('button:has-text("Complete Extraction")');

        await expect(page.locator('text=성공적으로 저장되었습니다')).toBeVisible();

        // 4. Verify Hierarchy (Expand)
        // Ensure root is expanded to see sub
        const expandBtn = rootNode.locator('button:has(svg.lucide-chevron-right)');
        if (await expandBtn.isVisible()) {
            await expandBtn.click();
        }
        await expect(page.locator('div.group').filter({ hasText: subMenuName })).toBeVisible();

        // 5. Update Menu (Edit)
        const subNode = page.locator('div.group').filter({ hasText: subMenuName }).first();
        await subNode.hover();
        await subNode.locator('button:has(svg.lucide-settings)').click();

        await page.fill('input >> nth=0', `${subMenuName}_Updated`);
        await page.click('button:has-text("Sync Matrix")');

        await expect(page.locator('text=성공적으로 저장되었습니다')).toBeVisible();
        await expect(page.locator('div.group')).toContainText('Updated');

        // 6. Delete Menu
        await subNode.hover();
        await subNode.locator('button:has(svg.lucide-trash2)').click();
        
        // Handle custom confirm modal
        await page.click('button:has-text("확인")'); // Assuming confirm modal has "확인" or "Delete"

        await expect(page.locator('text=성공적으로 삭제되었습니다')).toBeVisible();
    });
});
