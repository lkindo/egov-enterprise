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
            await expect(page.getByText('네비게이션 트리', { exact: true })).toHaveCount(1);
            await expect(page.getByRole('textbox', { name: '메뉴 검색' })).toHaveCount(1);
            await expect(page.getByTestId('master-detail-master')).toHaveCount(1);
            await expect(page.getByTestId('master-detail-detail')).toHaveCount(1);
            await expect(page.getByText('메뉴를 선택하세요', { exact: true })).toBeVisible();
            // Check for node elements (ID: prefix)
            const nodes = page.getByText(/ID: \d+/);
            await expect(nodes.first()).toBeVisible({ timeout: 15000 });
            const firstMenu = page.locator('[data-a2-master-item]').first();
            await firstMenu.click();
            await expect(firstMenu).toHaveAttribute('aria-current', 'true');
            await expect(page.getByRole('button', { name: '메뉴 수정' })).toBeVisible();
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
