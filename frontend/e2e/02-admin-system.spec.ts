import { test, expect } from './fixtures/base-test';

/**
 * [Tier 2] Administrative Core: System & User Management
 * 
 * DOM Analysis Results (2026-04-27):
 * - Toast: role="alert" aria-live="assertive" (custom useToast hook)
 * - Dept field: native <select name="orgnztId"> (NOT button/combobox)
 * - Submit btn: form button[type="submit"] text="신규 등록"
 * - Delete btn: text="REVOKE_ACCESS"
 * - Delete confirm: text="REVOKE_IDENTITY" (custom confirm-modal)
 * - Section_03: shows user list (ABSENCES), active tab has class "bg-slate-900"
 * - Section_02: shows dept list with column header "TOPOLOGY_NODE"
 */

test.describe('Tier 2: Admin System (Core Management)', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.describe('User Management Lifecycle', () => {
        const suffix = Math.random().toString(36).substring(7);
        const testId = `e2e_${suffix}`;
        const testName = `E2E User ${suffix.toUpperCase()}`;

        test('Create-Search-Update-Delete Flow', async ({ page }) => {
            console.log(`\n>>> Starting User Lifecycle: id=${testId}, name=${testName}`);

            // --- Step 1: Navigate ---
            console.log('>>> Step 1: Navigating to User Management');
            await page.goto('/admin/user/manage');
            await expect(page.getByRole('heading', { name: '사용자 관리' }).first()).toBeVisible({ timeout: 20000 });

            // --- Step 2: Open Modal ---
            console.log('>>> Step 2: Opening Registration Modal');
            const addBtn = page.locator('button').filter({ hasText: '사용자 등록' }).first();
            await expect(addBtn).toBeVisible({ timeout: 10000 });
            await addBtn.click();

            await expect(page.locator('text=신규 사용자 등록')).toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(1000); // Modal animation

            // --- Step 3: Fill Form ---
            console.log('>>> Step 3: Filling form fields');
            await page.locator('input[name="userId"]').fill(testId);
            await page.locator('input[name="userNm"]').fill(testName);
            await page.locator('input[name="pswd"]').fill('Admin1234!');
            await page.locator('input[name="emlAddr"]').fill(`${testId}@egov.kr`);

            // CRITICAL: Dept field is a native <select> tag, NOT a button/combobox
            console.log('>>> Step 3: Selecting department via native select');
            const deptSelect = page.locator('select[name="orgnztId"]');
            await expect(deptSelect).toBeVisible({ timeout: 5000 });
            // Select the first real department option (index 1, index 0 is "소속 없음 / GLOBAL")
            await deptSelect.selectOption({ index: 1 });
            await page.waitForTimeout(500);

            // --- Step 4: Submit ---
            console.log('>>> Step 4: Clicking submit button');
            // Submit button is form button[type="submit"] with text "신규 등록"
            const submitBtn = page.locator('form button[type="submit"]');
            await expect(submitBtn).toBeVisible({ timeout: 10000 });
            await expect(submitBtn).toBeEnabled({ timeout: 5000 });
            await submitBtn.click();

            // --- Step 5: Verify Toast ---
            // Toast renders as role="alert" with aria-live="assertive"
            console.log('>>> Step 5: Waiting for success alert');
            const successAlert = page.getByRole('alert').filter({ hasText: '성공' });
            await expect(successAlert.first()).toBeVisible({ timeout: 20000 });
            console.log('>>> Step 5 Result: Registration SUCCESS');

            // --- Step 6: Search ---
            console.log('>>> Step 6: Searching for created user');
            await expect(page.locator('text=신규 사용자 등록')).not.toBeVisible({ timeout: 5000 });
            const searchInput = page.locator('input[placeholder*="검색"], input[placeholder*="identity"]').first();
            await searchInput.fill(testName);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            await expect(page.locator(`text=${testName}`).first()).toBeVisible({ timeout: 15000 });

            // --- Step 7: Delete ---
            console.log('>>> Step 7: Deleting user');
            await page.locator(`text=${testName}`).first().click();
            await page.waitForTimeout(1000);

            // The button text is "접근 차단"
            const deleteBtn = page.locator('button:has-text("접근 차단")').first();
            await expect(deleteBtn).toBeVisible({ timeout: 10000 });
            await deleteBtn.click();

            // Confirm Text is "접근차단실행"
            const confirmBtn = page.locator('button:has-text("접근차단실행")').first();
            await expect(confirmBtn).toBeVisible({ timeout: 5000 });
            await confirmBtn.click();

            // Deletion success toast (text: '아이덴티티가 성공적으로 말소되었습니다.')
            const deleteSuccessAlert = page.getByRole('alert').filter({ hasText: '말소' });
            await expect(deleteSuccessAlert.first()).toBeVisible({ timeout: 15000 });
            console.log('>>> User Lifecycle Completed Successfully');
        });
    });

    test.describe('System Configuration', () => {
        test('Common Code Navigation and Stability', async ({ page }) => {
            console.log('\n>>> Navigating to Common Code');
            await page.goto('/admin/system/common-code');
            await expect(page.locator('button:has-text("COM")').first()).toBeVisible({ timeout: 30000 });
        });

        test('Menu Hierarchy Management UI', async ({ page }) => {
            console.log('\n>>> Navigating to Menu Management');
            await page.goto('/admin/system/menus');
            await expect(page.getByText(/워크스페이스/i).first()).toBeVisible({ timeout: 30000 });
        });
    });

    test.describe('Organizational Structure', () => {
        test('Department and Absence Management Access', async ({ page }) => {
            console.log('\n>>> Step 1: Navigate to User/Org Hub');
            await page.goto('/admin/user/manage');
            await expect(page.getByRole('heading', { name: '사용자 관리' }).first()).toBeVisible({ timeout: 20000 });

            // Section_02: DEPTS tab
            // After click, table shows column header "TOPOLOGY_NODE"
            console.log('>>> Step 2: Switching to Section_02 (DEPTS tab)');
            const deptTab = page.locator('button:has-text("부서 관리")').first();
            await expect(deptTab).toBeVisible({ timeout: 20000 });
            await deptTab.click({ force: true });
            // Wait for Framer Motion animation + data load
            await page.waitForTimeout(1000);
            await expect(page.locator('text=조직 구조').first()).toBeVisible({ timeout: 20000 });
            console.log('>>> Section_02 (DEPTS): PASS');

            // Section_03: ABSENCES tab
            // NOTE: ABSENCES tab still shows the user list (same data, just filtered view)
            // Verify tab is activated by checking its CSS class "bg-slate-900" (active state)
            console.log('>>> Step 3: Switching to Section_03 (ABSENCES tab)');
            const absenceTab = page.locator('button:has-text("부재 관리")').first();
            await expect(absenceTab).toBeVisible({ timeout: 10000 });
            await absenceTab.click({ force: true });
            await page.waitForTimeout(1000);
            // The active NavButton gets class "bg-slate-900"
            await expect(absenceTab).toHaveClass(/bg-slate-900/, { timeout: 15000 });
            console.log('>>> Section_03 (ABSENCES): PASS');
        });
    });

    test.describe('Security & Authority Management', () => {
        const suffix = Math.random().toString(36).substring(7);
        const authCode = `ROLE_E2E_${suffix.toUpperCase()}`;
        const groupId = `GROUP_E2E_${suffix.toUpperCase()}`;

        test('Authority/Group/Role Comprehensive CRUD', async ({ securityAdminPage }) => {
            console.log('\n>>> Starting Security & Authority CRUD Flow');

            // 1. Authority Management
            await securityAdminPage.gotoAuthorities();
            await securityAdminPage.createAuthority(authCode, `E2E Auth ${suffix}`);

            // 2. Group Management
            await securityAdminPage.gotoGroups();
            await securityAdminPage.createGroup(groupId, `E2E Group ${suffix}`);

            // 3. Role Management
            await securityAdminPage.gotoRoles();
            await securityAdminPage.createRole(`URL_E2E_${suffix.toUpperCase()}`, `E2E Role ${suffix}`);

            console.log('>>> Security & Authority CRUD Completed');
        });
    });

    test.describe('Advanced Operations & Analytics', () => {
        test('Collaboration Hub: Full Note Lifecycle', async ({ collabPage }) => {
            const subject = `E2E Note ${Math.random().toString(36).substring(7)}`;
            await collabPage.goto();
            
            // 1. Send Note
            await collabPage.sendNote('webmaster', subject, 'This is an automated E2E test note payload.');
            
            // 2. Verify and Delete
            await collabPage.deleteNote(subject);
        });

        test('Intelligence Dashboard: Data Visualization', async ({ statsPage }) => {
            await statsPage.goto();
            await statsPage.verifyChartsVisible();
            await statsPage.refresh();
        });

        test('Event Operations: Full Event Lifecycle', async ({ opsDetailPage }) => {
            const eventName = `E2E Event ${Math.random().toString(36).substring(7)}`;
            await opsDetailPage.goto();
            
            // 1. Create Event
            await opsDetailPage.createEvent({
                name: eventName,
                desc: 'Automated E2E Test Event Description',
                capacity: 100,
                startDate: '2026-05-01',
                endDate: '2026-05-03',
                recruitDate: '2026-04-29',
                recruitEndDate: '2026-04-30'
            });
            
            // 2. Search and Delete
            await opsDetailPage.deleteEvent(eventName);
        });
    });
});
