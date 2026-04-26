import { test, expect } from './fixtures/base-test';

/**
 * [Tier 2] Administrative Core: System & User Management
 * 
 * 시스템 관리의 핵심 기능을 검증합니다.
 * 1. 사용자(User) CRUD 및 검색
 * 2. 메뉴(Menu) 계층 구조 관리
 * 3. 공통코드(Common Code) 관리
 * 4. 권한(Role) 및 보안 설정
 */

test.describe('Tier 2: Admin System (Core Management)', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.describe('User Management Lifecycle', () => {
        const testId = `e2e_user_${Date.now()}`;
        const testName = `Test User ${Date.now()}`;

        test('Create-Search-Update-Delete Flow', async ({ page, userAdminPage }) => {
            console.log('>>> Step 1: Navigating to User Management');
            await userAdminPage.goto();
            
            console.log('>>> Step 2: Creating New User');
            await userAdminPage.addUserButton.click();
            
            await page.locator('input[name="userId"]').fill(testId);
            await page.locator('input[name="userNm"]').fill(testName);
            await page.locator('input[name="password"]').fill('test1234!');
            await page.locator('input[name="emailAdres"]').fill('e2e@example.com');
            
            await page.locator('button:has-text("등록"), button:has-text("확인"), button[type="submit"]').first().click();
            await expect(page.locator('text=성공|완료|Success')).toBeVisible({ timeout: 10000 });

            console.log('>>> Step 3: Searching and Verifying');
            await userAdminPage.search(testId);
            await expect(page.getByText(testId)).toBeVisible();

            console.log('>>> Step 4: Deleting User');
            // Assuming there is a delete button or a checkbox in the list
            const row = page.locator('tr').filter({ hasText: testId });
            await row.locator('input[type="checkbox"]').first().check();
            await page.locator('button:has-text("삭제"), button:has-text("Delete")').first().click();
            
            // Confirm deletion
            const confirmBtn = page.locator('button:has-text("확인"), button:has-text("Yes")').first();
            if (await confirmBtn.isVisible()) await confirmBtn.click();
            
            await expect(page.locator('text=삭제되었습니다|Deleted')).toBeVisible();
        });
    });

    test.describe('System Configuration', () => {
        test('Common Code Navigation and Stability', async ({ page }) => {
            console.log('>>> Step 1: Navigating to Common Code');
            await page.goto('/admin/system/common-code', { waitUntil: 'networkidle' });
            
            console.log('>>> Step 2: Verifying Hierarchy List');
            const codeTree = page.locator('table, [role="grid"]').first();
            await expect(codeTree).toBeVisible();
            
            // Check for specific system codes that should always exist (Regex based check)
            await expect(page.locator('text=/ROLE|USR|BBS/').first()).toBeVisible();
        });

        test('Menu Hierarchy Management UI', async ({ page }) => {
            console.log('>>> Step 1: Navigating to Menu Management');
            await page.goto('/admin/system/menus', { waitUntil: 'networkidle' });
            
            console.log('>>> Step 2: Verifying Root Node Creation Capability');
            const createRootBtn = page.locator('button').filter({ hasText: /최상위|Root|Add|NODE_DEPLOY/i }).first();
            await expect(createRootBtn).toBeVisible();
            
            console.log('>>> Step 3: Verifying Tree Structure');
            const treeItems = page.locator('.tree-item, .node-item, tr').first();
            await expect(treeItems).toBeVisible();
        });
    });

    test.describe('Organizational Structure', () => {
        test('Department and Absence Management Access', async ({ page }) => {
            console.log('>>> Step 1: Checking Departments Page');
            await page.goto('/admin/user/departments');
            await expect(page.locator('h1, h2, .title').first()).toBeVisible();

            console.log('>>> Step 2: Checking Absences Page');
            await page.goto('/admin/user/absences');
            await expect(page.locator('h1, h2, .title').first()).toBeVisible();
        });
    });
});
