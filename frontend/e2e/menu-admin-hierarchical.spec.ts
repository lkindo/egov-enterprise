import { test, expect } from '@playwright/test';

test.describe('Hierarchical Menu Management', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });

        // Authentication is handled by storageState in playwright.config.ts
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should manage menu hierarchy', async ({ page }) => {
        const rootMenuName = `Root_${Date.now()}`;
        const subMenuName = `Sub_${Date.now()}`;

        // 1. Navigate to Menu Management
        await page.goto('/admin/system/menus');
        await expect(page.getByText('네비게이션 정보 아키텍처')).toBeVisible({ timeout: 15000 });

        // 2. Create Root Menu
        const createRootBtn = page.getByRole('button', { name: '최상위 메뉴 추가' });
        await createRootBtn.click();
        
        await expect(page.getByText('신규 네비게이션 노드 설계')).toBeVisible();
        await page.fill('input >> nth=0', rootMenuName); 
        await page.getByRole('button', { name: '노드 설계' }).click();

        // Data refreshes via router.refresh(). Wait for the new node to appear in the list.
        await expect(page.getByText(rootMenuName).first()).toBeVisible({ timeout: 20000 });
        
        // 3. Create Sub Menu under the new Root Menu
        const rootNodeRow = page.locator('div.group').filter({ hasText: rootMenuName }).first();
        await rootNodeRow.scrollIntoViewIfNeeded();
        
        // Target the Plus button explicitly
        const plusButton = rootNodeRow.locator('button:has(svg.lucide-plus)').first();
        await plusButton.click({ force: true });

        await expect(page.getByText('신규 네비게이션 노드 설계')).toBeVisible();
        await page.fill('input >> nth=0', subMenuName);
        await page.getByRole('button', { name: '노드 설계' }).click();
        
        await expect(page.getByText(subMenuName).first()).toBeVisible({ timeout: 20000 });

        // 4. Verify Hierarchy
        await expect(rootNodeRow).toContainText(subMenuName);

        // 5. Update Menu (Edit)
        const subNodeRow = page.locator('div.group').filter({ hasText: subMenuName }).first();
        const editButton = subNodeRow.locator('button:has(svg.lucide-settings)').first();
        await editButton.click({ force: true });

        await expect(page.getByText('메뉴 노드 구성 속성 수정')).toBeVisible();
        await page.fill('input >> nth=0', `${subMenuName}_Updated`);
        await page.getByRole('button', { name: '구조 업데이트' }).click();

        await expect(page.getByText(`${subMenuName}_Updated`).first()).toBeVisible({ timeout: 20000 });

        // 6. Delete Menu
        const updatedSubNodeRow = page.locator('div.group').filter({ hasText: `${subMenuName}_Updated` }).first();
        const deleteButton = updatedSubNodeRow.locator('button:has(svg.lucide-trash2)').first();
        await deleteButton.click({ force: true });
        
        // Handle custom confirm modal
        await page.click('button:has-text("확인")'); 

        await expect(page.getByText(`${subMenuName}_Updated`)).not.toBeVisible({ timeout: 15000 });
    });
});
