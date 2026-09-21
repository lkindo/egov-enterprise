import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';
test.describe('Quality & Resilience', () => {
    /**
     * [2026-09-14 GAP-UIQ-001] UI 품질 시나리오 8개가 쓰는 화면 중 axe 자동 검사가 없던 곳을 채운다.
     * `/login`·`/admin` 은 01-core-base 가 이미 검사한다.
     *
     * ⚠ 이것은 자동 검사일 뿐이다. 기준선의 `unmeasured` 판정과 수동 접근성 48건(전문가 40·NVDA 8)을
     *   대신하지 않으며, 이 통과를 `measured` 증거로 쓰지 않는다(ADR-0005).
     *
     * 로딩 중인 폴백을 검사하지 않도록, 폴백이 아닌 h1 이 보이고 로딩 상태가 사라진 뒤 감사한다
     * (01-core-base 의 2026-07-27 스피너 오감사 선례).
     */
    test.describe('Scenario Route Accessibility (axe)', () => {
        const LOADING_TEXT = /불러오는 중|준비하는 중|확인하는 중|로딩 중/;
        async function expectNoAxeViolations(page: Page, route: string) {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto(route);
            await expect(page.getByRole('heading', { level: 1 }).filter({ hasNotText: LOADING_TEXT }).first())
                .toBeVisible({ timeout: 30000 });
            await expect(page.locator('[role="status"]').filter({ hasText: LOADING_TEXT })).toHaveCount(0);
            await page.addStyleTag({
                content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
            });
            await page.evaluate(() => new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            }));
            // [2026-09-14 main CI flaky] 위 CSS 는 JS 로 구동되는 진입 모션을 멈추지 못한다. MotionConfig reducedMotion="user" 도
            //   이동만 끄고 투명도 페이드는 남기므로, 페이드 도중에 감사하면 반투명 글자가 color-contrast 위반으로 잡혔다
            //   (게시글 작성 화면, 첫 시도만 실패·재시도 통과). 인라인 투명도가 여러 번 연속 같고 실행 중인 애니메이션이
            //   없을 때 감사한다. 고정 반투명(예: 배너 0.8)은 값이 변하지 않으므로 대기를 막지 않고, 영구 대비 결함은 그대로 잡힌다.
            await page.waitForFunction(() => {
                const state = window as unknown as {
                    __axeOpacity?: string;
                    __axeStableSamples?: number;
                };
                const opacities = Array.from(document.querySelectorAll<HTMLElement>('[style*="opacity"]'))
                    .map((element) => element.style.opacity)
                    .join('|');
                const animating = document.getAnimations().some((animation) => animation.playState === 'running');
                if (animating || opacities !== state.__axeOpacity) {
                    state.__axeOpacity = opacities;
                    state.__axeStableSamples = 0;
                    return false;
                }
                state.__axeStableSamples = (state.__axeStableSamples ?? 0) + 1;
                return state.__axeStableSamples >= 3;
            }, undefined, { polling: 100, timeout: 10000 });
            const a11y = await new AxeBuilder({ page }).analyze();
            expect(a11y.violations, `${route}: ${JSON.stringify(a11y.violations.map((v) => `${v.id}(${v.nodes.length})`))}`).toEqual([]);
        }
        test.describe('관리자 화면', () => {
            test.use({ storageState: 'playwright/.auth/admin.json' });
            for (const route of [
                '/admin/system/logs/user',
                '/admin/user/manage',
                '/admin/community/boards/insert-board-article',
                '/admin/help/faq',
                '/admin/community/boards/maker',
            ]) {
                test(`${route} 에 axe 위반이 없다`, async ({ page }) => {
                    await expectNoAxeViolations(page, route);
                });
            }
        });
        test.describe('일반 사용자 화면', () => {
            test.use({ storageState: 'playwright/.auth/user.json' });
            test('/help 에 axe 위반이 없다', async ({ page }) => {
                await expectNoAxeViolations(page, '/help');
            });
        });
    });
});
