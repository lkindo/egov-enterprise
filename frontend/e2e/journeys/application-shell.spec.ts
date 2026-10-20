import { expect,test } from '../fixtures/browser-test';
test.describe('공통 셸과 인증', () => {
    test.describe('Core Base (Auth & Dashboard)', () => {
        test.describe('Dashboard Integrity (Session Preserved)', () => {
            test.use({ storageState: 'playwright/.auth/admin.json' });
            test.beforeEach(async ({ page }) => {
                await page.goto('/admin');
            });
            test("관리자 대시보드 통계 카드와 실패 요청 타임라인을 표시한다", async ({ page }) => {
                console.log('>>> Step 1: Verifying Stat Cards');
                await expect(page.getByText('등록 사용자', { exact: true }).first()).toBeVisible();
                await expect(page.getByText('권한 그룹', { exact: true }).first()).toBeVisible();
                console.log('>>> Step 2: Verifying Audit Intelligence Widget');
                // [2026-07-27 정정] 종전에는 `.recharts-surface` 를 기다렸으나 **대시보드에는 recharts 가 없다**.
                // 저장소 전수 확인 결과 recharts 사용처는 admin/stats/IntelligenceHubClient 하나뿐이며,
                // 차트 렌더 검증은 그 페이지의 스펙이 담당한다. 대시보드가 실제로 렌더하는 것은
                // 감사 인텔리전스 타임라인 위젯이므로 그것을 단언한다.
                // [2026-10-20] 그 목록은 시스템 로그(4xx 이상 실패 요청)라 '보안 감사' 가 아니라 '최근 실패 요청' 이다.
                await expect(page.getByRole('heading', { name: '최근 실패 요청' })).toBeVisible({ timeout: 15000 });
                console.log('>>> Step 3: Verifying Stat Card Set');
                // [2026-07-27 정정] '활동 인텔리전스' 는 **코드베이스 어디에도 없는 문구**였다(UI 개편 잔재).
                // 실재하는 통계 카드 제목으로 교체한다. 카드는 리다이렉트 스텁이 아니라 시스템 로그 화면으로 간다.
                await expect(page.getByRole('link', { name: /^실패 요청 로그 —/ })).toHaveAttribute('href', '/admin/system/logs/system');
                // 운영 신호 — 관리자 기본 그룹은 사용자·시스템 로그 조회 권한이 있어 잠긴 계정·오늘 실패 요청이 실린다.
                const signals = page.getByRole('region', { name: '운영 신호' });
                await expect(signals).toBeVisible({ timeout: 15000 });
                await expect(signals.getByText('잠긴 계정', { exact: true })).toBeVisible();
                await expect(signals.getByText('오늘 실패 요청', { exact: true })).toBeVisible();
                await expect(page.getByText(/보안 감사/)).toHaveCount(0);
            });
            test('Global Layout & Navigation Mapping', async ({ page }) => {
                console.log('>>> Step 1: Sidebar Visibility');
                const sidebar = page.locator('aside').first();
                await expect(sidebar).toBeVisible();
                console.log('>>> Step 2: Sidebar Menu Interaction');
                const menuTrigger = page.locator('nav a[href*="/admin/"]').first();
                await expect(menuTrigger).toBeVisible();
                // [E2E 감사 B] 조건부 breadcrumb 단언 제거 — /admin 루트에서 breadcrumb는 선택적이라
                // if(isVisible) 가드가 항상 스킵되던 false-green 스텝이었음. 위 사이드바/네비 단언으로 레이아웃 무결성 검증.
            });
        });
        test.describe('User Portal Integrity (Session Preserved)', () => {
            test.use({ storageState: 'playwright/.auth/user.json' });
            test.beforeEach(async ({ page }) => {
                console.log('>>> Navigating to User Portal Home');
                await page.goto('/');
            });
            test('User Unified Dashboard Rendering', async ({ page }) => {
                console.log('>>> Step 1: Verifying User Layout & Global Navigation');
                const header = page.locator('header').first();
                await expect(header).toBeVisible();
                console.log('>>> Step 2: Verifying Main User Elements');
                // User Portal 특정 대시보드 또는 위젯 텍스트 확인 (일반적으로 나타나는 요소)
                await expect(page.locator('text=전자정부').first()).toBeVisible();
            });
            // [2026-10-20] 업무 홈의 처리 대기 카드 — 일반 사용자 기본 그룹은 네 조회 권한(MEMO_RPT_READ·SCHEDULE_READ·SURVEY_READ·
            //   DEPT_JOB_READ)을 모두 가진다. 카드는 셀 수 있는 값(n건)을 말하고 각 업무 화면으로 잇는다. 늘 비어 있던 활동 구역과
            //   모든 사용자의 미읽음 합계 카드는 없다.
            test('업무 홈 처리 대기 카드가 값을 보이고 각 업무 화면으로 잇는다', async ({ page }) => {
                await expect(page.getByRole('heading', { level: 1, name: '업무 홈' })).toBeVisible({ timeout: 30000 });
                const cards: Array<[label: string, href: string]> = [
                    ['읽지 않은 받은 보고', '/admin/operation/memo-reports'],
                    ['오늘 일정', '/smart-toolkit/schedule'],
                    ['참여할 설문', '/survey'],
                    ['내 담당 업무', '/smart-toolkit/dept-job'],
                ];
                for (const [label, href] of cards) {
                    const link = page.getByRole('link', { name: new RegExp(`^${label}`) });
                    await expect(link).toHaveAttribute('href', href);
                    await expect(link).toContainText(/\d+건$/, { timeout: 15000 });
                }
                await expect(page.getByRole('heading', { name: '최근 활동' })).toHaveCount(0);
                await expect(page.getByText('전체 미읽음 알림')).toHaveCount(0);
                await page.getByRole('link', { name: /^내 담당 업무/ }).click();
                await expect(page).toHaveURL(/\/smart-toolkit\/dept-job$/);
            });
        });
    });
});
test.describe('세션과 전역 탐색', () => {
    test.describe('Common Security & UI Validation', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test('Navigation Integrity: 관리 화면 연속 진입 후에도 셸과 헤딩이 렌더된다', async ({ page }) => {
            const menus = [
                '/admin/system/programs',
                '/admin/system/menus',
            ];
            for (const url of menus) {
                await page.goto(url);
                await expect(page.locator('aside, nav, header').first(), `${url}: 관리 셸이 렌더되지 않음`).toBeVisible();
                await expect(page.locator('h1, h2').first(), `${url}: 페이지 헤딩이 렌더되지 않음`).toBeVisible();
            }
        });
    });
});
