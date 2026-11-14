import { randomBytes } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect,test } from '../fixtures/browser-test';
import { LOADING_TEXT, expectContentReady, expectNoAccessibilityViolations } from '../fixtures/accessibility';
import { HELP_FAQ_BOARD_ID } from '../../src/config/board-ids';
import { SITE_IDENTITY } from '../../src/config/site-identity';
test.describe('Quality & Resilience', () => {
    /**
     * [2026-09-14 GAP-UIQ-001] UI 품질 시나리오 8개가 쓰는 화면 중 axe 자동 검사가 없던 곳을 채운다.
     * `/login`·`/admin` 은 01-core-base 가 이미 검사한다.
     *
     * ⚠ 이것은 자동 검사일 뿐이다. 기준선의 `unmeasured` 판정과 수동 접근성 48건(전문가 40·NVDA 8)을
     *   대신하지 않으며, 이 통과를 `measured` 증거로 쓰지 않는다(ADR-0005).
     *
     * 로딩 중인 폴백을 검사하지 않도록, 폴백이 아닌 h1 이 보이고 로딩 상태가 사라진 뒤 감사한다
     * (01-core-base 의 2026-07-27 스피너 오감사 선례). 준비·동작 멈춤·감사는 e2e/fixtures/accessibility.ts 가 한다.
     */
    test.describe('Scenario Route Accessibility (axe)', () => {
        async function expectPurposeTitle(page: Page, purpose: string) {
            await expect(page).toHaveTitle(new RegExp(`^${purpose} \\| `));
        }
        /** 화면을 열고 제목까지 확인한 뒤, 감사할 상태를 만드는 단계(beforeAudit)를 거쳐 axe 로 감사한다. */
        async function auditRoute(page: Page, route: string, purpose: string, beforeAudit?: () => Promise<void>) {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto(route);
            await expectContentReady(page);
            await expectPurposeTitle(page, purpose);
            await beforeAudit?.();
            await expectNoAccessibilityViolations(page, route);
        }

        /*
         * [2026-10-28 감사 D6-1] FAQ 를 그리는 두 화면(지식 허브 FAQ 탭의 인기 문서·문서 목록, 도움말의 질문 목록)은 감사할 행을
         *   스스로 만든다. 종전에는 다른 시험이 만든 FAQ 에 기댔다 — 행이 없으면 인기 문서가 빈 상태 문구만 그려 행 단추를 한 번도
         *   감사하지 않은 채 통과했고(false green), 행이 있으면 그 단추의 결함으로 붉어졌다(실행 순서에 따라 갈렸다).
         *   지식 허브 FAQ 탭과 도움말은 같은 게시판(HELP_FAQ_BOARD_ID)을 그린다. 정리는 화면을 먼저 떠난 뒤 한다 — 열린 화면의
         *   재조회가 지운 글을 404 로 받으면 브라우저 오류 감시가 실패로 잡는다(PR #930).
         */
        type OwnedFaq = { pstSn: number; title: string; answer: string };
        async function withOwnedFaq(adminRequest: APIRequestContext, page: Page, body: (faq: OwnedFaq) => Promise<void>) {
            // 'E2E' 접두사는 전역 정리(e2e/scripts/cleanup-db.ts)가 이 게시판에서 거두는 표식이다 — 중간에 죽어도 남지 않는다.
            const title = `E2E 접근성 감사 FAQ ${randomBytes(4).toString('hex')}`;
            const answer = '접근성 감사가 펼친 답변까지 함께 검사합니다.';
            // 비밀 여부를 보내지 않는다 — 서버가 빈 값을 공개('N')로 저장하고 옛 NULL 행도 'N' 으로 낸다(DEC-OPS-388 ⑦). 이 감사가 그 경로도 함께 지킨다.
            const created = await adminRequest.post('/api/v1/boards/posts', {
                data: { bbsId: HELP_FAQ_BOARD_ID, pstTtl: title, pstCn: `<p>${answer}</p>` },
            });
            expect(created.status(), '감사용 FAQ 생성').toBe(201);
            const faq = { pstSn: (await created.json()).data as number, title, answer };
            try {
                await body(faq);
            } finally {
                try {
                    await page.goto('about:blank');
                } finally {
                    const removed = await adminRequest.delete(`/api/v1/boards/${HELP_FAQ_BOARD_ID}/posts/${faq.pstSn}`);
                    expect(removed.status(), '감사용 FAQ 정리').toBe(200);
                }
            }
        }
        /**
         * 인기 문서는 조회수 순 상위 5건이라(조회수는 1분마다 반영된다) 그 다섯이 누구의 글인지는 정할 수 없다. 정할 수 있는 것은
         * 이 게시판에 글이 하나 이상 있다는 것이다 — 감사용 FAQ 가 있으므로 인기 문서는 비지 않고, 감사가 행 단추를 반드시 본다.
         */
        async function expectFaqHubRows(page: Page, faq: OwnedFaq) {
            await expect(page.getByRole('button', { name: `${faq.title} 상세 보기`, exact: true })).toBeVisible();
            const popular = page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: '인기 문서', exact: true }) });
            await expect(popular.getByRole('listitem').first().getByRole('button')).toBeVisible();
            await expect(popular.getByText('표시할 문서가 없습니다.')).toHaveCount(0);
        }
        /** 도움말은 최신 FAQ 를 앞에 둔다. 감사용 FAQ 를 펼쳐 질문 단추(aria-expanded)와 답변 영역까지 감사한다. */
        async function expandOwnedFaq(page: Page, faq: OwnedFaq) {
            const question = page.getByRole('button', { name: faq.title });
            await expect(question).toBeVisible();
            await question.click();
            await expect(question).toHaveAttribute('aria-expanded', 'true');
            await expect(page.getByRole('region', { name: faq.title })).toContainText(faq.answer);
        }

        test.describe('관리자 화면', () => {
            test.use({ storageState: 'playwright/.auth/admin.json' });
            const FAQ_HUB_ROUTE = '/admin/help/faq';
            for (const [route, purpose] of [
                ['/admin/system/logs/user', '사용자 로그'],
                ['/admin/user/manage', '사용자 관리'],
                // [2026-10-26 ADR-0043 1차 UX-09] 게시판 없이 들어오면 공지사항 작성 폼 대신 게시판 고르기를 보인다 — 작성 폼 감사를 유지하려고
                //   종전 기본값이던 공지사항을 명시하고, 고르기 화면은 따로 감사한다.
                ['/admin/community/boards/insert-board-article?bbsId=BBSMSTR_AAAAAAAAAAAA', '게시글 작성·수정'],
                ['/admin/community/boards/insert-board-article', '게시글 작성·수정'],
                // [2026-10-26 ADR-0043 0차 NAV-01] 허브 탭 화면의 제목은 '탭 · 지식 허브' 다(관리 전용 화면이 아니다).
                [FAQ_HUB_ROUTE, '자주 묻는 질문 · 지식 허브'],
                ['/admin/community/boards/maker', '게시판 생성'],
                // [2026-10-24 DEC-OPS-382] 패턴 갤러리 — 실제 토큰·셸로 그린 표본의 렌더 결과 대비를 본다(정적 표본이라 결정적이다).
                ['/admin/patterns', '업무 화면 패턴 갤러리'],
            ]) {
                test(`${route} 에 axe 위반이 없다`, async ({ page, adminRequest }) => {
                    if (route !== FAQ_HUB_ROUTE) {
                        await auditRoute(page, route, purpose);
                        return;
                    }
                    await withOwnedFaq(adminRequest, page, (faq) => auditRoute(page, route, purpose, () => expectFaqHubRows(page, faq)));
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
            /*
             * [2026-11-14 원점 평가] 일반 사용자의 업무 화면 유형별 대표 — 업무 홈·결재(목록·기안)·일정·쪽지·설문·행사·검색·커뮤니티·
             *   업무 보고·안내 페이지. 종전 자동 감사는 관리자 화면과 로그인·도움말 위주라, 사용자가 가장 자주 쓰는 화면이 빠져 있었다.
             *   빈 목록이어도 머리글·필터·빈 상태·쪽 이동 같은 화면 골격을 감사한다(행 단위 결함은 행을 만드는 시험이 따로 본다).
             */
            test('업무 홈 에 axe 위반이 없다', async ({ page }) => {
                await page.emulateMedia({ reducedMotion: 'reduce' });
                await page.goto('/');
                await expectContentReady(page);
                await expect(page).toHaveTitle(SITE_IDENTITY.siteName);
                await expectNoAccessibilityViolations(page, '/');
            });
            test('/approvals/draft 에 axe 위반이 없다', async ({ page }) => {
                // 기안 화면은 열리자마자 기안 대화상자를 띄운다 — 모달이 뒤의 h1 을 가리므로 대화상자 제목을 준비 신호로 삼고 그 상태를 감사한다.
                await page.emulateMedia({ reducedMotion: 'reduce' });
                // 임시저장 목록은 조회 중에 아무것도 그리지 않는다(행이 늦게 나타난다) — 응답이 온 뒤에 감사한다.
                const temporaryDraftsLoaded = page.waitForResponse((response) => response.request().method() === 'GET'
                    && new URL(response.url()).pathname === '/api/v1/approvals/temporary-drafts', { timeout: 30000 });
                await page.goto('/approvals/draft');
                const dialog = page.getByRole('dialog', { name: '새 결재 기안' });
                await expect(dialog.getByRole('heading', { name: '새 결재 기안' })).toBeVisible({ timeout: 30000 });
                await expectPurposeTitle(page, '새 결재 기안');
                expect((await temporaryDraftsLoaded).ok(), '임시저장 목록 조회').toBe(true);
                await expect(dialog.locator('[role="status"]').filter({ hasText: LOADING_TEXT })).toHaveCount(0);
                await expectNoAccessibilityViolations(page, '/approvals/draft', { ready: false });
            });
            // [2026-11-14] 이름을 내용에서 얻는 공용 부품(달력 날짜 단추·건수 탭)은 실제 브라우저가 계산한 이름도 본다 — sr-only·flex
            //   경계에서 구분자가 끼는지는 jsdom 이 아니라 브라우저의 접근 이름 계산이 정한다. Chromium 은 숨김 글자 앞에 공백을 넣어
            //   "14 일 금요일, …"·"게시글 0 건" 이 된다 — 보이는 숫자가 이름의 독립 낱말이라 WCAG 2.5.3 에 그대로 맞는다.
            test('/smart-toolkit/schedule 에 axe 위반이 없다', async ({ page }) => {
                await auditRoute(page, '/smart-toolkit/schedule', '일정 관리', async () => {
                    await expect(page.getByRole('button', { name: /^\d{1,2} 일 [월화수목금토일]요일, \d{4}년 \d{1,2}월(, 오늘)?(, 선택됨)?$/ }).first())
                        .toBeVisible();
                });
            });
            test('/search 에 axe 위반이 없다', async ({ page }) => {
                await auditRoute(page, '/search', '통합 검색', async () => {
                    await expect(page.getByRole('tab', { name: /^임직원 \d+ 건$/ })).toBeVisible();
                });
            });
            for (const [route, purpose] of [
                ['/approvals', '전자결재'],
                ['/note', '쪽지함'],
                ['/survey', '설문 목록'],
                ['/events', '행사 참가'],
                ['/cop/cmy/selectCommunityList', '커뮤니티 목록'],
                ['/smart-toolkit/work-report', '업무 보고'],
                ['/pages', '안내 페이지'],
            ]) {
                test(`${route} 에 axe 위반이 없다`, async ({ page }) => {
                    await auditRoute(page, route, purpose);
                });
            }
            test('/help 에 axe 위반이 없다', async ({ page, adminRequest }) => {
                await withOwnedFaq(adminRequest, page, (faq) => auditRoute(page, '/help', '도움말', () => expandOwnedFaq(page, faq)));
            });
            test('클라이언트 쪽지함은 서버 layout의 문서 제목을 사용한다', async ({ page }) => {
                await page.goto('/note');
                await expectContentReady(page);
                await expectPurposeTitle(page, '쪽지함');
            });
        });
    });
});
