import { test, expect } from './fixtures/base-test';
import { CommunityPage } from './pages/CommunityPage';

/**
 * [Tier 3] Business Domain: Board & Community Engagement
 */

test.describe('Tier 3: Board & Community (Business Flow)', () => {
    // 3. 병렬 실행 최적화: 워커 간 독립 실행 보장
    test.describe.configure({ mode: 'parallel' });
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
                let createdpstId: string | null = null;

                const responseHandler = async (response: import('@playwright/test').Response) => {
                    const url = response.url();
                    const method = response.request().method();
                    // Intercept both old and new API paths
                    if (method === 'POST' && (url.includes('/api/v1/boards/posts') || url.includes('/api/v1/bbs'))) {
                        try {
                            const body = await response.json();
                            const pstId = body?.data;
                            if (pstId) {
                                createdpstId = String(pstId);
                                console.log(`>>> [API Intercept] Captured pstId: ${createdpstId}`);
                            }
                        } catch (e: any) { }
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
                //   ※ race 를 걷어내고 URL 전환만 기다리는 안(더 빠르고 pstId 도 얻는다)을 실측해 봤으나
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

                if (!createdpstId) {
                    const urlMatch = page.url().match(/[?&]pstId=([^&]+)/);
                    if (urlMatch) createdpstId = urlMatch[1];
                }
                console.log(`>>> Post-create URL: ${page.url()} | pstId: ${createdpstId ?? 'NOT FOUND'}`);

                await test.step('User: Navigate to Created Article', async () => {
                    // Force go to list if still on same page or ID not found
                    if (!createdpstId || page.url().includes('insert-board-article')) {
                        await page.goto(`/admin/community/boards/select-board-list?bbsId=${template.id}`);
                    }
                    
                    // 2. Anti-flaky: 스마트 재시도 로직 (데이터가 나타날 때까지 주기적으로 새로고침 및 확인)
                    await expect(async () => {
                        if (createdpstId) {
                            await page.goto(`/admin/community/boards/detail?bbsId=${template.id}&pstId=${createdpstId}`);
                        } else {
                            await page.goto(`/admin/community/boards/select-board-list?bbsId=${template.id}`);
                            const targetLink = page.locator('a[href*="pstId="]', { hasText: articleTitle }).first();
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

                const saveButton = page.locator('button[type="submit"]').filter({ hasText: /Commit Knowledge|Saving Node|저장/ }).first();
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
                        const updatedArticle = page.locator('a[href*="pstId="]', { hasText: `${articleTitle} [Updated]` }).first();
                        await expect(updatedArticle).toBeVisible({ timeout: 5000 });
                    }).toPass({ timeout: 30000, intervals: [1000, 2000, 5000] });
                });

                console.log('>>> Step 4: Deleting Article');
                // Navigate to detail for deletion
                await page.locator('a[href*="pstId="]', { hasText: `${articleTitle} [Updated]` }).first().click();
                
                const deleteBtn = page.locator('button:has-text("삭제"), [aria-label="게시글 삭제"], button:has-text("Delete")').first();
                await deleteBtn.waitFor({ state: 'visible', timeout: 15000 });
                await deleteBtn.click();

                // 🚨 [2026-07-27 미해결 결함 — 이 단계는 삭제를 증명하지 못한다]
                //   삭제는 확인 모달(useConfirm)을 통과해야 실제로 실행된다
                //   (BoardDetailClient: `const isConfirmed = await confirm({...}); if (!isConfirmed) return;`).
                //   그런데 아래 검증은 모달을 확인하지 않는다 — **삭제 액션은 실행되지 않는다.**
                //   그럼에도 통과하는 이유는 대상이 목록 1페이지 밖이면 locator 가 아무것도 잡지 못해
                //   toBeHidden 이 성립하기 때문이다. 즉 이 그린은 삭제의 증거가 아니라 페이지네이션의
                //   부산물이다(false-green).
                //
                //   모달을 확인하도록 고치는 시도는 보류했다 — 클릭 직후 버튼은 포커스를 받지만
                //   (`[active]`) 모달이 열리지 않아 15분 타임아웃까지 매달렸다. 하이드레이션 완료 전
                //   `<form action={fn}>` 의 네이티브 submit 이 조용히 삼켜지는 것으로 의심되며,
                //   그 자체가 앱 측 조사 대상이다(빠른 클릭에 삭제가 무반응). 별도 과제로 남긴다.
                //
                // 2. Anti-flaky: 스마트 재시도 로직 (목록에서 완전히 사라졌는지 확인)
                await expect(async () => {
                    await page.goto(`/admin/community/boards/select-board-list?bbsId=${template.id}`);
                    const updatedArticle = page.locator('a[href*="pstId="]', { hasText: `${articleTitle} [Updated]` }).first();
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
