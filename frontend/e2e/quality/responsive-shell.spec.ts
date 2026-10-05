import { expect,test } from '../fixtures/browser-test';
test.describe('Quality & Resilience', () => {
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
            { path: '/admin/work-hub', finalHeading: '업무 관리' },
        ] as const;
        // Tailwind 기본 브레이크포인트 기준: sm 640 · md 768 · lg 1024 · xl 1280.
        const VIEWPORTS = [
            { name: 'mobile', width: 375, height: 667, sidebarVisible: false, domainSwitcherVisible: false }, // sm 미만
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
                    await expect(finalHeading, `${route.path} 최종 h1(${route.finalHeading})이 렌더되어야 한다`).toHaveCount(1);
                    await expect(finalHeading).toBeVisible({ timeout: 30000 });
                    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
                        scrollWidth: document.documentElement.scrollWidth,
                        clientWidth: document.documentElement.clientWidth,
                    }));
                    // 1px 여유: 소수점 레이아웃 반올림으로 1px 오차가 나는 경우가 있어 그것까지
                    // 파손으로 보지는 않는다. 그 이상은 실제로 가로 스크롤바가 생긴다.
                    expect(scrollWidth, `${route.path} 가 ${vp.width}px 에서 가로로 넘친다 (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`).toBeLessThanOrEqual(clientWidth + 1);
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
                    }
                    else {
                        await expect
                            .poll(async () => {
                            const b = await sidebar.boundingBox();
                            // null = 화면에 상자가 없다 → 본문을 가릴 수 없다.
                            return b === null ? Number.NEGATIVE_INFINITY : b.x + b.width;
                        }, {
                            timeout: 15000,
                            message: `${vp.width}px 에서 사이드바가 본문을 가린다`,
                        })
                            // 접힘이 풀리면 288px 가 통째로 들어오므로 1px 여유로 가려지지 않는다.
                            .toBeLessThanOrEqual(1);
                    }
                    const domainSwitcher = sidebar.getByRole('group', {
                        name: '서비스 영역',
                        // 모바일·xl에서는 의도적으로 숨겨지므로 DOM 실재성 검사는 접근성 트리 밖도 포함한다.
                        includeHidden: true,
                    });
                    await expect(domainSwitcher, `${route.path} 서비스 영역 전환 그룹이 하나여야 한다`).toHaveCount(1);
                    const firstDomainButton = domainSwitcher.getByRole('button', { includeHidden: true }).first();
                    await expect(firstDomainButton, `${route.path} 서비스 영역 전환 항목이 있어야 한다`).toHaveCount(1);
                    if (vp.domainSwitcherVisible) {
                        await expect(domainSwitcher, `${vp.width}px 에서 서비스 영역 전환 그룹이 보여야 한다`).toBeVisible();
                        await expect(firstDomainButton).toBeVisible();
                    }
                    else {
                        await expect(domainSwitcher).toBeHidden();
                    }
                }
            });
        }
    });

    /**
     * [2026-10-05] 넓은 화면 사이드바 접기(카탈로그 §4 '사이드바 접기') — 위와 같이 구조 사실만 본다.
     *   ① 접으면 사이드바 상자가 화면에서 사라지고(display:none — 탭 순서·접근성 트리에서도 빠진다) 그 자리에 폭 48px 의 접힘
     *      막대가 남으며, 본문 왼쪽 여백은 막대 폭이 되고 가로로 넘치지 않는다. 단위 테스트(jsdom)는 CSS 를 적용하지 않아 이
     *      사실을 보지 못한다.
     *   ② 새로고침해도 접힌 채다 — 그리기 전 복원 스크립트가 <html data-sidebar-collapsed> 를 되살린다.
     *   ③ 1280px(주메뉴가 있는 폭)에서는 경로 없는 영역의 '메뉴 보기' 단추가 사이드바를 다시 편다. 1024px 에는 주메뉴가 없어
     *      머리글의 접기·펼치기 단추로 편다.
     *   ④ [DEC-OPS-227] 사이드바 맨 위의 글자 단추 '사이드바 접기'로 접고 막대의 '사이드바 펼치기'(키보드)로 펴며, 포커스가
     *      사라지는 단추에서 상대 단추로 넘어간다(2.4.3). 펼친 상태에서는 막대가 화면에 없다.
     *   ⑤ 인쇄 매체에서는 접힌 화면에 막대도 그 여백도 남지 않는다(접힘 블록 안의 인쇄 규칙).
     *   ⑥ 접힘을 기억한 채 좁은 화면(lg 미만)으로 가면 막대·여백이 없고 서랍이 그대로 동작하며, 넓은 화면용 '사이드바 접기'는
     *      서랍에 보이지 않는다. 다시 넓히면 접힌 채로 돌아온다.
     *   막대는 화면에 없을 때도 DOM 에는 하나 있어야 한다 — toBeHidden 은 요소가 없어도 통과하므로 toHaveCount(1) 을 먼저 둔다.
     */
    test.describe('Wide-screen sidebar collapse (카탈로그 §4)', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        const HEADING = { level: 1, name: '관리자 업무 현황', exact: true } as const;
        /** 접힘 막대 폭(--app-sidebar-rail-width 3rem)과 펼친 사이드바 폭(--app-sidebar-width 16rem). */
        const RAIL_WIDTH = '48px';
        const SIDEBAR_WIDTH = '256px';
        for (const vp of [{ width: 1024, height: 800, gnb: false }, { width: 1280, height: 800, gnb: true }]) {
            test(`${vp.width}px: 접으면 사이드바가 빠지고 막대가 남으며 새로고침해도 유지된다`, async ({ page }) => {
                await page.setViewportSize({ width: vp.width, height: vp.height });
                await page.goto('/admin');
                const main = page.locator('main#main-content');
                await expect(main.getByRole('heading', HEADING)).toBeVisible({ timeout: 30000 });
                const sidebar = page.locator('aside#primary-sidebar');
                const rail = page.locator('aside[data-app-sidebar-rail]');
                const toggle = page.getByRole('button', { name: '사이드바 접기·펼치기' });
                await expect(toggle).toHaveAttribute('aria-controls', 'primary-sidebar');
                await expect(sidebar).toBeVisible();
                await expect(rail).toHaveCount(1);
                await expect(rail, '펼친 상태에서는 막대가 화면에 없어야 한다').toBeHidden();

                // 하이드레이션 전 클릭은 처리기가 없어 무시된다 — 펼친 상태일 때만 누르고, 접힘이 반영될 때까지 다시 시도한다.
                await expect(async () => {
                    if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click();
                    await expect(toggle).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 });
                }).toPass({ timeout: 15000 });
                await expect.poll(() => sidebar.boundingBox(), { message: '접은 사이드바가 화면에 남아 있다' }).toBeNull();
                await expect(rail.getByRole('button', { name: '사이드바 펼치기' })).toBeVisible();
                // 막대 단추는 아이콘만이 아니라 글자 '펼치기'도 보인다(찾기 쉬움 — DEC-OPS-227).
                await expect(rail.getByText('펼치기', { exact: true })).toBeVisible();
                await expect.poll(async () => (await rail.boundingBox())?.width ?? null).toBe(48);
                await expect(main).toHaveCSS('padding-left', RAIL_WIDTH);
                const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
                expect(overflowX, `${vp.width}px 에서 접힌 화면이 가로로 넘친다`).toBeLessThanOrEqual(1);

                // 인쇄에서는 막대도 그 자리(본문 여백)도 남지 않는다 — 접힘 블록 안의 인쇄 규칙(globals.css).
                await page.emulateMedia({ media: 'print' });
                await expect(rail, '인쇄에 접힘 막대가 남는다').toBeHidden();
                await expect(main).toHaveCSS('padding-left', '0px');
                await page.emulateMedia({ media: 'screen' });
                await expect(rail).toBeVisible();
                await expect(main).toHaveCSS('padding-left', RAIL_WIDTH);

                await page.reload();
                await expect(main.getByRole('heading', HEADING)).toBeVisible({ timeout: 30000 });
                expect(await page.evaluate(() => document.documentElement.getAttribute('data-sidebar-collapsed'))).toBe('true');
                await expect.poll(() => sidebar.boundingBox(), { message: '새로고침 뒤 사이드바가 다시 나타났다' }).toBeNull();
                await expect(rail, '새로고침 뒤 막대가 사라졌다').toBeVisible();
                await expect(toggle).toHaveAttribute('aria-expanded', 'false', { timeout: 15000 });

                if (vp.gnb) {
                    const browse = page
                        .getByRole('navigation', { name: '주메뉴 네비게이션' })
                        .getByRole('button', { name: /메뉴 보기$/ })
                        .first();
                    await browse.click();
                }
                else {
                    await toggle.click();
                }
                await expect(toggle).toHaveAttribute('aria-expanded', 'true');
                await expect(sidebar).toBeVisible();
                await expect(rail).toBeHidden();
                await expect(main).toHaveCSS('padding-left', SIDEBAR_WIDTH);
            });

            test(`${vp.width}px: 사이드바 맨 위 '사이드바 접기'와 막대의 '사이드바 펼치기'로 접고 펴며 포커스가 따라간다`, async ({ page }) => {
                await page.setViewportSize({ width: vp.width, height: vp.height });
                await page.goto('/admin');
                const main = page.locator('main#main-content');
                await expect(main.getByRole('heading', HEADING)).toBeVisible({ timeout: 30000 });
                const sidebar = page.locator('aside#primary-sidebar');
                const rail = page.locator('aside[data-app-sidebar-rail]');
                const collapse = sidebar.getByRole('button', { name: '사이드바 접기', exact: true });
                const expand = rail.getByRole('button', { name: '사이드바 펼치기', exact: true });
                const collapsedAttribute = () => page.evaluate(() => document.documentElement.getAttribute('data-sidebar-collapsed'));
                await expect(collapse).toBeVisible();
                await expect(collapse).toHaveText('사이드바 접기');
                await expect(collapse).toHaveAttribute('aria-controls', 'primary-sidebar');
                await expect(rail).toHaveCount(1);
                await expect(rail).toBeHidden();

                // 하이드레이션 전 클릭은 무시된다 — 아직 펼친 상태일 때만 누르고 접힘이 반영될 때까지 다시 시도한다.
                await expect(async () => {
                    if ((await collapsedAttribute()) !== 'true') await collapse.click();
                    await expect.poll(collapsedAttribute, { timeout: 2000 }).toBe('true');
                }).toPass({ timeout: 15000 });
                await expect.poll(() => sidebar.boundingBox(), { message: '접은 사이드바가 화면에 남아 있다' }).toBeNull();
                await expect(expand).toBeVisible();
                await expect(expand).toHaveAttribute('aria-expanded', 'false');
                // 누른 '접기'는 사라졌다 — 포커스가 문서 처음으로 떨어지지 않고 막대의 펼치기로 넘어간다.
                await expect(expand).toBeFocused();
                await expect(main).toHaveCSS('padding-left', RAIL_WIDTH);
                const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
                expect(overflowX, `${vp.width}px 에서 접힌 화면이 가로로 넘친다`).toBeLessThanOrEqual(1);

                await page.keyboard.press('Enter');
                await expect.poll(collapsedAttribute).toBeNull();
                await expect(sidebar).toBeVisible();
                await expect(rail).toBeHidden();
                await expect(collapse).toBeFocused();
                await expect(page.getByRole('button', { name: '사이드바 접기·펼치기' })).toHaveAttribute('aria-expanded', 'true');
                await expect(main).toHaveCSS('padding-left', SIDEBAR_WIDTH);
            });
        }

        test('접힘을 기억한 채 좁은 화면(768px)으로 가면 막대·여백 없이 서랍이 그대로 동작한다', async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto('/admin');
            const main = page.locator('main#main-content');
            await expect(main.getByRole('heading', HEADING)).toBeVisible({ timeout: 30000 });
            const sidebar = page.locator('aside#primary-sidebar');
            const rail = page.locator('aside[data-app-sidebar-rail]');
            // 역할 로케이터는 display:none 요소를 세지 않는다 — 서랍에서 DOM 에 하나 있는지는 숨은 요소까지 세어 확인한다.
            const collapseInDom = sidebar.getByRole('button', { name: '사이드바 접기', exact: true, includeHidden: true });
            const toggle = page.getByRole('button', { name: '사이드바 접기·펼치기' });
            await expect(async () => {
                if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click();
                await expect(toggle).toHaveAttribute('aria-expanded', 'false', { timeout: 2000 });
            }).toPass({ timeout: 15000 });
            await expect(rail).toBeVisible();

            // 기억(속성)은 남지만 접힘 규칙은 lg 이상에서만 적용된다 — 막대는 숨고 본문 여백은 0 이며 서랍은 닫혀 있다.
            await page.setViewportSize({ width: 768, height: 1024 });
            expect(await page.evaluate(() => document.documentElement.getAttribute('data-sidebar-collapsed'))).toBe('true');
            await expect(rail).toHaveCount(1);
            await expect(rail, '좁은 화면에 접힘 막대가 남는다').toBeHidden();
            await expect(main).toHaveCSS('padding-left', '0px');
            await expect(sidebar).toBeHidden();

            await page.getByRole('button', { name: '주 메뉴 열기' }).click();
            await expect(sidebar).toBeVisible();
            // 서랍에는 위쪽 '사이드바 닫기'가 있다 — 넓은 화면용 '사이드바 접기'는 보이지 않는다.
            await expect(sidebar.getByRole('button', { name: '사이드바 닫기' })).toBeVisible();
            await expect(collapseInDom).toHaveCount(1);
            await expect(collapseInDom).toBeHidden();
            await expect(rail).toBeHidden();
            const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflowX, '768px 서랍이 가로로 넘친다').toBeLessThanOrEqual(1);

            // 서랍을 닫고 다시 넓히면 기억한 대로 접힌 채다.
            await page.keyboard.press('Escape');
            await expect(sidebar).toBeHidden();
            await page.setViewportSize({ width: 1280, height: 800 });
            await expect(rail).toBeVisible();
            await expect.poll(() => sidebar.boundingBox(), { message: '다시 넓힌 화면에 접은 사이드바가 나타났다' }).toBeNull();
            await expect(main).toHaveCSS('padding-left', RAIL_WIDTH);
        });
    });
});
