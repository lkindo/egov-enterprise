import { test, expect } from './fixtures/base-test';
import { getAdminBearerToken } from './utils/admin-token';
import { buildSpecScope, ConsoleErrorGuard } from './fixtures/error-detector';

/**
 * [Tier 4] Quality & Resilience: Security, UX, A11y, Visual
 * 
 * 테스트의 비기능적 품질과 회복탄력성을 검증합니다.
 * 1. 보안 (RBAC, CSRF, XSS)
 * 2. UX (실시간 업데이트, 자동 저장)
 * 3. 접근성 (WCAG 2.1) 및 시각적 회귀
 * 4. 관측성 (감사 로그, 콘솔 가드)
 */

test.describe('Tier 4: Quality & Resilience', () => {
    
    test.describe('Security & RBAC Integrity', () => {
        test.use({ storageState: 'playwright/.auth/user.json' });

        // [2026-08-10 이관] 삭제됨: 'Denied Admin Access for Regular User'.
        //   `/admin/user/manage`·`/admin/system/audit` 의 비관리자 차단은 미들웨어 §4 의 계약이며,
        //   23-security-auth-supplement 의 E4 매트릭스가 두 경로를 모두 포함해 소유한다.
        //   종전 구현은 그 위에 두 가지 결함이 더 있었다:
        //     ① `url === 'http://localhost:3001/'` 하드코딩 — baseURL 을 바꾸면 조용히 else 로 샌다.
        //     ② if/else 로 "리다이렉트됐거나 본문에 권한 문구가 있거나" — 두 갈래 모두 통과 경로라
        //        차단 방식이 바뀌어도 red 가 나지 않았다.
        //   E4 는 리다이렉트 Location 을 직접 단언하므로 이 두 문제가 없다.

        test('CSRF Protection Verification', async ({ page }) => {
            console.log('>>> Attempting state-change without valid CSRF');
            const response = await page.request.post('/api/v1/admin/system/users', {
                headers: { 'X-XSRF-TOKEN': 'invalid-token' },
                data: { userId: 'csrf_attacker' }
            });
            expect([403, 401]).toContain(response.status());
        });
    });

    test.describe('Advanced UX & Performance', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('Optimistic UI: Post Like/Reaction', async ({ page, request }) => {
            const bbsId = 'BBSMSTR_AAAAAAAAAAAA';

            // [2026-07-27 정정] 종전에는 pstSn=1108 을 하드코딩했다("Existing post"). 신규 DB(CI 기본)에는
            // 그 글이 없어 상세 페이지가 렌더되지 않았고, 추천 버튼을 영원히 찾지 못했다.
            // 시드로 채우면 누적 쓰레기가 재발하므로 이 테스트가 쓸 글을 **직접 만든다**.
            const token = getAdminBearerToken();
            const created = await request.post('/api/v1/boards/posts', {
                headers: { Authorization: `Bearer ${token}` },
                data: {
                    bbsId,
                    pstTtl: `E2E Like ${Date.now()}`,
                    pstCn: '<p>Optimistic UI 추천 검증용 게시글</p>',
                },
            });
            expect(created.ok(), '추천 검증용 게시글 생성이 성공해야 한다').toBeTruthy();
            const pstSn = String((await created.json())?.data ?? '').trim();
            expect(pstSn, '생성된 게시글 ID 를 받아야 한다').not.toBe('');

            await page.goto(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`);
            
            // [E2E 감사 B] isVisible 가드 제거 — 추천 버튼이 없으면 실패시킨다(과거: 가드로 무단언 통과).
            const likeBtn = page.locator('button').filter({ hasText: /추천|좋아요|Like/i }).first();
            await expect(likeBtn).toBeVisible({ timeout: 15000 });
            const initialCount = await likeBtn.innerText();
            await likeBtn.click();
            // 낙관적 UI: 즉시 카운트가 변해야 한다.
            await expect(likeBtn).not.toHaveText(initialCount, { timeout: 10000 });
        });

        test('Resilience: Auto-save Draft Restoration', async ({ page }) => {
            await page.goto('/admin/community/boards/insert-board-article?bbsId=BBSMSTR_AAAAAAAAAAAA');
            
            // Set up dialog listener BEFORE the action that triggers it (reload/refresh)
            page.on('dialog', async dialog => {
                console.log(`>>> Dialog appeared: ${dialog.message()}`);
                await dialog.accept();
            });

            const draftTitle = `Draft_${Date.now()}`;
            await page.locator('input[name="pstTtl"]').fill(draftTitle);
            await page.locator('.ProseMirror').fill('This is a test content for auto-save verification.');
            
            console.log('>>> Waiting for auto-save state...');
            const draftStorageKey = 'egov-draft-board_insert_BBSMSTR_AAAAAAAAAAAA';
            await expect.poll(
                () => page.evaluate((key) => {
                    const raw = localStorage.getItem(key);
                    if (!raw) return null;
                    try {
                        return (JSON.parse(raw) as { title?: string }).title ?? null;
                    } catch {
                        return null;
                    }
                }, draftStorageKey),
                { timeout: 10000, message: '자동 임시저장이 localStorage에 기록되지 않음' },
            ).toBe(draftTitle);
            
            console.log('>>> Simulating crash (Refresh)');
            await page.reload();
            
            console.log('>>> Verifying restoration');
            // The dialog should be automatically accepted by the listener
            await expect(page.locator('input[name="pstTtl"]')).toHaveValue(draftTitle, { timeout: 15000 });
            await expect(page.locator('.ProseMirror')).toContainText('auto-save verification');
        });
    });

    test.describe('Global Quality (A11y & Visual)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        // [2026-08-10 중복제거] 삭제됨: 'Accessibility Audit (axe-core)'.
        //   대상(`/admin`)이 01-core-base 의 'Accessibility Audit for Admin Dashboard' 와 동일한데,
        //   이쪽은 `heading-order` 까지 추가로 비활성화한 **엄격히 약한 부분집합**이었다 —
        //   이 테스트가 잡을 수 있는 위반은 01 이 전부 잡고, 01 만 잡는 위반이 따로 있다.
        //   같은 페이지에 axe 를 두 번 돌릴 이유가 없으므로 더 엄격한 쪽(01)만 남긴다.
        //   ※ 01 은 감사 전에 h1 렌더 완료를 기다린다 — 이 테스트에는 그 대기가 없어
        //     Suspense 폴백(스피너)을 감사할 여지도 있었다.

        // [2026-08-23 D6 파일럿 확장] 대시보드 1장 → 파일럿 대표 라우트 4장.
        //   추가 라우트는 **결정적(deterministic) 상태**만 캡처한다 — VRT 는 기준선 생성 시점과
        //   비교 시점의 DB 상태가 다르면 마스크로도 못 막는 레이아웃 시프트가 생기기 때문이다.
        //     · 로그인 로그: 무매칭 검색어로 고정된 empty-state 를 캡처(로그 행 수는 실행마다 다르다).
        //     · 공통코드 허브: Flyway seed 파생 화면 — 신선한 CI DB 에서 항상 동일하다.
        //     · 로그인 화면: 비인증 컨텍스트로 캡처. /auth/me 401 은 로그인 화면 진입의 정상
        //       부산물이며(01-core-base 의 E2E-CORE-LOGIN-A11Y-ME-401 과 동일 계약) ledger 로 관리한다.
        //   결재함(/approvals)은 목록 내용이 같은 샤드에서 먼저 실행된 테스트(E7 결재 confirm,
        //   11 기안 등)에 의존해 비결정적이므로 파일럿에서 제외했다 — 고정 fixture 설계가 선행돼야 한다.
        //   ⚠ 신규 캡처는 이 테스트 **안**에 둔다: e2e-harness-hygiene 계약이 e2e 전체에서
        //   test.skip 1건(이 테스트의 플랫폼 한정)만 허용하므로 테스트를 쪼개면 게이트가 red 가 된다.
        //   기준선 생성은 기존 update-visual-baseline.yml 의 `-g "Visual Regression Baseline"`
        //   경로를 그대로 탄다(테스트 제목 불변 — 워크플로 수정 불필요).
        test('Visual Regression Baseline', async ({ page, browser }, testInfo) => {
            // [2026-07-27 정책 결정: CI(리눅스) 전용] 스크린샷은 폰트 렌더링·안티에일리어싱이 OS 마다
            // 달라 win32 에서 만든 기준선은 ubuntu 러너에서 **반드시** 실패한다(파일명이 …-win32.png 인
            // 것이 그 증거다). 기준선은 CI 플랫폼에서 한 번 생성해 커밋하고, 검증도 그 플랫폼에서만 한다.
            // 로컬(비-리눅스)에서는 skip — '통과'로 위장하지 않고 건너뛴 사실을 리포트에 남긴다.
            test.skip(
                process.platform !== 'linux',
                '비주얼 회귀는 CI(리눅스) 전용이다 — OS 별 렌더 차이로 로컬 기준선은 러너에서 의미가 없다. '
                + '기준선 생성: CI 에서 `pnpm exec playwright test -g "Visual Regression Baseline" --update-snapshots` '
                + '후 생성된 e2e/04-quality-resilience.spec.ts-snapshots/ 를 커밋한다.',
            );

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
            // 가드·ledger 를 수동 설치해 기본 page 픽스처와 동일한 오류 규율을 적용한다.
            console.log('>>> Capturing Login Page (anonymous) Visual Snapshot');
            const anonContext = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                // Playwright fixture의 admin storageState가 수동 context에도 병합되므로 명시적으로 비운다.
                storageState: { cookies: [], origins: [] },
            });
            try {
                const anonPage = await anonContext.newPage();
                const anonGuard = new ConsoleErrorGuard(anonPage, buildSpecScope(testInfo.file, testInfo.title));
                await anonGuard.install();
                anonGuard.expectErrors([{
                    id: 'E2E-VRT-LOGIN-ME-401',
                    specScope: '04-quality-resilience.spec.ts :: Visual Regression Baseline',
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
                // ?e2e=true: 온보딩 투어 자동 비활성(01-core-base 로그인 a11y 테스트와 동일 진입 계약).
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
                await anonGuard.verify();
            } finally {
                await anonContext.close();
            }
        });
    });

    test.describe('System Observability', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        test('Audit Log Consistency', async ({ page }) => {
            await page.goto('/admin/system/audit');
            console.log('>>> Verifying recent system activities');
            
            // [E2E 감사 B] both-branches-pass 제거 — 로그인 등 활동으로 감사 로그가 반드시 존재하므로
            // 타임스탬프를 하드 단언한다(과거: empty-state도 성공으로 인정해 빈/깨진 감사 페이지가 통과했음).
            // ':text-matches'는 유효한 Playwright CSS 의사클래스가 아니라 0건 매칭됐음 → getByText(regex)로 정정.
            const auditTimestamp = page.getByText(/\d{4}-\d{2}-\d{2}/).first();
            await expect(auditTimestamp).toBeVisible({ timeout: 20000 });
            await expect(auditTimestamp).toContainText(/\d{4}-\d{2}-\d{2}/);
            console.log('>>> Audit log entry verified.');
        });
    });

    /**
     * 반응형 레이아웃 — 프론트엔드 UX 헌법 **제5조 2항**(Mobile-First · 표준 브레이크포인트 준수).
     *
     * [왜 필요한가 — 2026-08-11] 헌법이 명시적으로 요구하는 항목인데 **E2E 가 0 건**이었다.
     *   전 스펙이 `devices['Desktop Chrome']` 한 종류로만 돌아, 좁은 화면에서 레이아웃이 깨져도
     *   어떤 게이트에도 걸리지 않는다. 정적 검사(tsc·lint)는 레이아웃을 볼 수 없고,
     *   시각 회귀(VRT)도 데스크톱 해상도 하나만 찍는다.
     *
     * [무엇을 보는가] 스크린샷 비교가 아니라 **구조적 사실 두 가지**만 본다 —
     *   해상도별 픽셀 비교는 플레이키하고 유지비가 크지만, 아래 둘은 결정적이다.
     *
     *   ① **가로 넘침이 없다.** 모바일에서 가장 흔하고 가장 눈에 띄는 파손이며
     *      `scrollWidth > clientWidth` 하나로 판정된다.
     *   ② **사이드바가 브레이크포인트대로 접힌다.** 레이아웃이 선언한 계약 그 자체다
     *      (Tailwind 기본 `lg` = 1024px). 구현은 `hidden`(DOM 제거)이 아니라
     *      **off-canvas transform**(`-translate-x-full` / `lg:translate-x-0`)이므로,
     *      "화면 안에서 본문을 가리는가"를 경계상자로 잰다 — 아래 단언부 주석 참조.
     *      양방향으로 고정해 "모바일에서 안 접힌다"와 "데스크톱에서 안 나온다"를 모두 잡는다.
     */
    test.describe('Responsive Layout (헌법 제5조 — Mobile-First 브레이크포인트)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });

        /** 최종 route h1까지 명시해 Suspense/셸 폴백을 완료 화면으로 오인하지 않는다. */
        const ROUTES = [
            { path: '/admin', finalHeading: '관리자 업무 현황' },
            { path: '/admin/work-hub', finalHeading: '워크플로우 및 자산 관리' },
        ] as const;

        // Tailwind 기본 브레이크포인트 기준: sm 640 · md 768 · lg 1024 · xl 1280.
        const VIEWPORTS = [
            { name: 'mobile', width: 375, height: 667, sidebarVisible: false, domainSwitcherVisible: false },  // sm 미만
            { name: 'tablet', width: 768, height: 1024, sidebarVisible: false, domainSwitcherVisible: false }, // md (lg 미만)
            // lg~xl에서는 상단 GNB와 모바일 토글이 모두 숨으므로 사이드바 전환기가 primary nav를 보존한다.
            { name: 'compact-desktop', width: 1024, height: 800, sidebarVisible: true, domainSwitcherVisible: true },
            { name: 'desktop', width: 1280, height: 800, sidebarVisible: true, domainSwitcherVisible: false }, // xl
        ];

        for (const vp of VIEWPORTS) {
            test(`${vp.name}(${vp.width}px): 가로 넘침이 없고 사이드바가 브레이크포인트대로 동작한다`, async ({ page }) => {
                await page.setViewportSize({ width: vp.width, height: vp.height });

                for (const route of ROUTES) {
                    await page.goto(route.path);

                    // 최상위 Suspense 폴백도 main/h1을 가지므로 일반 landmark 대기는 readiness가 아니다.
                    // 실제 관리 셸의 고유 main과 해당 route의 정확한 최종 h1을 모두 요구한다.
                    const main = page.locator('main#main-content');
                    await expect(main, `${route.path} 최종 관리 셸 main이 하나여야 한다`).toHaveCount(1);
                    await expect(main).toBeVisible({ timeout: 30000 });
                    const finalHeading = main.getByRole('heading', {
                        level: 1,
                        name: route.finalHeading,
                        exact: true,
                    });
                    await expect(
                        finalHeading,
                        `${route.path} 최종 h1(${route.finalHeading})이 렌더되어야 한다`,
                    ).toHaveCount(1);
                    await expect(finalHeading).toBeVisible({ timeout: 30000 });

                    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
                        scrollWidth: document.documentElement.scrollWidth,
                        clientWidth: document.documentElement.clientWidth,
                    }));
                    // 1px 여유: 소수점 레이아웃 반올림으로 1px 오차가 나는 경우가 있어 그것까지
                    // 파손으로 보지는 않는다. 그 이상은 실제로 가로 스크롤바가 생긴다.
                    expect(
                        scrollWidth,
                        `${route.path} 가 ${vp.width}px 에서 가로로 넘친다 (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`,
                    ).toBeLessThanOrEqual(clientWidth + 1);

                    // 사이드바 접힘/펼침 계약 — 양방향으로 고정한다.
                    //
                    // ⚠ [2026-08-12 정정 ①] 접힘을 `toBeHidden()` 으로 재던 최초 단언은 **이 UI 를 판정하지 못했다.**
                    //   접힘이 off-canvas transform 으로 구현된 경우(`-translate-x-full`) 경계상자가 남아
                    //   Playwright 는 계속 `visible` 로 본다. 게다가 `toBeHidden()` 은 **요소가 없을 때도 통과**해
                    //   aside 렌더 전 타이밍에 걸리면 조용히 vacuous 통과했다.
                    //
                    // ⚠ [2026-08-12 정정 ②] 그 다음 시도(경계상자 1회 샘플링 + 상자 non-null 강제)도 틀렸다.
                    //   실측 결과 이 셸의 접힘은 **한 가지 방식이 아니다** — 뷰포트/경로에 따라
                    //   경계상자가 아예 **null**(DOM 미부착 또는 `display:none`)인 경우가 있었고,
                    //   그것을 실패로 취급해 375·768px 이 red 가 됐다. 또 `transition-transform duration-500`
                    //   중에 1회만 재면 전이 도중 값을 잡아 흔들린다.
                    //
                    //   → 계약을 **구현 방식과 무관하게** 적는다: "사이드바가 화면 안에서 본문을 가리는가".
                    //     · 화면에 상자가 없다(null) = 가리지 않는다 → 통과
                    //     · 상자가 있으면 오른쪽 끝이 뷰포트 왼쪽 경계를 넘지 않아야 한다
                    //     · 전이(500ms)를 흡수하도록 **폴링**으로 정착을 기다린다
                    //
                    //   고유 id의 실재를 먼저 요구하므로 모바일의 hidden 단언도 셀렉터 부재로 통과할 수 없다.
                    const sidebar = page.locator('aside#primary-sidebar');
                    await expect(sidebar, `${route.path} 사이드바가 하나여야 한다`).toHaveCount(1);

                    if (vp.sidebarVisible) {
                        await expect(sidebar, `${vp.width}px 에서 사이드바가 보여야 한다`).toBeVisible({ timeout: 15000 });
                        await expect
                            .poll(async () => (await sidebar.boundingBox())?.x ?? null, {
                                timeout: 15000,
                                message: `${vp.width}px 에서 사이드바가 화면 밖으로 밀려 있다`,
                            })
                            // 1px 여유는 위 가로 넘침 단언과 같은 이유다(소수점 레이아웃 반올림).
                            .toBeGreaterThanOrEqual(-1);
                    } else {
                        await expect
                            .poll(
                                async () => {
                                    const b = await sidebar.boundingBox();
                                    // null = 화면에 상자가 없다 → 본문을 가릴 수 없다.
                                    return b === null ? Number.NEGATIVE_INFINITY : b.x + b.width;
                                },
                                {
                                    timeout: 15000,
                                    message: `${vp.width}px 에서 사이드바가 본문을 가린다`,
                                },
                            )
                            // 접힘이 풀리면 288px 가 통째로 들어오므로 1px 여유로 가려지지 않는다.
                            .toBeLessThanOrEqual(1);
                    }

                    const domainSwitcher = sidebar.getByRole('navigation', {
                        name: '서비스 영역 선택',
                        // 모바일·xl에서는 의도적으로 숨겨지므로 DOM 실재성 검사는 접근성 트리 밖도 포함한다.
                        includeHidden: true,
                    });
                    await expect(
                        domainSwitcher,
                        `${route.path} 서비스 영역 전환 내비게이션이 하나여야 한다`,
                    ).toHaveCount(1);
                    const firstDomainButton = domainSwitcher.getByRole('button', { includeHidden: true }).first();
                    await expect(
                        firstDomainButton,
                        `${route.path} 서비스 영역 전환 항목이 있어야 한다`,
                    ).toHaveCount(1);

                    if (vp.domainSwitcherVisible) {
                        await expect(
                            domainSwitcher,
                            `${vp.width}px 에서 서비스 영역 전환 내비게이션이 보여야 한다`,
                        ).toBeVisible();
                        await expect(firstDomainButton).toBeVisible();
                    } else {
                        await expect(domainSwitcher).toBeHidden();
                    }
                }
            });
        }
    });
});
