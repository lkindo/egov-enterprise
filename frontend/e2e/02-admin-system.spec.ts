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
            const deptSelect = page.locator('select[name="ognzId"]');
            await expect(deptSelect).toBeVisible({ timeout: 5000 });
            // index 0 은 "소속 없음 / GLOBAL"(value=''), 그 뒤가 실제 부서다. 부서가 0건인 신규 DB
            // (CI 기본값)에서는 index 1 이 존재하지 않아 selectOption 이 깨졌다. ognzId 는 스키마상
            // optional 이므로 부서가 없으면 '소속 없음' 을 그대로 둔다.
            const deptOptionCount = await deptSelect.locator('option').count();
            if (deptOptionCount > 1) {
                await deptSelect.selectOption({ index: 1 });
            } else {
                console.log('>>> Step 3: 등록된 부서가 없어 소속 없음(GLOBAL)으로 진행');
            }
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
            const successAlert = page.locator('[data-sonner-toast][data-type="success"]').filter({ hasText: '성공' });
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

            // [2026-07-27 정정] 종전 셀렉터는 '접근 차단' / '접근차단실행' / 토스트 '말소' 였다.
            // 그러나 앱이 의도적으로 문구를 고쳤다 — UserOrgHubClient 주석: "실제 동작은 계정 삭제다.
            // '접근 차단'은 무엇을 하는지 오인시킨다"(관리자 메뉴 감사 P1). 실측 문구로 맞춘다.
            //   버튼='사용자 삭제'(부서 탭이면 '부서 삭제') · 확인=confirmText '삭제' · 토스트='… 삭제했습니다.'
            const deleteBtn = page.getByRole('button', { name: '사용자 삭제' }).first();
            await expect(deleteBtn).toBeVisible({ timeout: 10000 });
            await deleteBtn.click();

            // 확인 버튼 이름('삭제')은 상세 패널의 '사용자 삭제' 에도 부분일치하므로 다이얼로그로 한정한다.
            const confirmBtn = page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true });
            await expect(confirmBtn).toBeVisible({ timeout: 5000 });
            await confirmBtn.click();

            const deleteSuccessAlert = page
                .locator('[data-sonner-toast][data-type="success"]')
                .filter({ hasText: '삭제했습니다' });
            await expect(deleteSuccessAlert.first()).toBeVisible({ timeout: 15000 });
            console.log('>>> User Lifecycle Completed Successfully');
        });
    });

    // [E2E 감사 Phase3 중복제거] 삭제됨: 'System Configuration'(common-code/menus 네비 스모크) 및
    // 'Organizational Structure'(부서/부재 탭) describe — 동일 경로를 19-hierarchy-modernization가
    // 더 구체적으로(트리 노드/ORGNZT/Explorer Domains) 소유·검증한다.

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
        // [E2E 감사 Phase3 중복제거] 삭제됨:
        //  - 'Collaboration Hub: Full Note Lifecycle' → 동일 경로(/admin/collaboration/mail-*)를 13-mail이 소유.
        //  - 'Intelligence Dashboard: Data Visualization' → StatsPage.verifyChartsVisible 중복. 엑셀 내보내기까지
        //    검증하는 08(Advanced Collaboration)이 stats 소유자.

        test('Event Operations: Full Event Lifecycle', async ({ opsDetailPage }) => {
            const eventName = `E2E Event ${Math.random().toString(36).substring(7)}`;
            await opsDetailPage.goto();
            
            // 1. Create Event
            await opsDetailPage.createEvent({
                name: eventName,
                desc: 'Automated E2E Test Event Description',
                capacity: 100,
                startDate: '2026-05-01',
                endDate: '2026-05-03'
            });
            
            // 2. Search and Delete
            await opsDetailPage.deleteEvent(eventName);
        });
    });
});
