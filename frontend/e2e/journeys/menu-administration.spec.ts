import { expect,test } from '../fixtures/browser-test';
import { OpsGovernancePage } from '../pages/OpsGovernancePage';
test.describe('조직과 메뉴 설정', () => {
    /**
     * Ops Governance
     * 시스템의 보안과 운영 효율성을 극대화하는 영역 검증
     */
    test.describe('Ops Governance', () => {
        test.use({ viewport: { width: 1920, height: 1080 } });
        test("권한 그룹을 선택하면 그룹별 메뉴 트리 또는 명시적 빈 상태를 표시한다", async ({ adminPage }) => {
            const opsPage = new OpsGovernancePage(adminPage);
            await test.step('Admin: Navigate to Menu By Authority', async () => {
                await opsPage.gotoMenuByAuthority();
            });
            await test.step('Admin: Verify Role-based Menu Tree Generation', async () => {
                // Selecting an existing role like SYSTEM_ADMIN or general Admin
                await opsPage.verifyMenuRoleMapping('관리자');
            });
        });
    });
});
test.describe('계층 편집', () => {
    test.describe('Modernization: Hierarchical Interface Verification', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test('Menu Management Tree Interface', async ({ page }) => {
            console.log('\n>>> Testing Menu Management Tree');
            await page.goto('/admin/system/menus');
            await expect(page.getByRole('heading', { level: 1, name: '시스템 메뉴 관리' })).toBeVisible({ timeout: 20000 });
            // [2026-10-02 D1] 마스터는 보드다 — 영역(최상위 메뉴) 탭 → 2단계 카드 → 3단계 줄.
            await expect(page.getByText('메뉴 구조', { exact: true })).toHaveCount(1);
            await expect(page.getByRole('textbox', { name: '메뉴 검색' })).toHaveCount(1);
            await expect(page.getByTestId('master-detail-master')).toHaveCount(1);
            await expect(page.getByTestId('master-detail-detail')).toHaveCount(1);
            await expect(page.getByText('메뉴를 선택하세요', { exact: true })).toBeVisible();
            const areaTabs = page.getByRole('tablist', { name: '메뉴 영역' }).getByRole('tab');
            await expect(areaTabs.first()).toHaveAttribute('aria-selected', 'true');
            // [2026-10-05 2차 리뷰] 흔한 노트북 해상도(사이드바 펼침)에서 보드 첫 줄이 마스터 칸 안에 보인다 — 칸 머리·탭 줄·상태
            //   줄만 남고 보드가 0줄이던 회귀(Chromium 실측 1366×768·1280×720)를 배치로 잰다. click·toBeVisible 은 자동 스크롤과
            //   상자 존재만 보므로 이 회귀를 잡지 못했다. 마지막 크기는 이 여정의 기본 크기(1280×720)라 아래 단계는 그대로다.
            for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
                await page.setViewportSize(viewport);
                await page.evaluate(() => window.scrollTo(0, 0));
                const pane = page.getByTestId('master-detail-master');
                const firstLine = page.locator('[data-menu-board-scroll] section[data-menu-card] [data-a2-master-item]').first();
                await expect(firstLine).toBeVisible();
                const paneBox = await pane.boundingBox();
                const lineBox = await firstLine.boundingBox();
                expect(paneBox, `${viewport.width}x${viewport.height} 마스터 칸`).not.toBeNull();
                expect(lineBox, `${viewport.width}x${viewport.height} 보드 첫 줄`).not.toBeNull();
                expect(lineBox!.y, '보드 첫 줄이 마스터 칸 위로 벗어났다').toBeGreaterThanOrEqual(paneBox!.y);
                expect(lineBox!.y + lineBox!.height, '보드 첫 줄이 마스터 칸 아래로 밀려났다').toBeLessThanOrEqual(paneBox!.y + paneBox!.height);
                expect(lineBox!.y + lineBox!.height, '보드 첫 줄이 화면 아래로 밀려났다').toBeLessThanOrEqual(viewport.height);
            }
            // [2026-10-05] 보드 줄은 한 줄이다 — 'ID: n' 은 화면 글자가 아니라 줄의 접근 이름에 있다(번호·경로는 title 과 상세).
            const nodes = page.getByRole('button', { name: / ID: \d+/ });
            await expect(nodes.first()).toBeVisible({ timeout: 15000 });
            const firstMenu = page.locator('[data-a2-master-item]').first();
            await firstMenu.click();
            await expect(firstMenu).toHaveAttribute('aria-current', 'true');
            // 상세는 즉시 저장 수정 창이 아니라 초안에 바로 반영되는 편집 칸이다.
            await expect(page.getByRole('textbox', { name: '메뉴 이름' })).toBeVisible();
            // 구조 초안: 끌지 않고 옮긴 결과는 저장 전까지 화면에만 있다. 같은 DB 를 쓰는 다른 shard 가 시드 메뉴 순서에
            //   기대므로 저장하지 않고 '모두 되돌리기' 로 끝낸다(useUnsavedChanges 도 비운다).
            const saveStructure = page.getByRole('button', { name: '변경 저장' });
            await expect(saveStructure).toBeDisabled();
            await expect(page.getByRole('button', { name: '한 칸 아래로' })).toBeVisible();
            // '다른 곳으로 옮기기' 대화상자는 열었다 닫아도 아무것도 바꾸지 않는다.
            await page.getByRole('button', { name: '다른 곳으로 옮기기…' }).click();
            const moveDialog = page.getByRole('dialog', { name: '다른 곳으로 옮기기' });
            await expect(moveDialog.getByRole('button', { name: '선택한 위치로 메뉴 옮기기' })).toBeDisabled();
            await moveDialog.getByRole('button', { name: '옮기기 취소' }).click();
            await expect(moveDialog).toHaveCount(0);
            await expect(saveStructure).toBeDisabled();
            const firstMenuNo = await firstMenu.getAttribute('data-menu-no');
            const movedMenu = page.locator(`[data-a2-master-item][data-menu-no="${firstMenuNo}"]`);
            await movedMenu.press('Alt+ArrowDown');
            const changeToggle = page.getByRole('button', { name: '변경 1건', exact: true });
            await expect(changeToggle).toBeVisible();
            await expect(saveStructure).toBeEnabled();
            // 옮긴 메뉴는 선택과 포커스를 유지한다 — 항목이 자리를 바꿔도 키보드 사용자가 자리를 잃지 않는다.
            await expect(movedMenu).toHaveAttribute('aria-current', 'true');
            await expect(movedMenu).toBeFocused();
            await expect(page.getByRole('tab', { name: /1건 변경$/ })).toBeVisible();
            await changeToggle.click();
            await page.getByRole('button', { name: '모두 되돌리기', exact: true }).click();
            await page.getByRole('dialog').getByRole('button', { name: '모두 되돌리기', exact: true }).click();
            // '변경 n건' 단추는 늘 그려 도구 줄 폭을 고정한다 — 되돌린 뒤에는 사라지는 것이 아니라 '변경 0건' 으로 막힌다
            //   (2차 리뷰: 종전 단언 toHaveCount(0) 은 이름만 바뀌어 통과해 무엇을 확인하는지 흐렸다).
            await expect(page.getByRole('button', { name: '변경 0건', exact: true })).toBeDisabled();
            await expect(saveStructure).toBeDisabled();
            await expect(page.locator('[data-a2-master-item]').first()).toHaveAttribute('data-menu-no', firstMenuNo ?? '');
            // 찾기는 목록을 거르지 않고, Enter 가 일치 메뉴를 골라 그 영역 탭을 연다.
            const search = page.getByRole('textbox', { name: '메뉴 검색' });
            await search.fill('권한 그룹 관리');
            await search.press('Enter');
            await expect(page.locator('[data-a2-master-item][aria-current="true"]')).toContainText('권한 그룹 관리');
            await expect(page.getByRole('tab', { name: /^관리 센터/ })).toHaveAttribute('aria-selected', 'true');
            await search.fill('');
            // [2026-08-10 제거] 'data-driven modern routes' 블록을 걷어낸다. 세 겹으로 무의미했다:
            //   ① 셀렉터가 `a[href^="/admin/"]` 인데 단언이 `href` 가 `/^\/admin\/.+/` 인지 — 즉
            //      **셀렉터가 이미 보장한 것을 다시 묻는 동어반복**이었다(추가로 증명되는 것은
            //      '/admin/' 뒤에 한 글자 이상 있다' 뿐).
            //   ② 그 셀렉터는 페이지 전역이라 메뉴 트리가 아니라 **좌측 사이드바 링크**를 잡는다.
            //      트리에 링크가 하나도 없어도 사이드바 덕분에 통과한다 — 검증 대상 오인이다.
            //   ③ `if (isVisible)` 가드 안에 있어, 매칭이 없으면 아무것도 검사하지 않았다.
            //   메뉴 트리의 실질 계약(비활성 메뉴가 LNB 에 새지 않는가)은 바로 아래
            //   'Menu useYn State Filtering' 이 API 응답을 재귀 검증하며 소유한다.
            // Real seeded IA: pure folders select an area, and the canonical authority page
            // has one current leaf across the same sidebar tree after the legacy redirect.
            await page.setViewportSize({ width: 1440, height: 1000 });
            const areas = page.getByRole('navigation', { name: '주메뉴 네비게이션', exact: true });
            await expect(areas.getByRole('link', { name: '나의 업무', exact: true })).toBeVisible();
            for (const name of ['소통·지식', '참여', '관리 센터']) {
                await expect(areas.getByRole('button', { name: `${name} 메뉴 보기`, exact: true })).toBeVisible();
            }
            await areas.getByRole('button', { name: '참여 메뉴 보기', exact: true }).click();
            await expect(page).toHaveURL(/\/admin\/system\/menus$/);
            const sidebar = page.getByRole('navigation', { name: '주 메뉴 탐색', exact: true });
            await expect(sidebar.getByRole('link', { name: '설문 참여', exact: true })).toBeVisible();
            await expect(sidebar.getByRole('link', { name: '투표 참여', exact: true })).toBeVisible();
            await page.goto('/admin/security/role');
            await expect(page).toHaveURL(/\/admin\/security\/authority$/);
            await expect(areas.getByRole('button', { name: '관리 센터 메뉴 보기', exact: true })).toHaveAttribute('aria-pressed', 'true');
            await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1);
            await expect(sidebar.locator('[aria-current="page"]')).toHaveText('권한 그룹 관리');
            await expect(sidebar.getByRole('link', { name: '롤관리', exact: true })).toHaveCount(0);
            console.log('>>> Menu Tree UI: PASS');
        });
    });
});
