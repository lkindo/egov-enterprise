import { test, expect } from './fixtures/base-test';
import { getAdminBearerToken } from './utils/admin-token';

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

            // [2026-07-27 정정] 종전에는 pstId=1108 을 하드코딩했다("Existing post"). 신규 DB(CI 기본)에는
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
            const pstId = String((await created.json())?.data ?? '').trim();
            expect(pstId, '생성된 게시글 ID 를 받아야 한다').not.toBe('');

            await page.goto(`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${pstId}`);
            
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
            
            console.log('>>> Waiting for auto-save trigger...');
            await page.waitForTimeout(5000); 
            
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

        test('Visual Regression Baseline', async ({ page }) => {
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
            // Wait for charts to animate
            await page.waitForTimeout(3000);
            console.log('>>> Capturing Dashboard Visual Snapshot');
            await expect(page).toHaveScreenshot('dashboard-baseline.png', {
                mask: [
                    page.locator('.recharts-surface'), // Mask dynamic charts
                    page.locator('.tabular-nums'), // Mask dynamic numbers
                    page.locator('.custom-scrollbar') // Mask dynamic scrollbar contents (Audit History)
                ],
                // [E2E 감사 C6] 30%(0.3) 허용치는 사실상 VRT를 무력화했음 → 1%로 강화.
                // 동적 영역은 위 mask로만 처리한다. (서버 기동 후 baseline 재캡처가 필요할 수 있음)
                maxDiffPixelRatio: 0.01
            });
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

        /** 검사 대상 화면. 관리 셸이 붙는 대표 경로 두 곳이면 레이아웃 파손은 드러난다. */
        const PATHS = ['/admin', '/admin/work-hub'];

        // Tailwind 기본 브레이크포인트 기준: sm 640 · md 768 · lg 1024 · xl 1280.
        const VIEWPORTS = [
            { name: 'mobile', width: 375, height: 667, sidebarVisible: false },  // sm 미만
            { name: 'tablet', width: 768, height: 1024, sidebarVisible: false }, // md (lg 미만)
            { name: 'desktop', width: 1280, height: 800, sidebarVisible: true }, // xl
        ];

        for (const vp of VIEWPORTS) {
            test(`${vp.name}(${vp.width}px): 가로 넘침이 없고 사이드바가 브레이크포인트대로 동작한다`, async ({ page }) => {
                await page.setViewportSize({ width: vp.width, height: vp.height });

                for (const path of PATHS) {
                    await page.goto(path);
                    // 셸이 렌더된 뒤에 재야 한다 — 로딩 폴백 상태의 폭을 재면 아무 의미가 없다.
                    await expect(page.getByRole('main')).toBeVisible({ timeout: 30000 });

                    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
                        scrollWidth: document.documentElement.scrollWidth,
                        clientWidth: document.documentElement.clientWidth,
                    }));
                    // 1px 여유: 소수점 레이아웃 반올림으로 1px 오차가 나는 경우가 있어 그것까지
                    // 파손으로 보지는 않는다. 그 이상은 실제로 가로 스크롤바가 생긴다.
                    expect(
                        scrollWidth,
                        `${path} 가 ${vp.width}px 에서 가로로 넘친다 (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`,
                    ).toBeLessThanOrEqual(clientWidth + 1);
                }

                // 사이드바 접힘/펼침 계약 — 양방향으로 고정한다.
                //
                // ⚠ [2026-08-12 정정] 접힘을 `toBeHidden()` 으로 재던 종전 단언은 **이 UI 를 판정하지 못한다.**
                //   구현은 `hidden lg:block` 이 아니라 **off-canvas transform** 이다(실측 클래스:
                //   `... w-72 transition-transform lg:translate-x-0 -translate-x-full`).
                //   transform 으로 밀어낸 요소는 경계상자가 남아 있어 Playwright 가 계속 `visible` 로 본다.
                //   더 나쁜 것은 `toBeHidden()` 이 **요소가 아예 없을 때도 통과**한다는 점이다 —
                //   그래서 aside 가 아직 렌더되기 전 타이밍에 걸리면 조용히 **vacuous 통과**했고,
                //   실제로 이 단언은 리베이스로 타이밍이 바뀌자마자 red 가 됐다(같은 코드, 다른 결과).
                //
                //   계약을 사용자 관점 그대로 적는다: **"사이드바가 화면 안에서 본문을 가리는가"**.
                //   요소 존재를 먼저 요구하므로 vacuous 통과 경로도 함께 닫힌다.
                const sidebar = page.locator('aside').first();
                await expect(sidebar, '사이드바(aside)가 렌더되지 않았다').toHaveCount(1);

                const box = await sidebar.boundingBox();
                expect(box, '사이드바의 경계상자를 얻지 못했다 (display:none 이거나 분리된 노드)').not.toBeNull();

                if (vp.sidebarVisible) {
                    await expect(sidebar, `${vp.width}px 에서 사이드바가 보여야 한다`).toBeVisible({ timeout: 15000 });
                    expect(
                        box!.x,
                        `${vp.width}px 에서 사이드바가 화면 밖으로 밀려 있다 (x=${box!.x})`,
                    ).toBeGreaterThanOrEqual(-1);
                } else {
                    // 오른쪽 끝이 뷰포트 왼쪽 경계를 넘지 않아야 한다 = 본문 위에 남지 않는다.
                    // 1px 여유는 위 가로 넘침 단언과 같은 이유다(소수점 레이아웃 반올림).
                    // 접힘이 풀리면 288px 가 통째로 들어오므로 이 여유로 가려지지 않는다.
                    expect(
                        box!.x + box!.width,
                        `${vp.width}px 에서 사이드바가 본문을 가린다 (x=${box!.x}, width=${box!.width})`,
                    ).toBeLessThanOrEqual(1);
                }
            });
        }
    });
});