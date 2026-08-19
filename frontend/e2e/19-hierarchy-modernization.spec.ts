import { test, expect } from './fixtures/base-test';
import fs from 'fs';
import path from 'path';

/**
 * [Modernization] Hierarchy & D&D Interface Verification
 *
 * Target Modules:
 * 1. Menus (System Management)
 * 2. Common Code (System Management)
 * 3. Departments (User/Org Hub)
 */

/**
 * storageState(admin.json)에 저장된 accessToken(JWT)을 추출한다.
 * 백엔드 JwtTokenProvider.resolveToken 은 Authorization: Bearer 헤더만 읽고 쿠키는 무시하므로,
 * APIRequestContext(request)에는 쿠키가 있어도 인증이 서지 않는다(→ 익명 트리).
 * 관리자 권한의 '채워진' 트리로 useYn 필터링을 유의미하게 검증하려면 토큰을 명시적으로 헤더에 실어야 한다.
 */
function getAdminBearerToken(): string {
    const authPath = path.resolve('playwright/.auth/admin.json');
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const cookieToken = (state.cookies ?? []).find((c: any) => c.name === 'accessToken')?.value;
    const lsToken = (state.origins?.[0]?.localStorage ?? []).find((l: any) => l.name === 'accessToken')?.value;
    const token = cookieToken ?? lsToken;
    if (!token) {
        throw new Error('[tier-19] admin accessToken 을 playwright/.auth/admin.json 에서 찾을 수 없음 (setup 미실행?)');
    }
    return token;
}

test.describe('Modernization: Hierarchical Interface Verification', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Menu Management Tree Interface', async ({ page }) => {
        console.log('\n>>> Testing Menu Management Tree');
        await page.goto('/admin/system/menus');
        
        // Wait for tree container
        await expect(page.locator('text=네비게이션 트리').first()).toBeVisible({ timeout: 20000 });
        
        // Check for node elements (ID: prefix)
        const nodes = page.getByText(/ID: \d+/);
        await expect(nodes.first()).toBeVisible({ timeout: 15000 });

        // [2026-08-10 제거] 'data-driven modern routes' 블록을 걷어낸다. 세 겹으로 무의미했다:
        //   ① 셀렉터가 `a[href^="/admin/"]` 인데 단언이 `href` 가 `/^\/admin\/.+/` 인지 — 즉
        //      **셀렉터가 이미 보장한 것을 다시 묻는 동어반복**이었다(추가로 증명되는 것은
        //      '/admin/' 뒤에 한 글자 이상 있다' 뿐).
        //   ② 그 셀렉터는 페이지 전역이라 메뉴 트리가 아니라 **좌측 사이드바 링크**를 잡는다.
        //      트리에 링크가 하나도 없어도 사이드바 덕분에 통과한다 — 검증 대상 오인이다.
        //   ③ `if (isVisible)` 가드 안에 있어, 매칭이 없으면 아무것도 검사하지 않았다.
        //   메뉴 트리의 실질 계약(비활성 메뉴가 LNB 에 새지 않는가)은 바로 아래
        //   'Menu useYn State Filtering' 이 API 응답을 재귀 검증하며 소유한다.

        console.log('>>> Menu Tree UI: PASS');
    });

    test('Menu useYn State Filtering', async ({ request }) => {
        console.log('\n>>> Testing Menu useYn State Filtering');

        // LNB 계층 트리를 반환하는 실제 whitelisted 엔드포인트(permitAll): GET /api/v1/menus/head.
        // (기존 /api/v1/user/system/menus/hierarchy 는 존재하지 않는 경로였음 → 401/404.)
        // 관리자 토큰을 Bearer 로 실어 '채워진' 관리자 트리를 받는다(익명 트리는 비어 있어 검증 불가).
        const token = getAdminBearerToken();
        const response = await request.get('/api/v1/menus/head', {
            headers: { Authorization: `Bearer ${token}` },
        });

        // [E2E 감사 B] 200 응답 + 비어있지 않은 트리를 요구한 뒤 재귀 검증한다.
        // (과거: 엔드포인트 실패나 빈 배열도 조용히 통과해 필터링을 한 번도 검증하지 못했음)
        expect(response.ok(), `menus/head 엔드포인트 응답 실패: ${response.status()}`).toBeTruthy();

        // ApiResponse 래퍼 구조: { ..., data: { list: List<MenuDto> } } — 각 노드는 .useYn / .children 을 가진다.
        const body = await response.json();
        const rootNodes: any[] = body?.data?.list ?? [];
        expect(Array.isArray(rootNodes) && rootNodes.length > 0, 'LNB 계층 트리가 비어 있어 useYn 필터링을 검증할 수 없음').toBeTruthy();

        const checkNoInactiveMenus = (nodes: any[]) => {
            for (const node of nodes) {
                expect(node.useYn, `메뉴 '${node.menuNm}'(id=${node.id})가 useYn='N'인데 LNB 트리에 노출됨`).not.toBe('N');
                if (Array.isArray(node.children) && node.children.length > 0) {
                    checkNoInactiveMenus(node.children);
                }
            }
        };
        checkNoInactiveMenus(rootNodes);
        console.log('>>> useYn Filtering verified via API (menus/head): PASS');
    });

    test('Common Code Explorer Interface', async ({ page }) => {
        console.log('\n>>> Testing Common Code Explorer');
        await page.goto('/admin/system/common-code');
        
        // Wait for explorer aside
        await expect(page.locator('text=Explorer').first()).toBeVisible({ timeout: 20000 });
        
        // Check for cluster/domain items
        const domains = page.getByText(/\d+ Domains/);
        await expect(domains).toBeVisible({ timeout: 15000 });
        
        console.log('>>> Common Code Explorer UI: PASS');
    });

    test('Department Topology Tree (Hub)', async ({ page, request }) => {
        console.log('\n>>> Testing Department Topology Tree in Hub');
        await page.goto('/admin/user/manage');
        
        // Switch to DEPTS tab
        const deptTab = page.locator('button:has-text("부서 관리")').first();
        await expect(deptTab).toBeVisible();
        await deptTab.click();
        
        // Wait for tree title
        await expect(page.locator('text=조직 구조').first()).toBeVisible({ timeout: 20000 });
        
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
        await page.reload();
        await page.locator('button:has-text("부서 관리")').first().click();
        // [2026-07-27 정정] 종전 단언은 /ORGNZT_\d+/ 였다. 그러나 채번 통일 이후 부서 ID 는
        // ORGNZT_EAF12DAFF8A14 처럼 **16진수**라 `\d+` 에 매칭되지 않는다(실측). 게다가 트리는 ID 가 아니라
        // 부서명을 렌더하고 ID 는 상세 패널의 '부서 코드' 에만 나온다. 방금 만든 부서명으로 단언한다.
        await expect(page.getByText(deptName, { exact: false }).first()).toBeVisible({ timeout: 20000 });
        
        console.log('>>> Department Topology Tree UI: PASS');
    });

    test('Atomic Hierarchy Save Button Visibility', async ({ page }) => {
        console.log('\n>>> Testing Save Button initial (hidden) state');
        await page.goto('/admin/user/manage');

        // Switch to DEPTS tab
        await page.locator('button:has-text("부서 관리")').click();

        // [E2E 감사 B] 부서 트리가 실제로 로드됐는지(positive) 먼저 단언 — 그래야 'Save 버튼 부재'가 의미를 가짐.
        // (과거: not.toBeVisible만 있어 기능이 아예 렌더되지 않는 페이지도 vacuously 통과)
        await expect(page.locator('text=조직 구조').first()).toBeVisible({ timeout: 20000 });

        // ⚠ 종전에는 'Save Structure' 를 찾고 있었다. 그런 문자열은 이 저장소 어디에도 없다
        //   (실제 버튼 라벨은 '조직 계층 저장'). 즉 이 단언은 기능이 어떤 상태든 항상 통과하는
        //   vacuous 단언이었다 — 위의 positive 가드를 붙인 뒤에도 이 줄만은 아무것도 검증하지
        //   못하고 있었다. 실제 라벨로 교정한다.
        await expect(page.locator('button:has-text("조직 계층 저장")')).not.toBeVisible();

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
        const idA = await mk(`${prefix}_A`);
        const idB = await mk(`${prefix}_B`);

        // 어느 쪽이 자식이 되는지는 화면 순서에 달려 있다. 정리 순서(자식 → 부모)를 위해 밖에 둔다.
        let childId = idB;
        let parentId = idA;

        try {
            await page.goto('/admin/user/manage');
            await page.locator('button:has-text("부서 관리")').click();
            await expect(page.locator('text=조직 구조').first()).toBeVisible({ timeout: 20000 });

            // 방금 만든 두 부서만 남기도록 검색으로 트리를 좁힌다(기본 조회는 10건 페이지라
            // 새 부서가 첫 페이지에 없을 수 있다).
            // [2026-07-27 정정] 종전 셀렉터는 일반적인 placeholder 의 **전역 유일성**에 의존해, 전체 스위트
            // 실행 시 다른 화면/모달의 잔여 입력과 함께 3개가 매칭되어 strict mode violation 으로 실패했다.
            // 격리 재현 2회에서 이 화면의 부서 검색 입력은 **1개**임을 확인했으므로(앱 중복 아님),
            // 의미가 명확한 aria-label 로 좁히고 first() 로 고정한다.
            const departmentSearch = page.getByRole('textbox', { name: '부서 검색' }).first();
            await Promise.all([
                page.waitForResponse((response) => {
                    if (!response.url().includes('/api/v1/admin/system/departments')) return false;
                    return new URL(response.url()).searchParams.get('keyword') === prefix;
                }, { timeout: 20000 }),
                departmentSearch.fill(prefix),
            ]);

            // [2026-07-27 정정] 부서 노드 버튼이 DOM 에 2개 매칭돼 strict mode violation 이 났다
            // (D&D 정렬 노드가 트리/목록 양쪽에 렌더). 드래그 대상은 트리의 첫 노드이므로 first() 로 고정한다.
            // 검색은 디바운스로 트리를 다시 렌더한다. 노드를 잡은 직후 재렌더가 오면
            // scrollIntoViewIfNeeded 단계에서 "Element is not attached to the DOM" 으로 깨진다(실측).
            // 검색 응답 뒤 locator를 새로 해석해 재렌더 중 분리된 이전 노드를 잡지 않는다.
            const nodeA = page.locator('button', { hasText: idA }).first();
            const nodeB = page.locator('button', { hasText: idB }).first();
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
            const secondBox = (boxA!.y < boxB!.y) ? boxB! : boxA!;
            parentId = (boxA!.y < boxB!.y) ? idA : idB;
            childId = (boxA!.y < boxB!.y) ? idB : idA;

            // 저장 버튼은 변경 전에는 없어야 한다(변경 후 '나타나는' 것이 이 테스트의 관측 대상).
            const saveBtn = page.locator('button:has-text("조직 계층 저장")');
            await expect(saveBtn).not.toBeVisible();

            // ── 제자리 가로 드래그: dnd-kit 센서가 반응하도록 가로/세로 이동을 병합
            const startX = secondBox.x + secondBox.width / 2;
            const startY = secondBox.y + secondBox.height / 2;
            await page.mouse.move(startX, startY);
            await page.mouse.down();
            // 임계를 단계적으로 넘기며 세로 흔들림을 주어 PointerSensor를 완벽하게 활성화시킵니다.
            await page.mouse.move(startX + 5, startY + 2, { steps: 3 });
            await page.mouse.move(startX + 15, startY + 4, { steps: 5 });
            await page.mouse.move(startX + 50, startY + 5, { steps: 8 }); // 50px 이동 (depth +2 시도, 클램프로 +1 적용)
            await page.mouse.up();

            // 계층이 바뀌었으므로 저장 버튼이 '나타나야' 한다. (hasDeptChanges=true)
            await expect(saveBtn, '가로 드래그로 깊이가 바뀌면 저장 버튼이 나타나야 한다').toBeVisible({ timeout: 15000 });
            await saveBtn.click();

            // 저장이 실제로 영속되는지는 화면이 아니라 서버에 묻는다.
            // 🚨 216fb9c98 의 증상이 정확히 "sort_ordr 는 저장되는데 up_ognz_id 만 null" 이었으므로
            //    상위 부서 값을 직접 단언해야 한다.
            await expect
                .poll(async () => {
                    const res = await request.get(`${DEPT_API}/${childId}`, { headers: auth });
                    return (await res.json()).data?.upOgnzId ?? null;
                }, { timeout: 20000, message: '드래그한 부서의 상위 부서가 저장되어야 한다 (up_ognz_id 미저장 회귀)' })
                .toBe(parentId);
        } finally {
            // 자식부터 지운다 — 하위 부서가 있으면 삭제가 409 로 막힌다.
            await request.delete(`${DEPT_API}/${childId}`, { headers: auth });
            await request.delete(`${DEPT_API}/${parentId}`, { headers: auth });
        }
    });
});
