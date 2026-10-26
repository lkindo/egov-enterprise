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
        // [2026-10-25 PR #977 flaky] 진행 문구는 '…는 중'과 '…고 있습니다' 두 형태다. 게시글 작성 화면은 게시판 편집 권한을
        //   받기 전까지 '게시판 편집 권한을 확인하고 있습니다.'를 보이며 입력 영역(fieldset)을 비활성으로 두는데, 이 패턴이
        //   '확인하는 중'만 잡아 권한 응답이 늦으면 비활성(50% 투명) 단추를 color-contrast 위반으로 감사했다(첫 시도만 실패).
        const LOADING_TEXT = /(불러오|준비하|확인하|가져오)(는 중|고 있습니다)|로딩 중/;
        async function expectContentReady(page: Page) {
            await expect(page.getByRole('heading', { level: 1 }).filter({ hasNotText: LOADING_TEXT }).first())
                .toBeVisible({ timeout: 30000 });
            await expect(page.locator('[role="status"]').filter({ hasText: LOADING_TEXT })).toHaveCount(0);
        }
        async function expectPurposeTitle(page: Page, purpose: string) {
            await expect(page).toHaveTitle(new RegExp(`^${purpose} \\| `));
        }
        async function expectNoAxeViolations(page: Page, route: string, purpose: string) {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto(route);
            await expectContentReady(page);
            await expectPurposeTitle(page, purpose);
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
            for (const [route, purpose] of [
                ['/admin/system/logs/user', '사용자 로그'],
                ['/admin/user/manage', '사용자 관리'],
                // [2026-10-26 ADR-0043 1차 UX-09] 게시판 없이 들어오면 공지사항 작성 폼 대신 게시판 고르기를 보인다 — 작성 폼 감사를 유지하려고
                //   종전 기본값이던 공지사항을 명시하고, 고르기 화면은 따로 감사한다.
                ['/admin/community/boards/insert-board-article?bbsId=BBSMSTR_AAAAAAAAAAAA', '게시글 작성·수정'],
                ['/admin/community/boards/insert-board-article', '게시글 작성·수정'],
                ['/admin/help/faq', '자주 묻는 질문 관리'],
                ['/admin/community/boards/maker', '게시판 생성'],
                // [2026-10-24 DEC-OPS-382] 패턴 갤러리 — 실제 토큰·셸로 그린 표본의 렌더 결과 대비를 본다(정적 표본이라 결정적이다).
                ['/admin/patterns', '업무 화면 패턴 갤러리'],
            ]) {
                test(`${route} 에 axe 위반이 없다`, async ({ page }) => {
                    await expectNoAxeViolations(page, route, purpose);
                });
            }
            test('문서 제목은 실제 링크 이동·뒤로가기·레거시 redirect 목적지에 맞게 갱신된다', async ({ page }) => {
                await page.goto('/admin');
                await expectContentReady(page);
                await expectPurposeTitle(page, '관리자 대시보드');

                await page.getByRole('link', { name: '사용자 확인', exact: true }).click();
                await expect(page).toHaveURL(/\/admin\/user\/manage(?:\?|$)/);
                await expectContentReady(page);
                await expectPurposeTitle(page, '사용자 관리');

                await page.goBack();
                await expect(page).toHaveURL(/\/admin(?:\?|$)/);
                await expectContentReady(page);
                await expectPurposeTitle(page, '관리자 대시보드');

                await page.goto('/admin/system/audit');
                await expect(page).toHaveURL(/\/admin\/system\/monitoring\/hub\?tab=system$/);
                await expectContentReady(page);
                await expectPurposeTitle(page, '시스템 모니터링');
            });
        });
        test.describe('일반 사용자 화면', () => {
            test.use({ storageState: 'playwright/.auth/user.json' });
            test('/help 에 axe 위반이 없다', async ({ page }) => {
                await expectNoAxeViolations(page, '/help', '도움말');
            });
            test('클라이언트 쪽지함은 서버 layout의 문서 제목을 사용한다', async ({ page }) => {
                await page.goto('/note');
                await expectContentReady(page);
                await expectPurposeTitle(page, '쪽지함');
            });
        });
    });
});
