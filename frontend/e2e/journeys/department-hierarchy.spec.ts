import { expect,test } from '../fixtures/browser-test';
import { getAdminBearerToken } from '../utils/admin-token';
test.describe('Modernization: Hierarchical Interface Verification', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test('Department Topology Tree (Hub)', async ({ page, request }) => {
        console.log('\n>>> Testing Department Topology Tree in Hub');
        await page.goto('/admin/user/departments');
        await expect(page.getByRole('heading', { level: 1, name: '부서 및 조직 관리', exact: true })).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('조직 구조', { exact: true })).toHaveCount(1);
        await expect(page.getByRole('textbox', { name: '부서 검색' })).toHaveCount(1);
        await expect(page.getByTestId('master-detail-incremental-layout')).toHaveCount(1);
        // Check for topology nodes (e.g., ORGNZT_0000000000001)
        // [2026-07-27 정정] 종전에는 기존 부서(ORGNZT_*)가 화면에 있다고 **가정**했다. 그러나 신규 DB
        // (CI 컨테이너)에는 부서가 0건이라(tb_ognz_info count=0 실측) 트리에 표시할 노드가 없어 실패했다.
        // 공유 DB 의 누적 데이터에 의존하던 형태다. 같은 스펙의 D&D 테스트가 이미 쓰는 방식대로
        // **자체 생성**으로 전환한다 — 시드로 채우면 누적 쓰레기가 다시 쌓인다.
        const auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
        const deptName = `E2E19T${Date.now().toString().slice(-8)}`;
        const created = await request.post('/api/v1/admin/system/departments', {
            headers: auth,
            data: { ognzNm: deptName },
        });
        expect(created.ok(), '토폴로지 검증용 부서 생성이 성공해야 한다').toBeTruthy();
        const createdId = (await created.json()).data as string;
        try {
            await page.reload();
            // [2026-07-27 정정] 종전 단언은 /ORGNZT_\d+/ 였다. 그러나 채번 통일 이후 부서 ID 는
            // ORGNZT_EAF12DAFF8A14 처럼 **16진수**라 `\d+` 에 매칭되지 않는다(실측). 게다가 트리는 ID 가 아니라
            // 부서명을 렌더하고 ID 는 상세 패널의 '부서 코드' 에만 나온다. 방금 만든 부서명으로 단언한다.
            const createdNode = page.locator('[data-a2-master-item]', { hasText: deptName });
            await expect(createdNode).toHaveCount(1);
            await expect(createdNode).toBeVisible({ timeout: 20000 });
            await createdNode.click();
            await expect(createdNode).toHaveAttribute('aria-current', 'true');
            await expect(page.getByRole('heading', { level: 2, name: deptName, exact: true })).toBeVisible();
        }
        finally {
            await request.delete(`/api/v1/admin/system/departments/${createdId}`, { headers: auth });
        }
        console.log('>>> Department Topology Tree UI: PASS');
    });
    test('Atomic Hierarchy Save Button Visibility', async ({ page }) => {
        console.log('\n>>> Testing Save Button initial disabled state');
        await page.goto('/admin/user/departments');
        // [E2E 감사 B] 부서 트리가 실제로 로드됐는지(positive) 먼저 단언 — 그래야 저장 비활성이 의미를 갖는다.
        // (과거: not.toBeVisible만 있어 기능이 아예 렌더되지 않는 페이지도 vacuously 통과)
        await expect(page.getByText('조직 구조', { exact: true })).toBeVisible({ timeout: 20000 });
        // ⚠ 종전에는 'Save Structure' 를 찾고 있었다. 그런 문자열은 이 저장소 어디에도 없다
        //   (실제 버튼 라벨은 '조직 계층 저장'). 즉 이 단언은 기능이 어떤 상태든 항상 통과하는
        //   vacuous 단언이었다 — 위의 positive 가드를 붙인 뒤에도 이 줄만은 아무것도 검증하지
        //   못하고 있었다. 실제 라벨로 교정한다.
        const saveButton = page.getByRole('button', { name: '조직 계층 저장' });
        await expect(saveButton).toBeVisible();
        await expect(saveButton).toBeDisabled();
        console.log('>>> Initial Save Button State: PASS');
    });
    /**
     * 조직도 D&D 계층 변경 — positive 검증.
     *
     * 2026-07-19 에 이 화면의 D&D 가 두 번 수리됐는데 회귀 방어가 없었다.
     *  · 216fb9c98: onDragEnd 가 getDeptProjection 에 dragOffset=0 을 하드코딩해
     *      projectedDepth = depth + Math.round(0 / 24) = 기존 깊이 가 되어, 가로로 아무리 끌어도
     *      계층이 바뀌지 않고 순서(sort_ordr)만 저장됐다(up_ognz_id 는 계속 null).
     *  · 67a710616: 투영을 onDragEnd 에서 한 번만 계산해 놓기 전엔 결과를 알 수 없었고,
     *      반영 판정이 '위치가 바뀌었는가(active !== over)'라 **제자리에서 가로로만 밀어
     *      깊이를 바꾸는 조작이 통째로 무시**됐다. 지금은 onDragMove/onDragOver 로 실시간 투영하고
     *      판정 기준도 '투영이 있는가'로 바뀌었다.
     *
     * 아래 시나리오는 정확히 그 '제자리 가로 드래그'를 재현하므로 두 회귀를 한 번에 잡는다.
     *
     * ⚠⚠ 자동화 드래그의 함정 (커밋 a83adb3b2 본문에 기록된 것)
     *   이 화면의 dnd-kit 은 PointerSensor 에 activationConstraint{distance: 8} 이 걸려 있어
     *   **단순 dragTo()/한 번의 mouse.move 로는 드래그가 활성화되지 않는다.** 포인터를 누른 뒤
     *   8px 임계를 넘겨 여러 단계(steps)로 움직여야 센서가 깨어난다 — 아래 mouse.down/move 구간이
     *   그 대응이다. 과거 "저장을 눌렀는데 PUT 이 안 나갔다"는 관측이 앱 결함으로 단정되지 못한
     *   이유가 이 함정이었다.
     *
     *   깊이 계산은 delta.x 를 INDENTATION_WIDTH(=24px)로 나눠 반올림한다(treeUtils.getDeptProjection).
     *   따라서 오른쪽으로 24px 이상 밀어야 depth 가 +1 되고, maxDepth 는 '바로 위 형제의 depth+1'
     *   로 클램프된다 — 그래서 **두 번째 노드**를 끌어야 부모가 생긴다(첫 노드는 maxDepth 가 0).
     */
    test('Dept Hierarchy D&D — 가로 드래그가 상위 부서를 실제로 바꾸고 저장된다', async ({ page, request }) => {
        const auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
        const DEPT_API = '/api/v1/admin/system/departments';
        // 트리에 잡음이 섞이지 않도록 이 실행에만 쓰이는 접두사로 검색을 좁힌다.
        const prefix = `E2E19D${Date.now().toString().slice(-8)}`;
        const mk = async (nm: string) => {
            const res = await request.post(DEPT_API, { headers: auth, data: { ognzNm: nm } });
            expect(res.ok(), '부서 등록이 성공해야 한다').toBeTruthy();
            return (await res.json()).data as string;
        };
        const nameA = `${prefix}_A`;
        const nameB = `${prefix}_B`;
        const idA = await mk(nameA);
        const idB = await mk(nameB);
        // 어느 쪽이 자식이 되는지는 화면 순서에 달려 있다. 정리 순서(자식 → 부모)를 위해 밖에 둔다.
        let childId = idB;
        let parentId = idA;
        let childName = nameB;
        try {
            await page.goto('/admin/user/departments');
            await expect(page.getByText('조직 구조', { exact: true })).toBeVisible({ timeout: 20000 });
            // 방금 만든 두 부서만 남기도록 검색으로 트리를 좁힌다(기본 조회는 10건 페이지라
            // 새 부서가 첫 페이지에 없을 수 있다).
            // [2026-07-27 정정] 종전 셀렉터는 일반적인 placeholder 의 **전역 유일성**에 의존해, 전체 스위트
            // 실행 시 다른 화면/모달의 잔여 입력과 함께 3개가 매칭되어 strict mode violation 으로 실패했다.
            // A2는 viewport와 무관하게 master DOM을 하나만 렌더해야 한다. first()로 중복을 숨기지 않는다.
            const departmentSearch = page.getByRole('textbox', { name: '부서 검색' });
            await expect(departmentSearch).toHaveCount(1);
            await Promise.all([
                page.waitForResponse((response) => {
                    if (!response.url().includes('/api/v1/admin/system/departments'))
                        return false;
                    return new URL(response.url()).searchParams.get('keyword') === prefix;
                }, { timeout: 20000 }),
                // [DIP C9] 검색어는 조회/Enter 로 적용한다 — 입력만으로는 조회하지 않는다.
                departmentSearch.fill(prefix).then(() => departmentSearch.press('Enter')),
            ]);
            // 검색은 트리를 다시 렌더한다. 노드를 잡은 직후 재렌더가 오면
            // scrollIntoViewIfNeeded 단계에서 "Element is not attached to the DOM" 으로 깨진다(실측).
            // 검색 응답 뒤 locator를 새로 해석해 재렌더 중 분리된 이전 노드를 잡지 않는다.
            const nodeA = page.locator('[data-a2-master-item]', { hasText: idA });
            const nodeB = page.locator('[data-a2-master-item]', { hasText: idB });
            await expect(nodeA).toHaveCount(1);
            await expect(nodeB).toHaveCount(1);
            await expect(nodeA).toBeVisible({ timeout: 20000 });
            await expect(nodeB).toBeVisible({ timeout: 20000 });
            // ── 뷰포트 밖 영역 잘림을 방지하기 위해 노드를 스크롤 영역 내부로 가져옵니다.
            await nodeA.scrollIntoViewIfNeeded();
            await nodeB.scrollIntoViewIfNeeded();
            // 화면상 아래쪽 노드가 '두 번째'다 — API 정렬 순서를 가정하지 않고 좌표로 판정한다.
            const boxA = await nodeA.boundingBox();
            const boxB = await nodeB.boundingBox();
            expect(boxA && boxB, '두 부서 노드의 위치를 얻을 수 있어야 한다').toBeTruthy();
            // 위쪽 노드가 부모 후보(바로 위 형제), 아래쪽 노드가 끌 대상(자식이 된다).
            parentId = (boxA!.y < boxB!.y) ? idA : idB;
            childId = (boxA!.y < boxB!.y) ? idB : idA;
            childName = (boxA!.y < boxB!.y) ? nameB : nameA;
            // A2는 저장 동작을 항상 발견 가능하게 두되, 선택·변경 전에는 비활성화한다.
            const saveBtn = page.getByRole('button', { name: '조직 계층 저장' });
            await expect(saveBtn).toBeVisible();
            await expect(saveBtn).toBeDisabled();
            const dragHandleName = `${childName} (${childId}) 순서 이동 핸들`;
            const dragHandle = page.getByRole('button', { name: dragHandleName, exact: true });
            // DragOverlay의 복제 핸들은 aria-hidden 안에 있고 disabled다.
            const dragOverlay = page.getByRole('button', {
                name: dragHandleName, exact: true, includeHidden: true, disabled: true,
            });
            await expect(dragHandle).toHaveCount(1);
            const handleBox = await dragHandle.boundingBox();
            expect(handleBox, '드래그 핸들의 위치를 얻을 수 있어야 한다').toBeTruthy();
            // ── 제자리 가로 드래그: dnd-kit 센서가 반응하도록 가로/세로 이동을 병합
            const startX = handleBox!.x + handleBox!.width / 2;
            const startY = handleBox!.y + handleBox!.height / 2;
            await page.mouse.move(startX, startY);
            await page.mouse.down();
            // 임계를 단계적으로 넘기며 세로 흔들림을 주어 PointerSensor를 완벽하게 활성화시킵니다.
            await page.mouse.move(startX + 5, startY + 2, { steps: 3 });
            await page.mouse.move(startX + 15, startY + 4, { steps: 5 });
            await page.mouse.move(startX + 50, startY + 5, { steps: 8 }); // 50px 이동 (depth +2 시도, 클램프로 +1 적용)
            await expect(dragOverlay, '포인터 드래그가 활성화되어야 한다').toHaveCount(1);
            await page.mouse.up();
            // dnd-kit은 드롭 직후 document의 click 전파를 잠시 차단한다. 버튼 enabled만 보고
            // 바로 클릭하면 저장 요청이 삼켜진다. 이동한 overlay의 드롭 애니메이션 완료를 기다린다.
            await expect(dragOverlay, '드롭 애니메이션이 끝나야 다음 동작을 시작한다').toHaveCount(0);
            // 계층이 바뀌었고 drag start가 해당 행을 선택했으므로 같은 저장 버튼이 활성화된다.
            await expect(saveBtn, '가로 드래그로 깊이가 바뀌면 저장 버튼이 활성화되어야 한다').toBeEnabled({ timeout: 15000 });
            const [saveResponse] = await Promise.all([
                page.waitForResponse(response => response.request().method() === 'POST'
                    && new URL(response.url()).pathname === '/admin/user/departments'
                    && response.request().headers()['next-action'] !== undefined),
                saveBtn.click(),
            ]);
            expect(saveResponse.ok(), '조직 계층 저장 요청이 성공해야 한다').toBeTruthy();
            // 저장이 실제로 영속되는지는 화면이 아니라 서버에 묻는다.
            // 🚨 216fb9c98 의 증상이 정확히 "sort_ordr 는 저장되는데 up_ognz_id 만 null" 이었으므로
            //    상위 부서 값을 직접 단언해야 한다.
            await expect
                .poll(async () => {
                const res = await request.get(`${DEPT_API}/${childId}`, { headers: auth });
                return (await res.json()).data?.upOgnzId ?? null;
            }, { timeout: 20000, message: '드래그한 부서의 상위 부서가 저장되어야 한다 (up_ognz_id 미저장 회귀)' })
                .toBe(parentId);
        }
        finally {
            // 자식부터 지운다 — 하위 부서가 있으면 삭제가 409 로 막힌다.
            await request.delete(`${DEPT_API}/${childId}`, { headers: auth });
            await request.delete(`${DEPT_API}/${parentId}`, { headers: auth });
        }
    });
});
