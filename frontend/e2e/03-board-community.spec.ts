import { test, expect } from './fixtures/base-test';
import { CommunityPage } from './pages/CommunityPage';
import { getAdminBearerToken } from './utils/admin-token';

/**
 * [Tier 3] Business Domain: Board & Community Engagement
 */

test.describe('Tier 3: Board & Community (Business Flow)', () => {
    // [2026-08-10 제거] `test.describe.configure({ mode: 'parallel' })`.
    //   playwright.config 는 `workers: 1` 이라(공유 DB 오염·OOM 방지) 이 선언은 **아무 효과가 없었다**.
    //   그럼에도 "병렬 실행 최적화" 라는 주석이 붙어 있어, 아래 테스트들이 워커 격리를 전제로
    //   쓰여 있다는 잘못된 인상을 준다(실제로 `TEST_WORKER_INDEX` 를 이름에 섞는 코드가 그 인상 위에 있다).
    //   워커를 늘리려면 config 의 `workers` 를 바꾸고 **공유 DB 상태를 쓰는 스펙부터 격리**해야 한다 —
    //   그 판단 없이 이 한 줄만 두면 "병렬로 돌고 있다"는 착각만 남는다.
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.describe('Board Master Wizard Flow', () => {
        const workerId = process.env.TEST_WORKER_INDEX || '0';
        const boardName = `E2E_Wizard_Board_${workerId}_${Date.now()}`;
        const menuName = `Menu_${boardName}`;

        test('End-to-End Board Creation and Deployment', async ({ boardMasterPage }) => {
            boardMasterPage.page.on('console', msg => {
                console.log(`>>> [Browser Console] [${msg.type()}] ${msg.text()}`);
            });
            console.log('>>> Step 1: Navigating to Board Maker Wizard');
            await boardMasterPage.gotoMaker();

            console.log('>>> Step 2: Phase 1 - Basic Config');
            await boardMasterPage.fillStep1(boardName, 'E2E Optimized Board Description');

            console.log('>>> Step 3: Phase 2 - Template Choice');
            await boardMasterPage.fillStep2('지식 허브');

            console.log('>>> Step 4: Phase 3 - ACL Permissions');
            await boardMasterPage.fillStep3();

            console.log('>>> Step 5: Phase 4 - Automated Menu Deployment');
            await boardMasterPage.fillStep4(menuName);

            console.log('>>> Step 6: Verifying Deployment Success');
            await boardMasterPage.verifySuccess(menuName);
        });
    });

    test.describe('Article Lifecycle Management', () => {
        const templates = [
            { id: 'BBSMSTR_AAAAAAAAAAAA', name: 'General List' },
            { id: 'BBSMSTR_DDDDDDDDDDDD', name: 'Q&A Template' },
        ];

        for (const template of templates) {
            test(`CRUD Flow for ${template.name}`, async ({ page }) => {
                test.slow();
                console.log(`\n>>> Starting CRUD Flow for: ${template.name}`);

                page.on('dialog', async dialog => {
                    console.log(`>>> Dialog detected: [${dialog.message()}] - Auto-accepting.`);
                    await dialog.accept();
                });
                
                page.on('console', msg => {
                    console.log(`>>> [Browser Console] [${msg.type()}] ${msg.text()}`);
                });
                
                const workerId = process.env.TEST_WORKER_INDEX || '0';
                const articleTitle = `E2E Article W${workerId} ${Date.now()}`;
                let createdPstSn: number | null = null;

                const responseHandler = async (response: import('@playwright/test').Response) => {
                    const url = response.url();
                    const method = response.request().method();
                    // Intercept both old and new API paths
                    if (method === 'POST' && (url.includes('/api/v1/boards/posts') || url.includes('/api/v1/bbs'))) {
                        try {
                            const body = await response.json();
                            const pstSn = body?.data;
                            if (Number.isSafeInteger(Number(pstSn)) && Number(pstSn) > 0) {
                                createdPstSn = Number(pstSn);
                                console.log(`>>> [API Intercept] Captured pstSn: ${createdPstSn}`);
                            }
                        } catch { }
                    }
                };
                page.on('response', responseHandler);

                console.log(`>>> Step 1: Navigating to ${template.name} (${template.id})`);
                await page.goto(`/admin/community/boards/insert-board-article?bbsId=${template.id}`);
                
                // Anti-flaky: RichTextEditor(dynamic import) 마운트 완료를 먼저 대기
                // → 마운트 후 react-hook-form이 defaultValues를 inject하고 나면
                //   그 이후에 fill()을 실행해야 타이틀 롤백이 발생하지 않음
                const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror, .ProseMirror').first();
                await editor.waitFor({ state: 'visible', timeout: 30000 });

                const titleInput = page.locator('input[data-testid="article-title-input"], input[name="pstTtl"]').first();
                await titleInput.waitFor({ state: 'visible', timeout: 30000 });

                console.log('>>> Step 2: Creating Article');
                await titleInput.fill(articleTitle);
                await editor.fill('Initial E2E test content.');

                const commitBtn = page.locator('button:has-text("Commit Knowledge"), button:has-text("게시글 등록"), button:has-text("저장"), button[aria-label="게시글 저장"]').first();
                await commitBtn.click();

                console.log('>>> Waiting for navigation and toast...');
                // [2026-07-27 근본수정] 이 race 의 두 번째 갈래가 오래 red 로 남던 flaky 의 정체였다.
                //   `text=/성공|저장|완료/` 는 토스트가 아니라 **제출 버튼 자신**(<span>저장</span>,
                //   제출 중에는 '저장 중...')에 매칭된다. 실측: 제출을 하지 않아도 1152ms 만에 풀린다.
                //   → race 가 즉시 끝나고, URL 은 아직 등록 페이지이므로 아래 '아직 등록 페이지면 목록으로'
                //     분기가 **액션이 날아가는 중에** page.goto 를 실행해 앱의 Server Action 요청을 끊었다
                //     (net::ERR_ABORTED). 앱은 정상 저장에도 `TypeError: Failed to fetch` 를 콘솔에 남기고
                //     ConsoleGuard 가 테스트를 실패시켰다. 부하가 높을수록 액션이 늦어져 창이 넓어지는 것이
                //     "full-suite 에서만 실패하고 격리 실행은 전부 통과"의 정체다. **앱 결함이 아니었다.**
                //   토스트는 `await saveBoardArticle()` 이 resolve 된 뒤에만 뜨므로, 토스트를 진짜로
                //   기다리면 액션 완료가 보장된다. sonner 컨테이너로 범위를 좁혀 버튼과 분리한다.
                //
                //   ※ race 를 걷어내고 URL 전환만 기다리는 안(더 빠르고 pstSn 도 얻는다)을 실측해 봤으나
                //     채택하지 않았다 — 그러면 이후 단계의 진입 페이지가 목록→상세로 바뀌면서 Step 4
                //     삭제가 깨졌다. 삭제 단계에도 **완료를 기다리지 않고 goto 하는 같은 계열의 결함**이
                //     잠재해 있다는 뜻이다(별도 과제). 여기서는 원인(버튼 매칭)만 제거하고 흐름은 보존한다.
                await Promise.race([
                    page.waitForURL((url) => !url.href.includes('insert-board-article'), { timeout: 60000, waitUntil: 'domcontentloaded' }),
                    page.waitForSelector(
                        '[data-sonner-toast]:has-text("저장"), [data-sonner-toast]:has-text("완료"), [data-sonner-toast]:has-text("성공")',
                        { timeout: 30000 },
                    ),
                ]);
                
                page.off('response', responseHandler);

                if (!createdPstSn) {
                    const urlMatch = page.url().match(/[?&]pstSn=([^&]+)/);
                    if (urlMatch) {
                        const parsedPstSn = Number(urlMatch[1]);
                        if (Number.isSafeInteger(parsedPstSn) && parsedPstSn > 0) createdPstSn = parsedPstSn;
                    }
                }
                console.log(`>>> Post-create URL: ${page.url()} | pstSn: ${createdPstSn ?? 'NOT FOUND'}`);

                await test.step('User: Navigate to Created Article', async () => {
                    // Force go to list if still on same page or ID not found
                    if (!createdPstSn || page.url().includes('insert-board-article')) {
                        await page.goto(`/admin/community/boards/select-board-list?bbsId=${template.id}`);
                    }
                    
                    // 2. Anti-flaky: 스마트 재시도 로직 (데이터가 나타날 때까지 주기적으로 새로고침 및 확인)
                    await expect(async () => {
                        if (createdPstSn) {
                            await page.goto(`/admin/community/boards/detail?bbsId=${template.id}&pstSn=${createdPstSn}`);
                        } else {
                            await page.goto(`/admin/community/boards/select-board-list?bbsId=${template.id}`);
                            const targetLink = page.locator('a[href*="pstSn="]', { hasText: articleTitle }).first();
                            await targetLink.waitFor({ state: 'visible', timeout: 5000 });
                            await targetLink.click();
                        }
                        // hasText 옵션을 활용하여 텍스트 분산 렌더링에 안전한 확인 보장
                        const detailHeader = page.locator('h3, h2, div', { hasText: articleTitle }).first();
                        await expect(detailHeader).toBeVisible({ timeout: 5000 });
                    }).toPass({ timeout: 30000, intervals: [1000, 2000, 5000] });
                });

                console.log('\n>>> Step 3: Updating Article');
                const editBtn = page.locator('button:has-text("수정"), [aria-label="게시글 수정"], button:has-text("Edit")').first();
                await editBtn.waitFor({ state: 'visible', timeout: 15000 });
                await editBtn.click();
                
                // Anti-flaky (확정판): 에디터 visible + form defaultValues 주입 완료를 직접 검증
                // .ProseMirror visible만으로는 react-hook-form의 비동기 defaultValues 주입
                // 완료를 보장할 수 없음. toHaveValue(originalTitle)로 주입 완료를 직접 증명한
                // 뒤 fill()을 실행해야 [Updated] 텍스트 롤백을 완전히 차단할 수 있음.
                const updateEditor = page.locator('[data-testid="rich-text-editor"] .ProseMirror, .ProseMirror').first();
                await updateEditor.waitFor({ state: 'visible', timeout: 30000 });

                const updateTitleInput = page.locator('input[data-testid="article-title-input"], input[name="pstTtl"]').first();
                await updateTitleInput.waitFor({ state: 'visible', timeout: 30000 });
                // react-hook-form defaultValues 주입 완료 직접 검증
                // (originalTitle이 input에 실제로 채워져야 re-render가 완료된 것)
                await expect(updateTitleInput).toHaveValue(articleTitle, { timeout: 15000 });
                await updateTitleInput.fill(`${articleTitle} [Updated]`);
                await updateEditor.fill('Updated content.');

                const saveButton = page.getByRole('button', { name: '게시글 수정', exact: true });
                await saveButton.waitFor({ state: 'visible', timeout: 15000 });
                await saveButton.click();
                
                // Wait for save action completion (navigation or toast success)
                // [2026-07-27] 위 등록 단계와 동일한 결함이 여기에도 있었다 — 셀렉터가 제출 버튼('저장')에
                //   즉시 매칭돼 저장 완료를 기다리지 않고 통과했고, 바로 아래 검증 단계의 page.goto 가
                //   진행 중인 수정 액션을 끊었다. 동일하게 sonner 컨테이너로 범위를 좁힌다.
                await Promise.race([
                    page.waitForURL((url) => !url.href.includes('updateBoardArticle') && !url.href.includes('insert-board-article'), { timeout: 30000, waitUntil: 'domcontentloaded' }),
                    page.waitForSelector(
                        '[data-sonner-toast]:has-text("저장"), [data-sonner-toast]:has-text("완료"), [data-sonner-toast]:has-text("성공")',
                        { timeout: 15000 },
                    ),
                ]).catch(() => {
                    console.log('>>> Warning: Save action completion wait timed out, continuing...');
                });
                console.log('>>> Update complete.');

                await test.step('User: Verify Updated Article', async () => {
                    // 2. Anti-flaky: 스마트 재시도 로직 (revalidatePath 반영 지연 방어)
                    await expect(async () => {
                        await page.goto(`/admin/community/boards/select-board-list?bbsId=${template.id}`);
                        const updatedArticle = page.locator('a[href*="pstSn="]', { hasText: `${articleTitle} [Updated]` }).first();
                        await expect(updatedArticle).toBeVisible({ timeout: 5000 });
                    }).toPass({ timeout: 30000, intervals: [1000, 2000, 5000] });
                });

                console.log('>>> Step 4: Deleting Article');
                // Navigate to detail for deletion
                await page.locator('a[href*="pstSn="]', { hasText: `${articleTitle} [Updated]` }).first().click();
                
                const deleteBtn = page.locator('[aria-label="게시글 삭제"], button:has-text("Delete")').first();
                await deleteBtn.waitFor({ state: 'visible', timeout: 15000 });
                await deleteBtn.click();

                // [2026-07-27 false-green 제거] 삭제는 확인 모달(useConfirm)을 통과해야 실행된다.
                //   종전 코드는 모달을 확인하지 않고 곧바로 목록으로 이동해 '사라졌는지'만 봤다 —
                //   **삭제 액션은 실행되지 않았다.** 그럼에도 통과할 수 있었던 것은 대상이 목록 1페이지
                //   밖이면 locator 가 아무것도 잡지 못해 toBeHidden 이 성립하기 때문이다. 그린은 삭제의
                //   증거가 아니라 페이지네이션의 부산물이었다.
                //   (이 단계를 제대로 고치는 과정에서 **앱의 삭제가 아예 동작하지 않는 결함**이 드러나
                //    함께 수정했다 — BoardDetailClient 의 form action ↔ confirm 교착. 상세는 그 주석 참조.)
                const confirmDialog = page.getByRole('dialog');
                await confirmDialog.getByRole('button', { name: '삭제', exact: true }).click();
                // 삭제 성공 시 앱은 목록으로 되돌아간다 — 이것을 완료 신호로 기다린 뒤 검증한다.
                await page.waitForURL((url) => url.href.includes('select-board-list'), { timeout: 30000 });

                // 2. Anti-flaky: 스마트 재시도 로직 (목록에서 완전히 사라졌는지 확인)
                await expect(async () => {
                    await page.goto(`/admin/community/boards/select-board-list?bbsId=${template.id}`);
                    const updatedArticle = page.locator('a[href*="pstSn="]', { hasText: `${articleTitle} [Updated]` }).first();
                    await expect(updatedArticle).toBeHidden({ timeout: 5000 });
                }).toPass({ timeout: 30000, intervals: [1000, 2000, 5000] });
                
                console.log('>>> Successfully deleted.');
            });
        }
    });

    test('Community of Practice (COP) Matrix Verification', async ({ page }) => {
        const communityPage = new CommunityPage(page);
        await communityPage.goto();
        await communityPage.selectCategory('COMMUNITY');
        await communityPage.verifyCOPList();
        await communityPage.gotoMaster();
    });

    /**
     * 댓글 생명주기 — 작성 → 수정 → 삭제.
     *
     * [왜 필요한가 — 2026-08-11] 댓글 UI 에는 수정·삭제 버튼이 있고 단위 테스트도 있지만
     *   그쪽은 API 를 목으로 대체한다. **실 왕복은 검증된 적이 없다.**
     *   22-deep-security-guard 가 댓글 입력을 쓰지만 그것은 XSS 새니타이제이션이 목적이라
     *   생성 경로만 지나가고 수정·삭제는 건드리지 않는다.
     *
     * [무엇을 보는가] 화면 반영과 **서버 상태를 따로** 확인한다. 이 저장소에는
     *   'API 를 부르지 않고 성공만 보여주던' 사례가 반복해서 나왔다(11 티어의 가짜 상신 토스트,
     *   게시글 첨부 유실, 등록이 이메일을 버리던 문제). 화면만 보면 그 계열을 놓친다.
     */
    test('댓글: 작성 → 수정 → 삭제가 화면과 서버 양쪽에 반영된다', async ({ page, request }) => {
        const auth = { Authorization: `Bearer ${getAdminBearerToken()}` };
        const bbsId = 'BBSMSTR_AAAAAAAAAAAA';
        const stamp = Date.now();
        const original = `E2E03 댓글 원본 ${stamp}`;
        const edited = `E2E03 댓글 수정 ${stamp}`;

        // 댓글이 매달릴 게시글을 직접 만든다(시드에 의존하면 누적 쓰레기가 쌓인다 — 22·24·25 와 같은 방침).
        const createRes = await request.post('/api/v1/boards/posts', {
            headers: auth,
            data: { bbsId, pstTtl: `E2E03_CMT_${stamp}`, pstCn: '댓글 생명주기 검증용 임시 게시글' },
        });
        expect(createRes.ok(), '검증용 게시글 시딩이 성공해야 한다').toBeTruthy();
        const pstSn = Number((await createRes.json())?.data);
        expect(Number.isSafeInteger(pstSn) && pstSn > 0, '서버가 채번한 게시글 ID 를 받아야 한다').toBeTruthy();

        /** 서버가 실제로 들고 있는 댓글 본문 목록. 화면 단언과 분리해서 본다. */
        const serverComments = async (): Promise<string[]> => {
            const res = await request.get(`/api/v1/comments?pstSn=${pstSn}&bbsId=${bbsId}&size=100`, { headers: auth });
            const data = (await res.json())?.data;
            const list = data?.list ?? data?.content ?? [];
            return (list as { ansCn: string }[]).map((c) => c.ansCn);
        };

        try {
            await page.goto(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`);

            // ── 작성
            const input = page.locator('textarea[name="ansCn"]');
            await expect(input).toBeVisible({ timeout: 15000 });
            await input.fill(original);
            await page.getByRole('button', { name: /Commit Response|COMMITTING/i }).click();

            const rendered = page.locator('p.whitespace-pre-wrap').filter({ hasText: original }).first();
            await expect(rendered, '작성한 댓글이 화면에 나타나야 한다').toBeVisible({ timeout: 15000 });
            await expect.poll(serverComments, { timeout: 15000, message: '작성이 서버에 반영되어야 한다' })
                .toContain(original);

            // ── 수정
            const editBtn = page.getByTestId('comment-edit-button').first();
            await editBtn.hover();
            await editBtn.click({ force: true });
            const editBox = page.getByLabel('댓글 수정 내용');
            // 편집창에 기존 본문이 실려야 한다 — 빈 칸이 뜨면 그것은 수정이 아니라 덮어쓰기다.
            await expect(editBox, '수정 폼에 기존 본문이 실려야 한다').toHaveValue(original, { timeout: 15000 });
            await editBox.fill(edited);
            await page.getByTestId('edit-save-button').first().click({ force: true });

            await expect(
                page.locator('p.whitespace-pre-wrap').filter({ hasText: edited }).first(),
                '수정 결과가 화면에 반영되어야 한다',
            ).toBeVisible({ timeout: 15000 });
            await expect.poll(serverComments, { timeout: 15000, message: 'UI 수정이 서버에 반영되어야 한다' })
                .toContain(edited);

            // ── 삭제 (네이티브 confirm 을 쓴다 — 클릭 전에 핸들러를 걸어야 한다)
            page.once('dialog', (dialog) => dialog.accept());
            const deleteBtn = page.getByTestId('comment-delete-button').first();
            await deleteBtn.hover();
            await deleteBtn.click({ force: true });

            await expect(
                page.locator('p.whitespace-pre-wrap').filter({ hasText: edited }),
                '삭제한 댓글이 화면에서 사라져야 한다',
            ).toHaveCount(0, { timeout: 15000 });
            await expect.poll(serverComments, { timeout: 15000, message: 'UI 삭제가 실제 삭제로 이어져야 한다' })
                .not.toContain(edited);
        } finally {
            await request.delete(`/api/v1/boards/${bbsId}/posts/${pstSn}`, { headers: auth });
        }
    });

    test.describe('Community Supplementary Services Smoke Check', () => {
        // [E2E 감사 Phase0] 동일 URL(/admin/collaboration) 3중 중복 스모크(Community Hub/Smart Scrap/
        // Corporate Addressbook)를 1개로 축약. 실제 협업 거동은 08(collab)·13(mail)이 검증한다.
        // 'Online Polls'(/admin/survey/manage)는 05-public-experience의 설문 생명주기가 소유하므로 제외.
        const services = [
            { name: 'Collaboration Hub', url: '/admin/collaboration' },
            { name: 'Electronic Approvals', url: '/admin/sanctn/workflow' }
        ];

        for (const service of services) {
            test(`Service Availability: ${service.name}`, async ({ page }) => {
                await page.goto(service.url, { waitUntil: 'domcontentloaded' });
                await expect(page.locator('main, .main-content, #content').first()).toBeVisible();
            });
        }
    });
});
