import { randomUUID } from 'node:crypto';
import { expect,test } from '../fixtures/browser-test';
import { DeptJobPage } from '../pages/DeptJobPage';
import { getAdminBearerToken } from '../utils/admin-token';
const JOB_API = '/api/v1/dept-jobs';
const BOX_API = `${JOB_API}/boxes`;
const DEPT_API = '/api/v1/admin/system/departments';
const USER_API = '/api/v1/admin/system/users';
/** 화면 동작이 부른 응답을 기다리는 상한 — 요청이 나가지 않으면 시험 제한 시간까지 매달리지 않고 실패해 정리가 돈다. */
const RESPONSE_WAIT = { timeout: 20_000 };
/** 이 스펙이 만든 자원만 지우기 위한 접두사. 다른 tier·cleanup 정책과 겹치지 않는 고유값을 쓴다. */
const PREFIX = 'E2E25_';
test.describe('부서 업무 ↔ 업무 보고 사슬', () => {
    // UI 검증은 저장된 관리자 세션을 재사용한다. 이 선언이 없으면 미인증 상태로 로그인 화면이 뜬다.
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let auth: Record<string, string>;
    test.beforeAll(() => {
        auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
    });
    test('업무함 관리: 부서 전량 조회 → 부서 지정 등록 → 수정 → 삭제', async ({ page, request }) => {
        const suffix = Date.now();
        const departmentName = `${PREFIX}BoxDept_${suffix}`;
        const boxName = `${PREFIX}Box_${suffix}`;
        const editedName = `${boxName}_edited`;
        let departmentId = '';
        let boxSn = 0;
        let boxDeleted = false;
        try {
            // 선택지를 기존 seed에 의존하지 않는다. 이 테스트가 만든 부서만 사용한다.
            const departmentCreate = await request.post(DEPT_API, {
                headers: auth,
                data: { ognzNm: departmentName },
            });
            expect(departmentCreate.status(), '업무함 테스트용 부서 생성이 성공해야 한다').toBe(201);
            departmentId = (await departmentCreate.json()).data as string;
            expect(departmentId).toMatch(/^ORGNZT_/);
            const deptJobPage = new DeptJobPage(page);
            await deptJobPage.gotoJobList();
            // 응답 상태를 waiter 조건에 넣지 않는다. 500도 즉시 받아 실패 원인을 드러낸다.
            const [treeResponse, boxesResponse] = await Promise.all([
                page.waitForResponse((response) => new URL(response.url()).pathname === `${DEPT_API}/tree`
                    && response.request().method() === 'GET'),
                page.waitForResponse((response) => new URL(response.url()).pathname === BOX_API
                    && response.request().method() === 'GET'),
                page.getByRole('button', { name: '업무함 관리', exact: true }).click(),
            ]);
            expect(treeResponse.status(), '관리창의 부서 전량 조회는 500 없이 성공해야 한다').toBe(200);
            expect((await treeResponse.json()).data).toEqual(expect.arrayContaining([
                expect.objectContaining({ ognzId: departmentId, ognzNm: departmentName }),
            ]));
            expect(boxesResponse.status(), '관리창의 업무함 목록 조회가 성공해야 한다').toBe(200);
            const dialog = page.getByRole('dialog', { name: '업무함 관리', exact: true });
            await expect(dialog).toBeVisible();
            await dialog.getByRole('combobox', { name: '담당 부서', exact: true }).click();
            const departmentOption = page.getByRole('option', { name: departmentName, exact: true });
            await expect(departmentOption, '서버에서 읽은 부서가 실제 선택지로 나타나야 한다').toBeVisible();
            await departmentOption.click();
            await dialog.getByRole('textbox', { name: /업무함 이름/ }).fill(boxName);
            await dialog.getByRole('textbox', { name: '정렬 순서', exact: true }).fill('0');
            const [createdResponse] = await Promise.all([
                page.waitForResponse((response) => new URL(response.url()).pathname === BOX_API
                    && response.request().method() === 'POST'),
                dialog.getByRole('button', { name: '업무함 등록', exact: true }).click(),
            ]);
            expect(createdResponse.status(), '화면에서 업무함 등록이 성공해야 한다').toBe(201);
            boxSn = (await createdResponse.json()).data as number;
            expect(boxSn).toBeGreaterThan(0);
            const list = dialog.getByRole('list', { name: '업무함 목록', exact: true });
            const row = list.getByRole('listitem').filter({ hasText: boxName });
            await expect(row, '등록 후 관리 목록이 갱신되어야 한다').toBeVisible();
            const createdDetail = await request.get(`${BOX_API}/${boxSn}`, { headers: auth });
            expect(createdDetail.status()).toBe(200);
            expect((await createdDetail.json()).data).toMatchObject({
                deptTaskBoxNm: boxName, deptId: departmentId, sortOrdr: 0,
            });
            await row.getByRole('button', { name: `${boxName} 수정`, exact: true }).click();
            await expect(dialog.getByRole('combobox', { name: '담당 부서', exact: true }))
                .toHaveText(departmentName);
            await expect(dialog.getByRole('textbox', { name: /업무함 이름/ })).toHaveValue(boxName);
            await dialog.getByRole('textbox', { name: /업무함 이름/ }).fill(editedName);
            const [updatedResponse] = await Promise.all([
                page.waitForResponse((response) => new URL(response.url()).pathname === `${BOX_API}/${boxSn}`
                    && response.request().method() === 'PUT'),
                dialog.getByRole('button', { name: '수정 저장', exact: true }).click(),
            ]);
            expect(updatedResponse.status(), '화면에서 업무함 수정이 성공해야 한다').toBe(200);
            const editedRow = list.getByRole('listitem').filter({ hasText: editedName });
            await expect(editedRow).toBeVisible();
            const updatedDetail = await request.get(`${BOX_API}/${boxSn}`, { headers: auth });
            expect(updatedDetail.status()).toBe(200);
            expect((await updatedDetail.json()).data).toMatchObject({
                deptTaskBoxNm: editedName, deptId: departmentId, sortOrdr: 0,
            });
            await editedRow.getByRole('button', { name: `${editedName} 삭제`, exact: true }).click();
            const confirmation = page.getByRole('dialog', { name: '업무함 삭제', exact: true });
            const [deletedResponse] = await Promise.all([
                page.waitForResponse((response) => new URL(response.url()).pathname === `${BOX_API}/${boxSn}`
                    && response.request().method() === 'DELETE'),
                confirmation.getByRole('button', { name: '삭제', exact: true }).click(),
            ]);
            expect(deletedResponse.status(), '삭제 확인이 실제 삭제로 이어져야 한다').toBe(200);
            boxDeleted = true;
            await expect(editedRow).toHaveCount(0);
            const gone = await request.get(`${BOX_API}/${boxSn}`, { headers: auth });
            expect(gone.status(), '삭제한 업무함을 다시 조회하면 404여야 한다').toBe(404);
            await dialog.getByRole('button', { name: '닫기', exact: true }).click();
            await expect(dialog).toBeHidden();
        }
        finally {
            // 실패 중에도 이 테스트가 채번한 자원만 정리하고, 정리 실패를 숨기지 않는다.
            try {
                if (boxSn > 0 && !boxDeleted) {
                    const cleanupBox = await request.delete(`${BOX_API}/${boxSn}`, { headers: auth });
                    expect(cleanupBox.status(), '테스트 업무함 정리가 성공해야 한다').toBe(200);
                }
            }
            finally {
                if (departmentId) {
                    const cleanupDepartment = await request.delete(`${DEPT_API}/${departmentId}`, { headers: auth });
                    expect(cleanupDepartment.status(), '테스트 부서 정리가 성공해야 한다').toBe(200);
                }
            }
        }
    });
    test('부서 업무 목록은 업무함(box)이 아니라 부서 업무(DeptJob)를 보여준다', async ({ page, request }) => {
        // 🚨 8b2b656a1 의 핵심 결함. 목록이 getDeptJobBoxes 를 조회하던 시절에는
        //    아래에서 만든 업무가 목록에 **영원히** 나타나지 않았다.
        const name = `${PREFIX}Visible_${Date.now()}`;
        const res = await request.post(JOB_API, { headers: auth, data: { deptTaskNm: name, prrtyRnk: '2' } });
        const deptTaskSn = (await res.json()).data as number;
        const deptJobPage = new DeptJobPage(page);
        try {
            await deptJobPage.gotoJobList();
            await deptJobPage.search(name);
            // 등록한 '업무'가 목록에 보인다. 업무함은 이 이름을 가질 수 없으므로,
            // 이 단언 하나가 "목록이 어느 엔티티를 보는가"를 판별한다.
            const row = deptJobPage.row(name);
            await expect(row, '등록한 부서 업무가 목록에 나타나야 한다 (목록이 업무함을 보던 회귀)').toBeVisible({ timeout: 30000 });
            // 업무명 링크가 부서 업무 상세로 향한다 = 행이 들고 있는 식별자가 DeptJob 의 PK 다.
            // (업무함이라면 deptTaskBoxSn이라 이 href가 만들어질 수 없다.)
            await expect(row.locator(`a[href="/smart-toolkit/dept-job/${deptTaskSn}"]`), '행의 업무명은 해당 부서 업무 상세로 연결되어야 한다').toBeVisible();
            // 업무함 미지정 업무도 목록에서 깨지지 않고 '업무함 미지정' 으로 표기된다.
            await expect(row).toContainText('업무함 미지정');
            // 검색이 UI 경로에서도 실제로 걸러내는지 — 없는 키워드로는 빈 표가 되어야 한다.
            await deptJobPage.search(`${PREFIX}NO_SUCH_JOB_ZZZ`);
            await expect(deptJobPage.emptyMessage, '일치하지 않는 검색어는 빈 표가 되어야 한다').toBeVisible({ timeout: 20000 });
        }
        finally {
            await request.delete(`${JOB_API}/${deptTaskSn}`, { headers: auth });
        }
    });
    test('부서 업무 등록 후 서버 채번 id 의 상세 화면에 착지한다', async ({ page, request }) => {
        // 종전에는 파손된 목록(selectDeptJobList)으로 보냈고, 상세 라우트는 params 를 받지 않아
        // 어떤 업무를 보는지조차 알 수 없었다.
        const name = `${PREFIX}Landing_${Date.now()}`;
        const deptJobPage = new DeptJobPage(page);
        let deptTaskSn = 0;
        try {
            await deptJobPage.gotoJobCreate();
            await deptJobPage.jobNameInput.fill(name);
            await page.getByRole('combobox', { name: '우선 순위', exact: true }).click();
            await page.getByRole('option', { name: /높음/ }).press('Enter');
            await page.getByRole('button', { name: '업무 등록' }).click();
            // 서버가 채번한 식별자로 상세에 착지해야 한다.
            await expect(page, '등록 후 DB 채번 일련번호의 상세로 이동해야 한다').toHaveURL(/\/smart-toolkit\/dept-job\/\d+/, { timeout: 30000 });
            deptTaskSn = Number(new URL(page.url()).pathname.split('/').pop());
            expect(deptTaskSn).toBeGreaterThan(0);
            // 상세 화면이 '전달받은 id 의' 업무를 보여준다(목록 복제본이 아니다).
            await expect(page.getByText(name).first()).toBeVisible({ timeout: 30000 });
            await expect(page.getByText(String(deptTaskSn)).first(), '상세에 식별자가 표시되어야 한다').toBeVisible();
            const stored = await request.get(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            expect(stored.status()).toBe(200);
            expect((await stored.json()).data.prrtyRnk).toBe('1');
        }
        finally {
            // 방금 착지한 업무 상세를 먼저 떠난 뒤 지운다 — 열린 상세의 재조회가 지운 업무를 404 로 받으면 브라우저 오류 감시가
            //   실패로 잡는다(PR #930). 떠나기가 실패해도(페이지 종료·크래시) 지운다.
            try {
                await page.goto('about:blank');
            } finally {
                if (deptTaskSn) {
                    const cleanup = await request.delete(`${JOB_API}/${deptTaskSn}`, { headers: auth });
                    expect(cleanup.status(), '이 시험이 만든 업무를 정리한다').toBe(200);
                }
            }
        }
    });
    test('부서 업무 상세에서 수정·삭제할 수 있다', async ({ page, request }) => {
        const name = `${PREFIX}Detail_${Date.now()}`;
        const res = await request.post(JOB_API, {
            headers: auth,
            data: { deptTaskNm: name, deptTaskCn: '원본 내용', prrtyRnk: '2' },
        });
        const deptTaskSn = (await res.json()).data as number;
        let deleted = false;
        const deptJobPage = new DeptJobPage(page);
        try {
            await deptJobPage.gotoJobDetail(deptTaskSn);
            await expect(page.getByText(name).first()).toBeVisible({ timeout: 30000 });
            // 수정 — 폼에 기존 값이 실려 있어야 한다(빈 등록 폼이 뜨던 회귀).
            await page.getByRole('button', { name: '수정' }).click();
            await expect(deptJobPage.jobNameInput).toHaveValue(name, { timeout: 20000 });
            const editedName = `${name}_edited`;
            await deptJobPage.jobNameInput.fill(editedName);
            await page.getByRole('combobox', { name: '우선 순위', exact: true }).click();
            await page.getByRole('option', { name: /낮음/ }).press('Enter');
            await page.getByRole('button', { name: '수정 저장' }).click();
            await expect(page.getByText(editedName).first(), '수정 결과가 상세에 반영되어야 한다').toBeVisible({ timeout: 30000 });
            const stored = await request.get(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            expect(stored.status()).toBe(200);
            expect((await stored.json()).data.prrtyRnk).toBe('3');
            // 삭제 — useConfirm 확인 후 목록으로 되돌아간다.
            await page.getByRole('button', { name: '삭제' }).click();
            await deptJobPage.confirmDialogButton('삭제').click();
            await expect(page, '삭제 후 목록으로 돌아가야 한다').toHaveURL(/\/smart-toolkit\/dept-job$/, { timeout: 30000 });
            const goneRes = await request.get(`${JOB_API}/${deptTaskSn}`, { headers: auth });
            expect(goneRes.status(), 'UI 삭제가 실제 삭제로 이어져야 한다').toBe(404);
            deleted = true;
        }
        finally {
            try {
                await page.goto('about:blank');
            } finally {
                if (!deleted) {
                    const cleanup = await request.delete(`${JOB_API}/${deptTaskSn}`, { headers: auth });
                    expect(cleanup.status(), '이 시험이 만든 업무를 정리한다').toBe(200);
                }
            }
        }
    });
    test('부서 업무 목록: 화면 등록·조회 범위 전환·상세 이동·행 삭제', async ({ page, request }) => {
        const suffix = `${Date.now()}`;
        const marker = randomUUID().replaceAll('-', '').slice(0, 10);
        // 다른 사람에게 배정한 업무는 '내 업무'에 없고 '부서 전체'에만 있다 — 그 담당자를 이 시험이 만든 합성 사용자로 둔다.
        const assigneeId = `E2E25U${marker}`;
        const assigneeName = `E2E25 담당 ${marker}`;
        const assignedName = `${PREFIX}Assigned_${suffix}`;
        const createdName = `${PREFIX}ListNew_${suffix}`;
        const deptJobPage = new DeptJobPage(page);
        let assigneeCreated = false;
        let assignedSn = 0;
        let createdSn = 0;
        let createdDeleted = false;
        try {
            const userCreate = await request.post(USER_API, {
                headers: auth,
                data: { userId: assigneeId, userNm: assigneeName, pswd: `Aa1!${randomUUID()}`, role: 'USER' },
            });
            expect(userCreate.status(), '담당자로 지정할 합성 사용자 생성이 성공해야 한다').toBe(201);
            assigneeCreated = true;
            const assignee = await request.get(`${USER_API}/${assigneeId}`, { headers: auth });
            expect(assignee.status()).toBe(200);
            const assigneeEsntlId = (await assignee.json()).data.esntlId as string;
            expect(assigneeEsntlId, '담당자 축은 esntlId 다').toBeTruthy();
            const assigned = await request.post(JOB_API, {
                headers: auth,
                data: { deptTaskNm: assignedName, prrtyRnk: '2', picId: assigneeEsntlId },
            });
            expect(assigned.status(), '다른 사람에게 배정한 업무 생성이 성공해야 한다').toBe(201);
            assignedSn = (await assigned.json()).data as number;

            // 목록 화면의 '업무 등록' 대화상자로 담당자 미지정(=등록자 본인) 업무를 만든다. 목록에 머문다.
            await deptJobPage.gotoJobList();
            await page.getByRole('button', { name: '업무 등록', exact: true }).click();
            const createDialog = page.getByRole('dialog', { name: '부서 업무 등록', exact: true });
            await createDialog.locator('input[name="deptTaskNm"]').fill(createdName);
            const [createdResponse] = await Promise.all([
                page.waitForResponse((response) => new URL(response.url()).pathname === JOB_API
                    && response.request().method() === 'POST', RESPONSE_WAIT),
                createDialog.getByRole('button', { name: '업무 등록', exact: true }).click(),
            ]);
            expect(createdResponse.status(), '목록의 등록 대화상자가 실제 업무를 만들어야 한다').toBe(201);
            createdSn = (await createdResponse.json()).data as number;
            expect(createdSn).toBeGreaterThan(0);
            await expect(createDialog).toBeHidden();
            await deptJobPage.search(createdName);
            await expect(deptJobPage.row(createdName), '등록한 업무가 내 업무 목록에 나타나야 한다').toBeVisible({ timeout: 30000 });
            const createdDetail = await request.get(`${JOB_API}/${createdSn}`, { headers: auth });
            expect(createdDetail.status()).toBe(200);
            expect((await createdDetail.json()).data).toMatchObject({ deptTaskNm: createdName, prrtyRnk: '2' });

            // 조회 범위 — 다른 사람에게 배정한 업무는 '내 업무'에서 빠지고 '부서 전체'에서 담당자 이름과 함께 보인다.
            await deptJobPage.search(assignedName);
            await expect(deptJobPage.emptyMessage, '다른 사람에게 배정한 업무는 내 업무에 없어야 한다').toBeVisible({ timeout: 20000 });
            const scope = page.getByRole('group', { name: '조회 범위', exact: true });
            const [deptScope] = await Promise.all([
                page.waitForResponse((response) => {
                    const url = new URL(response.url());
                    return url.pathname === JOB_API && response.request().method() === 'GET'
                        && url.searchParams.get('scope') === 'dept';
                }, RESPONSE_WAIT),
                scope.getByRole('button', { name: '부서 전체', exact: true }).click(),
            ]);
            expect(deptScope.status(), '부서 전체 조회가 성공해야 한다').toBe(200);
            await expect(scope.getByRole('button', { name: '부서 전체', exact: true })).toHaveAttribute('aria-pressed', 'true');
            await expect(deptJobPage.row(assignedName), '부서 전체에는 다른 사람의 업무가 보여야 한다').toBeVisible({ timeout: 20000 });
            await expect(deptJobPage.row(assignedName)).toContainText(assigneeName);
            await scope.getByRole('button', { name: '내 업무', exact: true }).click();
            await expect(deptJobPage.emptyMessage, '내 업무로 되돌리면 다시 빠져야 한다').toBeVisible({ timeout: 20000 });

            // 상세 이동 — 목록 행의 상세 단추가 그 업무의 상세 화면에 착지한다.
            await deptJobPage.search(createdName);
            const createdRow = deptJobPage.row(createdName);
            await expect(createdRow).toBeVisible({ timeout: 20000 });
            await createdRow.getByRole('button', { name: `${createdName} 상세 보기`, exact: true }).click();
            await expect(page, '행의 상세 단추는 그 업무의 상세로 이동해야 한다').toHaveURL(new RegExp(`/smart-toolkit/dept-job/${createdSn}$`), { timeout: 30000 });
            await expect(page.getByText(createdName).first()).toBeVisible({ timeout: 30000 });
            await expect(page.getByText(String(createdSn)).first(), '상세에 식별자가 표시되어야 한다').toBeVisible();

            // 행 삭제 — 목록을 떠나지 않고 확인 후 지운다.
            // 목록으로 돌아오면 이 탭이 기억한 조회 조건(검색어·조회 범위)이 마운트 뒤에 복원된다. 복원과 겹쳐 검색어를 입력하면
            // 입력이 복원값 뒤에 이어 붙어 두 번 겹친 검색어로 조회된다(2026-11-10 격리 E2E). 복원이 끝난 검색어를 확인하고
            // 그 조건의 목록을 그대로 쓴다.
            await deptJobPage.gotoJobList();
            await expect(deptJobPage.searchInput, '목록으로 돌아오면 이 탭의 검색어가 복원되어야 한다').toHaveValue(createdName, { timeout: 20000 });
            await expect(createdRow).toBeVisible({ timeout: 20000 });
            await createdRow.getByTestId('job-delete').click();
            const confirmation = page.getByRole('dialog', { name: '업무 삭제', exact: true });
            await expect(confirmation).toContainText(createdName);
            const [deletedResponse] = await Promise.all([
                page.waitForResponse((response) => new URL(response.url()).pathname === `${JOB_API}/${createdSn}`
                    && response.request().method() === 'DELETE', RESPONSE_WAIT),
                confirmation.getByRole('button', { name: '삭제', exact: true }).click(),
            ]);
            expect(deletedResponse.status(), '목록 행의 삭제 확인이 실제 삭제로 이어져야 한다').toBe(200);
            createdDeleted = true;
            await expect(createdRow).toHaveCount(0);
            await expect(deptJobPage.emptyMessage).toBeVisible({ timeout: 20000 });
            const gone = await request.get(`${JOB_API}/${createdSn}`, { headers: auth });
            expect(gone.status(), 'UI 삭제가 실제 삭제로 이어져야 한다').toBe(404);
        }
        finally {
            // 화면을 먼저 떠난 뒤 이 시험이 만든 업무·사용자만 정리한다(업무를 먼저 지워 담당자 참조를 없앤다).
            try {
                await page.goto('about:blank');
            }
            finally {
                for (const deptTaskSn of [createdDeleted ? 0 : createdSn, assignedSn].filter(sn => sn > 0)) {
                    const cleanup = await request.delete(`${JOB_API}/${deptTaskSn}`, { headers: auth });
                    expect(cleanup.status(), '이 시험이 만든 업무를 정리한다').toBe(200);
                }
                if (assigneeCreated) {
                    const cleanupUser = await request.delete(`${USER_API}/${assigneeId}`, { headers: auth });
                    expect(cleanupUser.status(), '이 시험이 만든 합성 사용자를 정리한다').toBe(200);
                }
            }
        }
    });
});
