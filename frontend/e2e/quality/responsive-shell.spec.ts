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
});
