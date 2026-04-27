import { test, expect } from './fixtures/base-test';

/**
 * [Tier 2] Administrative Core: System & User Management
 */

test.describe('Tier 2: Admin System (Core Management)', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.describe('User Management Lifecycle', () => {
        // Use unique identifiers to avoid collision in parallel runs
        const testName = `e2e_${Math.random().toString(36).substring(7)}`;
        const testId = testName;

        test('Create-Search-Update-Delete Flow', async ({ page }) => {
            console.log(`\n>>> Starting User Lifecycle for: ${testName}`);
            
            console.log('>>> Step 1: Navigating to User Management');
            await page.goto('/admin/user/manage');
            await expect(page.locator('h1:has-text("Identity"), h1:has-text("사용자")').first()).toBeVisible({ timeout: 20000 });
            
            console.log('>>> Step 2: Creating New User');
            const addBtn = page.locator('button:has-text("사용자 등록"), button:has-text("신규 계정 생성")').first();
            await addBtn.click();
            
            console.log('>>> Opening Modal...');
            await expect(page.locator('text=/신규 사용자 등록|CREATE_IDENTITY/i')).toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(1000); // Wait for modal animation
            
            console.log('>>> Filling Form Fields...');
            await page.locator('input[name="userId"]').fill(testId);
            await page.locator('input[name="userNm"]').fill(testName);
            await page.locator('input[name="password"]').fill('test1234!');
            await page.locator('input[name="emailAdres"]').fill(`${testName}@egov.kr`);
            
            // Explicitly select a department to avoid validation error
            console.log('>>> Selecting Department...');
            // Click the dropdown button with force to overcome pointer interception
            const deptDropdown = page.locator('button, [role="combobox"]').filter({ hasText: /GLOBAL|부서/ }).first();
            await deptDropdown.click({ force: true });
            await page.waitForTimeout(500);
            
            // Use keyboard to navigate if possible, or force click the option
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            
            // Fallback: Click specifically by text if keyboard navigation didn't work
            const targetDept = page.getByText('기본조직').last();
            if (await targetDept.isVisible()) {
                await targetDept.click({ force: true });
            }
            console.log('>>> Department Selected');
            
            await page.waitForTimeout(500); 

            console.log('>>> Clicking Submit Button...');
            // In KRDS, the button might have internal elements. focus and enter is often more reliable.
            const submitBtn = page.locator('button:has-text("신규 등록")').last();
            await expect(submitBtn).toBeVisible({ timeout: 15000 });
            await submitBtn.focus();
            await page.keyboard.press('Enter');
            
            // Fallback if keyboard didn't trigger
            await page.waitForTimeout(500);
            if (await page.locator('text=/신규 사용자 등록/').isVisible()) {
                await submitBtn.click({ force: true });
            }
            
            console.log('>>> Waiting for Success Toast...');
            // Wait for toast and ensure it's the success one
            const successToast = page.locator('.toast-success, .bg-emerald-500, text=성공적으로 등록되었습니다, text=성공');
            await expect(successToast.first()).toBeVisible({ timeout: 20000 });
            console.log('>>> Step 2 Result: SUCCESS');

            console.log('>>> Step 3: Searching and Verifying');
            await page.locator('input[placeholder*="아이덴티티 검색"], input[placeholder*="검색"]').first().fill(testName);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000); 
            
            await expect(page.getByText(testName).first()).toBeVisible({ timeout: 15000 });

            console.log('\n>>> Step 4: Deleting User');
            await page.getByText(testName).first().click();
            
            await expect(page.locator('text=/IDENTITY DETAIL|상세/i').first()).toBeVisible({ timeout: 15000 });
            await page.waitForTimeout(1000); 
            
            const revokeBtn = page.locator('button:has-text("REVOKE_ACCESS"), button:has-text("사용자 삭제"), button:has-text("삭제")').first();
            await revokeBtn.click();
            
            console.log('>>> Confirming Deletion...');
            // In KRDS, confirmation buttons often have distinct styles or roles
            const confirmBtn = page.locator('button:has-text("확인"), button:has-text("CONFIRM"), button:has-text("삭제")').last();
            await expect(confirmBtn).toBeVisible({ timeout: 10000 });
            await confirmBtn.click({ force: true });
            
            await expect(page.locator('text=/성공적으로 말소되었습니다|Deleted/i').first()).toBeVisible({ timeout: 15000 });
            console.log('>>> User Lifecycle Completed Successfully');
        });
    });

    test.describe('System Configuration', () => {
        test('Common Code Navigation and Stability', async ({ page }) => {
            console.log('\n>>> Step 1: Navigating to Common Code');
            await page.goto('/admin/system/common-code');
            await expect(page.locator('button:has-text("COM")').first()).toBeVisible({ timeout: 30000 });
        });

        test('Menu Hierarchy Management UI', async ({ page }) => {
            console.log('\n>>> Step 1: Navigating to Menu Management');
            await page.goto('/admin/system/menus');
            
            console.log('>>> Step 2: Verifying Tree Structure');
            await expect(page.getByText('🏢 워크스페이스').first()).toBeVisible({ timeout: 30000 });
            const treeItems = page.locator('text=/NODE_|워크스페이스/').first();
            await expect(treeItems).toBeVisible();
        });
    });

    test.describe('Organizational Structure', () => {
        test('Department and Absence Management Access', async ({ page }) => {
            console.log('\n>>> Step 1: Checking Departments Page');
            await page.goto('/admin/user/manage');
            
            // KRDS uses Section_02 for Departments tab
            const deptTab = page.getByRole('button', { name: /Section_02/ }).first();
            await expect(deptTab).toBeVisible({ timeout: 20000 });
            await deptTab.click({ force: true });
            await expect(page.locator('text=/TOPOLOGY_NODE|부서/i').first()).toBeVisible({ timeout: 15000 });

            console.log('>>> Step 2: Checking Absences Page');
            const absenceTab = page.getByRole('button', { name: /Section_03/ }).first();
            await expect(absenceTab).toBeVisible({ timeout: 10000 });
            await absenceTab.click({ force: true });
            await expect(page.locator('text=/ABSENCE|부재/i').first()).toBeVisible({ timeout: 20000 });
        });
    });
});
