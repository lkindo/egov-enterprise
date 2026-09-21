import { expect,test } from '../fixtures/browser-test';
import { getAdminBearerToken } from '../utils/admin-token';
test.describe('부서 일정 진입', () => {
    /**
     * Enterprise Workflow & Productivity
     * 전자결재 및 스마트 툴킷(일정, 업무보고) 등 핵심 기업 워크플로우 검증
     */
    test.describe('Enterprise Workflow & Productivity', () => {
        test.use({
            storageState: 'playwright/.auth/admin.json',
            viewport: { width: 1920, height: 1080 }
        });
        test("부서 일정 화면의 제목과 표를 표시한다", async ({ page }) => {
            console.log('\n>>> Starting Productivity: Smart Toolkit - Schedule');
            await page.goto('/smart-toolkit/schedule/dept');
            // 일정 관리 대시보드 확인
            await expect(page.locator('.hub-title-main, h1, h2').filter({ hasText: /일정|Schedule/i }).first()).toBeVisible();
            console.log('>>> Verifying Schedule Table visibility');
            const table = page.locator('table');
            await expect(table.first()).toBeVisible();
        });
    });
});
test.describe('캘린더 조작', () => {
    const SCHEDULE_API = '/api/v1/schedules';
    /** 이 스펙이 만든 자원만 지우기 위한 접두사. cleanup 정책과 충돌하지 않게 고유값을 쓴다. */
    const PREFIX = 'E2E24_';
    test.describe('조직 ↔ 일정 통합 사슬', () => {
        // UI 검증은 저장된 관리자 세션을 재사용한다. 이 선언이 없으면 미인증 상태로 로그인 화면이 뜬다.
        // (API 검증은 아래 Bearer 헤더를 직접 싣는다 — 백엔드는 쿠키를 읽지 않는다.)
        test.use({ storageState: 'playwright/.auth/admin.json' });
        let auth: Record<string, string>;
        test.beforeAll(() => {
            auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
        });
        test('캘린더 탭 — 일정 등록·수정·삭제 UI 가 노출된다', async ({ page, request }) => {
            // UI 검증용 일정 1건을 API 로 만들어 둔다(등록 폼 자체는 아래에서 별도로 연다).
            //
            // [2026-08-03 시한폭탄 제거] 종전엔 '20260716' 하드코딩이었다. 그런데 캘린더 탭은
            //   WorkHubClient 가 `format(currentDate, 'yyyyMM')` 로 **현재 달**만 조회한다(monthly API).
            //   그래서 이 픽스처는 2026-07 에만 목록에 나타났고, 8월이 되자 목록이 비어
            //   schedule-edit 버튼이 존재하지 않아 실패했다 — 제품 결함도 플레이키도 아닌
            //   테스트가 특정 달에만 성립하도록 쓰여 있던 문제다.
            //   (위 API 전용 테스트들의 하드코딩 날짜는 조회도 같은 yearMonth 로 하므로 자기정합적이다.)
            //
            //   현재 달의 15일로 만든다 — 1일/말일을 피하면 하루 경계의 어긋남도 함께 없앤다.
            //   selectedDate 는 초기값이 undefined 라 그 달의 일정이면 어느 날짜든 목록에 나온다
            //   (visibleSchedules 참조).
            //
            // [2026-09-01 시한폭탄 제거 — 같은 함정의 '달' 축] 위 수정은 **일** 경계만 피했고
            //   **월** 경계는 그대로 남아 있었다. 화면의 기준 달은 SSR 이 내려주는
            //   `getTodayYmd()` 가 정하는데 그 함수는 `Asia/Seoul` 고정이다(하이드레이션 불일치
            //   방지 목적). 반면 이 픽스처는 러너 TZ(CI 는 UTC)로 달을 골랐다. 그래서
            //   KST 자정~09:00(UTC 15:00~24:00) 구간에는 화면이 다음 달을 조회하고 픽스처는
            //   이전 달에 남아 목록이 비었다 — schedule-edit 이 존재하지 않아 실패한다.
            //   실측: CI UTC 2026-08-31T23:07 = KST 2026-09-01 08:07 → 화면 202609 / 픽스처 202608.
            //   main 의 마지막 e2e(8/30)는 KST 로도 8월이라 통과했으므로 회귀가 아니라 날짜 폭탄이다.
            //   화면과 같은 기준(Asia/Seoul)으로 달을 고른다 — 앱이 TZ 를 바꾸면 여기도 함께 바뀐다.
            const seoulToday = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
            }).format(new Date()).replaceAll('-', '');
            const ymd = `${seoulToday.slice(0, 6)}15`;
            const res = await request.post(SCHEDULE_API, {
                headers: auth,
                data: { schdlNm: `${PREFIX}UiFixture`, schdlBgngYmd: ymd, schdlEndYmd: ymd, schdlSeCd: '2' },
            });
            const schdlSn = (await res.json()).data as number;
            try {
                // e2e=true 는 SmartOnboardingHub 가 투어를 띄우지 않게 하는 프로젝트 표준 플래그다.
                // 이 투어는 z-[10000] 전면 오버레이라 붙이지 않으면 캘린더를 덮어 검증이 불가능하다.
                await page.goto('/admin/work-hub?tab=calendar&e2e=true');
                await expect(page.getByRole('heading', { level: 1, name: '일정', exact: true })).toBeVisible({ timeout: 15000 });
                // 캘린더 섹션이 렌더되어야 한다. (그리드 셀 자체는 react-day-picker 내부 구조라
                //  단언 대상으로 삼지 않는다 — 라이브러리 업그레이드에 취약하다.)
                // 단순 텍스트 가시성이 아니라 일정 탭이 실제로 선택됐는지를 본다.
                await expect(page.getByRole('tab', { name: '일정', exact: true }))
                    .toHaveAttribute('aria-selected', 'true', { timeout: 30000 });
                // 등록 버튼 — 과거에는 onClick 이 없는 死버튼이라 등록 경로 자체가 없었다.
                const createBtn = page.getByRole('button', { name: '일정 등록' }).first();
                await expect(createBtn, '캘린더 탭에는 일정 등록 버튼이 있어야 한다').toBeVisible({ timeout: 20000 });
                // 등록 다이얼로그가 열리고 날짜 입력이 존재해야 한다.
                await createBtn.click();
                await expect(page.locator('input[name="schdlNm"]')).toBeVisible({ timeout: 15000 });
                await expect(page.locator('input[type="date"]').first()).toBeVisible();
                await page.getByRole('button', { name: '취소' }).click();
                // 목록 행에 수정/삭제가 있어야 한다 — 과거에는 등록만 되고 고칠 수단이 없었다.
                await expect(page.locator('[data-testid="schedule-edit"]').first()).toBeVisible({ timeout: 20000 });
                await expect(page.locator('[data-testid="schedule-delete"]').first()).toBeVisible();
            }
            finally {
                await request.delete(`${SCHEDULE_API}/${schdlSn}`, { headers: auth });
            }
        });
    });
});
