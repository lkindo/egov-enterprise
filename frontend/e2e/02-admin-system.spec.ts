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

        // 이름이 약속하는 4단계를 실제로 모두 수행한다. (2026-08-10 감사에서 Update 가 한 번도
        // 존재한 적 없음이 드러났고, 채워 넣자 백엔드 결함이 확인돼 2026-08-11 에 함께 고쳤다.)
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

            // --- Step 7: Update ---
            // [2026-08-10 신설 → 2026-08-11 활성화] 이 테스트의 이름은 줄곧
            //   'Create-Search-Update-Delete Flow' 였지만 **Update 단계가 존재한 적이 없었다.**
            //   채워 넣고 CI 에서 처음 돌리자 앱이 400 을 돌려줬다 — 등록용 DTO 를 수정에도 재사용해
            //   `UserDto.pswd` 의 @NotBlank 가 수정 요청까지 막고 있었다(수정 폼은 비밀번호를 보내지
            //   않는 것이 옳은 설계다 — 변경은 전용 경로 책임). 서버의 검증 그룹을 한정해 고쳤고
            //   (UserValidationGroups.OnCreate) 이제 이 단계가 실제로 돈다.
            //   ⚠ 이름에 밑줄을 쓰지 않는다 — UserDto.userNm 의 @Pattern 이 밑줄을 불허한다.
            console.log('>>> Step 7: Updating user');
            const updatedName = `${testName} UPD`;
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

            // [2026-08-11 신설] 등록 때 입력한 **이메일이 실제로 저장됐는지**를 여기서 닫는다.
            //   종전 registerUser 는 User.builder() 에 7개 필드만 넣어 폼이 보낸 이메일·연락처·소속 부서를
            //   **오류 없이 버렸다**(성공 토스트까지 뜬 채로). 그래서 이 칸은 항상 비어 있었고,
            //   그것이 emlAddr @Pattern 의 빈 문자열 거부와 겹쳐 "등록은 되는데 수정은 영원히 400" 을 만들었다.
            //   서비스 계층은 UserServiceTest 가 ArgumentCaptor 로 검증한다 — 여기서는 **화면까지 오는지**를 본다
            //   (목록 API 가 emlAddr 을 돌려주고 폼이 그것을 싣는 배선까지 포함).
            await expect(
                page.locator('input[name="emlAddr"]'),
                '등록 때 입력한 이메일이 수정 폼에 실려 오지 않았다 — 등록이 입력값을 버렸을 수 있다',
            ).toHaveValue(`${testId}@egov.kr`, { timeout: 15000 });

            await nameInput.fill(updatedName);

            // 제출 버튼의 라벨도 '정보 수정'이므로 form 스코프로 한정한다(등록 단계와 동일 패턴).
            //
            // [2026-08-11] 제출 결과를 **API 응답으로 직접** 단언한다. 종전에는 성공 토스트만 봤는데,
            //   그 방식은 실패했을 때 "토스트가 안 떴다"까지만 알려 준다 — 실제로 2026-08-11 CI 에서
            //   PUT 이 400 을 돌려줬는데 원인(어느 필드가 왜 거부됐는지)을 알 방법이 없어 원격
            //   디버깅이 여러 회차 헛돌았다. 응답 본문과 요청 페이로드를 단언 메시지에 실어
            //   **실패 자체가 원인을 말하게** 한다.
            const [updateResponse] = await Promise.all([
                page.waitForResponse(
                    (r) => r.request().method() === 'PUT' && /\/api\/v1\/admin\/system\/users\//.test(r.url()),
                    { timeout: 30000 },
                ),
                page.locator('form button[type="submit"]').click(),
            ]);

            if (!updateResponse.ok()) {
                // 진단은 실패 경로에서만 수집한다(성공 시 불필요한 본문 읽기를 하지 않는다).
                const body = await updateResponse.text().catch(() => '(본문 읽기 실패)');
                const sent = updateResponse.request().postData() ?? '(요청 본문 없음)';
                expect(
                    updateResponse.ok(),
                    `사용자 수정 PUT 이 ${updateResponse.status()} 로 실패했다.\n`
                    + `  응답 본문: ${body}\n`
                    + `  보낸 페이로드: ${sent}`,
                ).toBeTruthy();
            }

            const updateSuccessAlert = page
                .locator('[data-sonner-toast][data-type="success"]')
                .filter({ hasText: '수정되었습니다' });
            await expect(updateSuccessAlert.first()).toBeVisible({ timeout: 20000 });

            // 토스트만 보고 통과하지 않는다 — 이 저장소에는 **API 를 부르지 않고 성공 토스트만 띄우던**
            // 결재 상신 사례가 있다(11 티어 주석). 목록에 실제로 반영됐는지까지 확인한다.
            await searchInput.fill(updatedName);
            await page.keyboard.press('Enter');
            await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 15000 });

            // --- Step 8: Delete ---
            console.log('>>> Step 8: Deleting user');
            await page.locator(`text=${updatedName}`).first().click();
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

        // [2026-08-11 해소] 여기에 `test.fixme('User Update: … 현재 PUT 400')` 가 있었다.
        //   원인이던 백엔드 결함(등록용 UserDto 의 pswd @NotBlank 가 수정 요청까지 막던 것)을
        //   검증 그룹 한정으로 고쳤으므로(UserValidationGroups.OnCreate), Update 단계를 위
        //   메인 흐름(Step 7)으로 되돌리고 fixme 를 제거한다.
        //
        //   ⚠ 별도 테스트로 두지 않은 이유: 이 describe 의 testName 은 메인 테스트가 만들고
        //     **마지막에 삭제**한다. 분리된 테스트는 그 사용자를 찾지 못하는 순서 의존 결함을
        //     안게 된다(fixme 라 한 번도 실행되지 않아 드러나지 않았다).
        //
        //   회귀 방어는 두 층에 있다:
        //     · 백엔드 UserApiControllerTest — 비밀번호 없는 수정 200 / 등록은 여전히 400 (양방향)
        //     · 여기 E2E Step 7 — 화면에서 실제로 저장되고 목록에 반영되는지
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
