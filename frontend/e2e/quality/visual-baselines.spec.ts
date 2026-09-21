import { expect,test } from '../fixtures/browser-test';
import { createVisualAdmin } from '../fixtures/visual-admin';
import { getAdminBearerToken } from '../utils/admin-token';
test.describe('Quality & Resilience', () => {
    test.describe('Global Quality (A11y & Visual)', () => {
        test.use({
            storageState: async ({ playwright, baseURL }, use) => {
                const request = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
                try {
                    const admin = await createVisualAdmin(request, baseURL!);
                    try {
                        await use(admin.storageState);
                    }
                    finally {
                        await admin.dispose();
                    }
                }
                finally {
                    await request.dispose();
                }
            },
        });
        test('Visual Session Isolation', async ({ page, request, context, playwright, baseURL }) => {
            const sharedHeaders = { Authorization: `Bearer ${getAdminBearerToken()}` };
            // BFF는 세션 쿠키를 우선하므로 공유 계정 API에는 VRT 쿠키가 없는 별도 context를 쓴다.
            const sharedRequest = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
            const created = await sharedRequest.post('/api/v1/notifications', {
                headers: sharedHeaders,
                data: { notiTtlNm: 'E2E VRT shared notification', notiCn: 'Session isolation probe' },
            });
            expect(created.status()).toBe(200);
            const notificationId = (await created.json()).data;
            try {
                const token = (await context.cookies()).find(cookie => cookie.name === 'accessToken')?.value;
                expect(Boolean(token) && token !== getAdminBearerToken(), 'VRT는 공유 관리자 세션을 재사용하지 않는다').toBe(true);
                const count = await request.get('/api/v1/notifications/unread-count', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                expect(count.status()).toBe(200);
                expect((await count.json()).data, '다른 테스트의 미읽음 알림이 VRT 계정에 섞이지 않는다').toBe(0);
                const sharedCount = await sharedRequest.get('/api/v1/notifications/unread-count', { headers: sharedHeaders });
                expect(sharedCount.status()).toBe(200);
                expect((await sharedCount.json()).data, '공유 계정의 알림을 지워 격리한 것으로 위장하지 않는다').toBeGreaterThan(0);
                await page.goto('/admin');
                await expect(page.getByRole('button', { name: '알림', exact: true })).toBeVisible();
            }
            finally {
                try {
                    const deleted = await sharedRequest.delete(`/api/v1/notifications/${notificationId}`, { headers: sharedHeaders });
                    expect(deleted.status(), '이 테스트가 만든 공유 알림만 정리').toBe(200);
                }
                finally {
                    await sharedRequest.dispose();
                }
            }
        });
        test('Visual Regression Baseline', async ({ page, actorPage }) => {
            // [2026-07-27 정책 결정: CI(리눅스) 전용] 스크린샷은 폰트 렌더링·안티에일리어싱이 OS 마다
            // 달라 win32 에서 만든 기준선은 ubuntu 러너에서 **반드시** 실패한다(파일명이 …-win32.png 인
            // 것이 그 증거다). 기준선은 CI 플랫폼에서 한 번 생성해 커밋하고, 검증도 그 플랫폼에서만 한다.
            // 로컬(비-리눅스)에서는 skip — '통과'로 위장하지 않고 건너뛴 사실을 리포트에 남긴다.
            test.skip(process.platform !== 'linux', '비주얼 회귀는 CI(리눅스) 전용이다 — OS 별 렌더 차이로 로컬 기준선은 러너에서 의미가 없다. '
                + '기준선 생성: CI 에서 `pnpm exec playwright test -g "Visual Regression Baseline" --update-snapshots` '
                + '후 생성된 e2e/quality/visual-baselines.spec.ts-snapshots/ 를 커밋한다.');
            await page.goto('/admin');
            console.log('>>> Capturing Dashboard Visual Snapshot');
            await expect(page).toHaveScreenshot('dashboard-baseline.png', {
                animations: 'disabled',
                mask: [
                    page.locator('.recharts-surface'), // Mask dynamic charts
                    page.locator('.tabular-nums'), // Mask dynamic numbers
                    page.locator('.custom-scrollbar') // Mask dynamic scrollbar contents (Audit History)
                ],
                // [E2E 감사 C6] 30%(0.3) 허용치는 사실상 VRT를 무력화했음 → 1%로 강화.
                // 동적 영역은 위 mask로만 처리한다. (서버 기동 후 baseline 재캡처가 필요할 수 있음)
                maxDiffPixelRatio: 0.01
            });
            // ── 파일럿 ②: admin 로그인 로그 목록 (/admin/system/logs/login) ──────────
            // 로그 행은 같은 잡에서 먼저 실행된 로그인 횟수에 따라 달라지므로(기준선 생성
            // 워크플로는 setup 만 돌고, CI 샤드는 앞선 스펙들이 로그인을 쌓는다) 행이 있는
            // 상태는 결정적이지 않다. 무매칭 검색어로 고정한 empty-state 를 계약으로 캡처한다 —
            // PageHeader·HubHeader·검색바·표 헤더·EmptyStateDisplay·'총 0건' 요약이 전부 결정적이다.
            console.log('>>> Capturing Login Log List (deterministic empty-search) Visual Snapshot');
            await page.goto('/admin/system/logs/login');
            // exact: Suspense 폴백의 sr-only h1('로그인 로그를 불러오는 중')이 부분일치로 잡히지 않게 한다.
            await expect(page.getByRole('heading', { level: 1, name: '로그인 로그', exact: true })).toBeVisible({ timeout: 30000 });
            // [2026-08-24 A1 이행] 조회 조건이 표 내부 검색창에서 WorkListPage 조회 조건 영역으로
            //   올라가면서 placeholder 의 말줄임표가 사라졌다(카탈로그 G2). 캡처 대상(무매칭 empty-state)은 동일하다.
            const logSearchInput = page.getByPlaceholder('사용자ID, 접속IP 검색');
            await expect(logSearchInput).toBeVisible({ timeout: 20000 });
            await logSearchInput.fill('vrt-no-match');
            await logSearchInput.press('Enter');
            const emptyLogMessage = page.getByTestId('empty-table-msg');
            await expect(emptyLogMessage).toBeVisible({ timeout: 20000 });
            await expect(emptyLogMessage).toContainText('"vrt-no-match"에 대한 검색 결과가 없습니다.');
            await expect(page).toHaveScreenshot('admin-login-logs-baseline.png', {
                animations: 'disabled',
                // 셸의 동적 숫자(뱃지·카운터) 방어 — 매칭이 없으면 no-op 이다(dashboard 와 동일 규율).
                mask: [page.locator('.tabular-nums')],
                maxDiffPixelRatio: 0.01
            });
            // ── 파일럿 ③: 공통코드 관리 A2 작업영역 (/admin/system/common-code) ────
            // 서버 컴포넌트가 Flyway seed 코드를 조회해 렌더한다 — 기준선 워크플로와 CI 모두
            // 신선한 compose DB 라 같은 seed 를 보고, 코드를 생성/삭제하는 e2e 는 없다(실측 grep).
            console.log('>>> Capturing Common Code A2 Work Area Visual Snapshot');
            await page.goto('/admin/system/common-code');
            await expect(page.getByRole('heading', { level: 1, name: '코드 관리', exact: true })).toBeVisible({ timeout: 30000 });
            await expect(page.getByRole('heading', { level: 2, name: '공통 코드 관리', exact: true })).toHaveCount(1);
            const commonCodeWorkArea = page.getByTestId('master-detail-page');
            await expect(commonCodeWorkArea).toHaveCount(1);
            await expect(commonCodeWorkArea.getByTestId('master-detail-master')).toHaveCount(1);
            await expect(commonCodeWorkArea.getByTestId('master-detail-detail')).toHaveCount(1);
            await expect(commonCodeWorkArea.locator('[data-a2-master-item-type="group"]').first()).toBeVisible({ timeout: 20000 });
            // 페이지 상단 포털 장식이 아니라 실제 마스터-디테일 업무영역 전체를 기준선으로 고정한다.
            await expect(commonCodeWorkArea).toHaveScreenshot('common-code-hub-baseline.png', {
                animations: 'disabled',
                mask: [page.locator('.tabular-nums')],
                maxDiffPixelRatio: 0.01
            });
            // ── 파일럿 ④: 로그인 화면 (/login, 비인증) ─────────────────────────────
            // 이 describe 는 admin storageState 라 /login 진입 시 LoginClient 가 즉시
            // redirectUrl 로 소프트 전환한다(이미 인증됨). 별도 비인증 컨텍스트로 캡처하되,
            // actorPage가 가드·ledger·coverage 수집과 context 정리를 관리한다.
            console.log('>>> Capturing Login Page (anonymous) Visual Snapshot');
            const { page: anonPage, guard: anonGuard } = await actorPage({
                viewport: { width: 1280, height: 720 },
                // Playwright fixture의 admin storageState가 수동 context에도 병합되므로 명시적으로 비운다.
                storageState: { cookies: [], origins: [] },
            });
            anonGuard.expectErrors([{
                    id: 'E2E-VRT-LOGIN-ME-401',
                    specScope: 'visual-baselines.spec.ts :: Visual Regression Baseline',
                    channel: 'response',
                    urlPattern: /\/api\/v1\/auth\/me(?:\?|$)/,
                    messagePattern: null,
                    method: 'GET',
                    status: 401,
                    // 기준선 생성 워크플로 실측(run 32634871785): 이 401 은 환경에 따라 발생하지
                    // 않을 수 있다(비로그인 컨텍스트가 세션 확인을 생략하는 경로). 발생 필수로
                    // 두면 "기대 오류 미발생" 위반으로 생성이 죽으므로 선택적 항목으로 둔다.
                    minOccurrences: 0,
                    maxOccurrences: 4,
                    reason: '비로그인 상태의 로그인 화면이 세션 유무를 확인하는 초기 요청이다(발생 시에만 소비).',
                    expiresAt: '2026-12-31',
                }]);
            // ?e2e=true: 온보딩 투어 자동 비활성(quality/login-accessibility 로그인 a11y 테스트와 동일 진입 계약).
            await anonPage.goto('/login?e2e=true');
            await expect(anonPage).toHaveURL(/\/login\?e2e=true$/);
            await expect(anonPage.getByRole('heading', { level: 1, name: '엔터프라이즈', exact: true })).toBeVisible({ timeout: 30000 });
            await expect(anonPage.getByRole('textbox', { name: '아이디' })).toBeVisible();
            // 인증 화면이 effect redirect로 바뀐 뒤 잘못된 기준선을 쓰는 경쟁을 막는다.
            await expect(anonPage).toHaveURL(/\/login\?e2e=true$/);
            await expect(anonPage).toHaveScreenshot('login-page-baseline.png', {
                animations: 'disabled',
                maxDiffPixelRatio: 0.01
            });
        });
    });
});
