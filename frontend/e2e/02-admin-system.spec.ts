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

        // [2026-08-10 개명] 'Create-Search-Update-Delete Flow' → 실제로 수행하는 단계로 정정.
        //   Update 는 아래 fixme 가 소유한다(앱이 400 을 돌려주는 것이 확인됐다).
        test('Create-Search-Delete Flow', async ({ page }) => {
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
            // ⚠ Update 단계는 이 테스트에 없다. 이름이 오래 'Create-Search-Update-Delete' 였음에도
            //   Update 가 존재한 적이 없어 2026-08-10 에 추가했는데, **실행해 보니 앱이 400 을 돌려준다.**
            //   결함을 계약으로 굳히지 않기 위해 아래 별도 `test.fixme` 로 분리해 박제했다.
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

        /**
         * 🚨 [2026-08-10 확인된 앱 결함 — 관리자의 사용자 정보 수정이 항상 400 이다]
         *
         * 이 스펙의 이름은 오랫동안 'Create-Search-**Update**-Delete Flow' 였지만 Update 단계가
         * 존재한 적이 없었다. 채워 넣고 CI 에서 처음 돌리자 곧바로 드러났다(run 31370824912, shard 1):
         *
         *     ❌ [HTTP 400 PUT]: http://localhost:3001/api/v1/admin/system/users/e2e_lsezbi (xhr)
         *     Error: expect(locator).toBeVisible() failed
         *       Locator: [data-sonner-toast][data-type="success"] filter(hasText:'수정되었습니다')
         *
         * ── 근본 원인 (소스 대조로 확정)
         *   · 수정 폼(UserManageForm)은 edit 모드에서 비밀번호를 **선택**으로 두고 defaultValues 로
         *     `pswd: ''` 를 싣는다. 비밀번호 변경은 별도 경로(PATCH .../{id}/password)의 책임이므로
         *     이것은 폼의 올바른 설계다.
         *   · UserAdminService.updateUser 는 폼 값을 **그대로** PUT 한다(빈 값 제거 없음).
         *   · 그런데 백엔드 UserApiController.updateUser 는 등록과 **같은 `UserDto` 를 `@Valid`** 로 받고,
         *     UserDto.pswd 에는 `@NotBlank` + `@Size(min=8)` + `@Pattern` 이 걸려 있다.
         *   → 즉 수정 요청은 구조적으로 통과할 수 없다. 비밀번호를 함께 보내지 않는 한 **항상 400** 이다.
         *
         * ── 왜 지금까지 아무도 몰랐나
         *   이 경로를 검증하는 테스트가 프런트·백엔드 어디에도 없었다. 화면에는 폼이 뜨고 제출도 되며
         *   실패는 일반 에러 토스트로만 나타나므로, 눈으로 보면 '동작하는 것처럼' 보인다.
         *   (같은 화면의 '정보 수정' 버튼은 과거 onClick 이 없는 死버튼이었다가 수리된 이력이 있다 —
         *    UI 는 고쳐졌지만 그 아래 API 계약은 여전히 깨져 있었던 셈이다.)
         *
         * ── 왜 fixme 인가
         *   고치려면 백엔드 API 계약을 바꿔야 한다(수정 전용 DTO 분리 또는 검증 그룹 도입 →
         *   api-docs.json → generated-api.d.ts → generated-zod.ts 연쇄 재생성). 그것은 E2E 최적화와
         *   무관한 별건이며 독자적인 설계·리뷰가 필요하다. 그렇다고 "수정하면 에러가 난다" 를 단언해
         *   **결함을 계약으로 동결하는 것은 금지**되어 있다(11 티어의 가짜 성공 토스트 사례와 동일한 함정).
         *   그래서 테스트는 **올바른 기대값 그대로 두고** fixme 로 표시한다.
         *
         *   ✅ 백엔드가 고쳐지면 `.fixme` 만 떼면 그대로 통과해야 한다.
         *
         * ⚠ 첫 시도에서는 수정 이름에 `_UPD` 를 붙였다가 별개의 400 도 함께 유발했다 —
         *   UserDto.userNm 의 `@Pattern(^[a-zA-Z0-9가-힣\s]{2,50}$)` 은 **밑줄을 허용하지 않는다**.
         *   그래서 아래에서는 공백을 쓴다. (이 경우는 앱이 옳고 테스트가 틀렸던 쪽이다.)
         */
        test.fixme('User Update: 관리자가 사용자 정보를 수정한다 (현재 PUT 400 — UserDto.pswd @NotBlank)', async ({ page }) => {
            const updatedName = `${testName} UPD`;

            await page.goto('/admin/user/manage');
            await expect(page.getByRole('heading', { name: '사용자 관리' }).first()).toBeVisible({ timeout: 20000 });

            const searchInput = page.locator('input[placeholder*="검색"], input[placeholder*="identity"]').first();
            await searchInput.fill(testName);
            await page.keyboard.press('Enter');
            await expect(page.locator(`text=${testName}`).first()).toBeVisible({ timeout: 15000 });
            await page.locator(`text=${testName}`).first().click();

            // ⚠ '정보 수정'이라는 접근가능 이름을 가진 버튼이 상세 패널에 **둘** 있다
            //   (연필 아이콘 버튼 aria-label + 하단 텍스트 버튼). 모달이 열리면 제출 버튼까지 셋이 된다.
            //   이 시점에는 모달이 닫혀 있으므로 상세 패널의 첫 번째를 집는다.
            const editTrigger = page.getByRole('button', { name: '정보 수정', exact: true }).first();
            await expect(editTrigger).toBeVisible({ timeout: 15000 });
            await editTrigger.click();

            await expect(page.getByText('사용자 정보 수정')).toBeVisible({ timeout: 10000 });

            // 편집 폼에는 기존 값이 실려 있어야 한다 — 빈 폼이 뜨면 그것은 '수정'이 아니라 재등록이다.
            const nameInput = page.locator('input[name="userNm"]');
            await expect(nameInput).toHaveValue(testName, { timeout: 15000 });
            await nameInput.fill(updatedName);

            // 제출 버튼의 라벨도 '정보 수정'이므로 form 스코프로 한정한다(등록 단계와 동일 패턴).
            await page.locator('form button[type="submit"]').click();

            const updateSuccessAlert = page
                .locator('[data-sonner-toast][data-type="success"]')
                .filter({ hasText: '수정되었습니다' });
            await expect(updateSuccessAlert.first()).toBeVisible({ timeout: 20000 });

            // 토스트만 보고 통과하지 않는다 — 이 저장소에는 **API 를 부르지 않고 성공 토스트만 띄우던**
            // 결재 상신 사례가 있다(11 티어 주석). 목록에 실제로 반영됐는지까지 확인한다.
            await searchInput.fill(updatedName);
            await page.keyboard.press('Enter');
            await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 15000 });
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
