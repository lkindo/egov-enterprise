import { expect,test } from '../fixtures/browser-test';
import { getAdminBearerToken } from '../utils/admin-token';
import { screenYmd } from '../helpers/screen-date';
test.describe('게시판과 커뮤니티', () => {
    test('템플릿 안내에서 게시판 유형을 미리 보며 실제 게시글 요청을 보내지 않는다', async ({ adminPage }, testInfo) => {
        await adminPage.setViewportSize({ width: 1440, height: 1000 });
        await adminPage.goto('/admin/community/templates');
        await adminPage.getByRole('link', { name: '게시판 만들기에서 화면 유형 확인' }).click();
        await adminPage.getByRole('textbox', { name: '게시판 명칭' }).fill('미리보기 확인');
        await adminPage.getByRole('button', { name: /다음 단계로/ }).click();
        const preview = adminPage.getByRole('region', { name: '게시판 레이아웃 미리보기' });
        await expect(preview).toBeVisible();
        const unexpectedRequests: string[] = [];
        adminPage.on('request', request => {
            if (request.url().includes('/api/v1/boards/') ||
                (request.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()))) {
                unexpectedRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
            }
        });
        for (const name of ['지식 허브', 'Enterprise List', 'Visual Gallery', 'Professional Q&A', 'Event Calendar', 'Accordion FAQ', 'Knowledge Wiki']) {
            await adminPage.getByRole('button', { name: new RegExp(name) }).click();
            if (name === 'Enterprise List') await expect(preview.getByRole('table')).toBeVisible();
            if (name === 'Visual Gallery') {
                await expect(preview.getByText('사진', { exact: true })).toHaveCount(0);
                await expect(preview.getByText('갤러리', { exact: true })).toHaveCount(3);
                expect((await preview.boundingBox())!.height).toBeLessThan(1000);
            }
            if (name === '지식 허브') await expect(preview.getByText('대표 게시글', { exact: true })).toBeVisible();
            if (name === 'Accordion FAQ') {
                await expect(preview.locator('details[open]')).toHaveCount(0);
                await preview.locator('summary').nth(1).focus();
                await adminPage.keyboard.press('Enter');
                await expect(preview.locator('details').nth(1)).toHaveAttribute('open', '');
            }
            await testInfo.attach(`preview-${name}`, { body: await preview.screenshot(), contentType: 'image/png' });
        }
        await adminPage.setViewportSize({ width: 390, height: 844 });
        await adminPage.getByRole('button', { name: /Enterprise List/ }).click();
        await expect(preview.getByRole('table')).toBeVisible();
        expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await testInfo.attach('preview-mobile-list', { body: await preview.screenshot(), contentType: 'image/png' });
        await adminPage.getByRole('button', { name: /Visual Gallery/ }).click();
        await adminPage.getByRole('button', { name: '테마 변경', exact: true }).click();
        await expect(adminPage.locator('html')).toHaveClass(/dark/);
        const nextStep = adminPage.getByRole('button', { name: /다음 단계로/ });
        await nextStep.focus();
        const nextBounds = (await nextStep.boundingBox())!;
        expect(nextBounds.x).toBeGreaterThanOrEqual(0);
        expect(nextBounds.x + nextBounds.width).toBeLessThanOrEqual(390);
        await testInfo.attach('preview-mobile-dark-gallery', { body: await adminPage.screenshot({ fullPage: true }), contentType: 'image/png' });
        expect(unexpectedRequests).toEqual([]);
    });

    test('일반 게시판 작성자는 지정 공지·FAQ 작성 화면과 직접 요청에서 차단된다', async ({ userPage, userRequest }) => {
        // 기본 격리 환경은 공지와 FAQ가 같은 게시판이다. 두 권한을 모두 요구한다.
        const bbsId = 'BBSMSTR_AAAAAAAAAAAA';
        const metadata = await userRequest.get(`/api/v1/boards/${bbsId}/meta`);
        expect(metadata.status()).toBe(200);
        expect((await metadata.json()).data.requiredEditPermissions).toEqual(['NOTICE_EDIT', 'FAQ_EDIT']);
        const current = await userRequest.get('/api/v1/auth/me');
        expect(current.status()).toBe(200);
        const permissions = (await current.json()).data.permissions as string[];
        expect(permissions).toContain('BOARD_CREATE');
        expect(permissions).not.toContain('NOTICE_EDIT');
        expect(permissions).not.toContain('FAQ_EDIT');

        await userPage.goto(`/admin/community/boards/select-board-list?bbsId=${bbsId}`);
        await expect(userPage.getByRole('link', { name: '글쓰기', exact: true })).toHaveCount(0);
        await userPage.goto(`/admin/community/boards/insert-board-article?bbsId=${bbsId}`);
        await expect(userPage.getByText('이 게시판을 편집할 권한이 없습니다. 필요한 권한은 관리자에게 문의해 주세요.', { exact: true })).toBeVisible();
        await expect(userPage.locator('input[name="pstTtl"]')).toBeDisabled();
        await expect(userPage.getByRole('button', { name: '게시글 등록', exact: true })).toBeDisabled();
        const denied = await userRequest.post('/api/v1/boards/posts', {
            data: { bbsId, pstTtl: 'E2E denied protected board write', pstCn: '<p>Must not persist</p>' },
        });
        expect(denied.status()).toBe(403);

        // 같은 사용자의 기본 작성 권한은 유지된다. 지정 공지와 분리된 기존 Q&A 게시판에서 확인한다.
        const generalBoardId = 'BBSMSTR_DDDDDDDDDDDD';
        const generalMetadata = await userRequest.get(`/api/v1/boards/${generalBoardId}/meta`);
        expect(generalMetadata.status()).toBe(200);
        expect((await generalMetadata.json()).data.requiredEditPermissions).toEqual([]);
        const title = `E2E general board author ${Date.now()}`;
        const created = await userRequest.post('/api/v1/boards/posts', {
            data: { bbsId: generalBoardId, pstTtl: title, pstCn: '<p>Ordinary board author permission remains valid.</p>' },
        });
        expect(created.status()).toBe(201);
        const pstSn = (await created.json()).data as number;
        expect(Number.isSafeInteger(pstSn)).toBe(true);
        try {
            const stored = await userRequest.get(`/api/v1/boards/${generalBoardId}/posts/${pstSn}`);
            expect(stored.status()).toBe(200);
            expect((await stored.json()).data.pstTtl).toBe(title);
            await userPage.goto(`/admin/community/boards/insert-board-article?bbsId=${generalBoardId}`);
            await expect(userPage.locator('input[name="pstTtl"]')).toBeEnabled();
            await expect(userPage.getByRole('button', { name: '게시글 등록', exact: true })).toBeEnabled();
        } finally {
            expect((await userRequest.delete(`/api/v1/boards/${generalBoardId}/posts/${pstSn}`)).status()).toBe(200);
        }
    });
    // [2026-10-23 ADR-0040 결정 3] 게시 시작일을 집행한다 — 예약 글은 시작일까지 작성자와 조회 대행 권한자에게만 보이고, 공개된 글의
    //   시작일은 작성자라도 게시글 전체 수정 권한이 있어야 바꾼다(정렬 조작 방지). 날짜는 앱과 같은 Asia/Seoul 로 만든다.
    test('예약 글은 시작일까지 다른 사용자에게 보이지 않고, 공개된 글의 시작일은 작성자가 바꾸지 못한다', async ({ adminRequest, userRequest }) => {
        const nextWeek = screenYmd(7);
        const marker = `E2E예약${Date.now()}`;
        const createdBoard = await adminRequest.post('/api/v1/admin/system/board-masters', {
            data: {
                bbsTtl: `E2E_예약집행_${marker}`, bbsTypeCd: 'BBST02', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_LIST',
                fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, atchPsbltyFileSz: 0, useYn: 'Y', rsvtPstgPsbltyYn: 'Y',
            },
        });
        expect(createdBoard.status()).toBe(201);
        const bbsId = (await createdBoard.json()).data as string;
        const cleanup: { request: typeof adminRequest; pstSn: number }[] = [];
        try {
            const scheduled = await adminRequest.post('/api/v1/boards/posts', {
                data: { bbsId, pstTtl: `${marker} 예약 글`, pstCn: '<p>시작일까지 숨는다</p>', pstBgngYmd: nextWeek },
            });
            expect(scheduled.status()).toBe(201);
            const scheduledSn = (await scheduled.json()).data as number;
            cleanup.push({ request: adminRequest, pstSn: scheduledSn });

            // 다른 사용자에게는 목록·통합 검색에서 빠지고 상세는 없는 글이다.
            const userList = await userRequest.get(`/api/v1/boards/${bbsId}?page=1&size=100`);
            expect(userList.status()).toBe(200);
            expect(((await userList.json()).data.list as { pstSn: number }[]).map(post => post.pstSn)).not.toContain(scheduledSn);
            const userSearch = await userRequest.get(`/api/v1/boards/search?keyword=${encodeURIComponent(marker)}`);
            expect(userSearch.status()).toBe(200);
            expect(((await userSearch.json()).data as { pstSn: number }[]).map(post => post.pstSn)).not.toContain(scheduledSn);
            expect((await userRequest.get(`/api/v1/boards/${bbsId}/posts/${scheduledSn}?countView=false`)).status()).toBe(404);

            // 작성자(조회 대행 권한도 있다)에게는 서버가 판정한 예약 상태로 온다.
            const ownerList = await adminRequest.get(`/api/v1/boards/${bbsId}?page=1&size=100&postingStatus=SCHEDULED`);
            expect(ownerList.status()).toBe(200);
            expect((await ownerList.json()).data.list).toEqual(
                expect.arrayContaining([expect.objectContaining({ pstSn: scheduledSn, postingStatus: 'SCHEDULED' })]),
            );

            // 공개된 자기 글의 시작일을 미래로 옮기는 것은 작성자라도 막힌다.
            const own = await userRequest.post('/api/v1/boards/posts', {
                data: { bbsId, pstTtl: `${marker} 공개 글`, pstCn: '<p>이미 공개된 글</p>' },
            });
            expect(own.status()).toBe(201);
            const ownSn = (await own.json()).data as number;
            cleanup.push({ request: userRequest, pstSn: ownSn });
            const ownDetail = await userRequest.get(`/api/v1/boards/${bbsId}/posts/${ownSn}?countView=false`);
            expect(ownDetail.status()).toBe(200);
            const { version, postingStatus } = (await ownDetail.json()).data as { version: number; postingStatus: string };
            expect(postingStatus).toBe('POSTING');
            const moved = await userRequest.put(`/api/v1/boards/${bbsId}/posts/${ownSn}`, {
                data: { bbsId, pstTtl: `${marker} 공개 글`, pstCn: '<p>이미 공개된 글</p>', pstBgngYmd: nextWeek, version },
            });
            expect(moved.status()).toBe(403);
        } finally {
            for (const { request, pstSn } of cleanup) await request.delete(`/api/v1/boards/${bbsId}/posts/${pstSn}`);
            await adminRequest.post('/api/v1/admin/system/board-masters/batch/status', { data: { bbsIds: [bbsId], useYn: 'N' } });
        }
    });
    test.describe('Board & Community (Business Flow)', () => {
        // [2026-08-10 제거] `test.describe.configure({ mode: 'parallel' })`.
        //   playwright.config 는 `workers: 1` 이라(공유 DB 오염·OOM 방지) 이 선언은 **아무 효과가 없었다**.
        //   그럼에도 "병렬 실행 최적화" 라는 주석이 붙어 있어, 아래 테스트들이 워커 격리를 전제로
        //   쓰여 있다는 잘못된 인상을 준다(실제로 `TEST_WORKER_INDEX` 를 이름에 섞는 코드가 그 인상 위에 있다).
        //   워커를 늘리려면 config 의 `workers` 를 바꾸고 **공유 DB 상태를 쓰는 스펙부터 격리**해야 한다 —
        //   그 판단 없이 이 한 줄만 두면 "병렬로 돌고 있다"는 착각만 남는다.
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test.describe('Article Lifecycle Management', () => {
            const templates = [
                { id: 'BBSMSTR_AAAAAAAAAAAA', name: 'General List' },
                { id: 'BBSMSTR_DDDDDDDDDDDD', name: 'Q&A Template' },
            ];
            for (const template of templates) {
                test(`CRUD Flow for ${template.name}`, async ({ page }) => {
                    test.slow();
                    console.log(`\n>>> Starting CRUD Flow for: ${template.name}`);
                    page.on('dialog', async (dialog) => {
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
                        // 게시글 등록은 첨부 유무로 JSON 과 multipart 두 경로로 갈린다(DEC-OPS-044).
                        if (method === 'POST' && (url.includes('/api/v1/boards/posts') || url.includes('/posts/with-files'))) {
                            try {
                                const body = await response.json();
                                const pstSn = body?.data;
                                if (Number.isSafeInteger(Number(pstSn)) && Number(pstSn) > 0) {
                                    createdPstSn = Number(pstSn);
                                    console.log(`>>> [API Intercept] Captured pstSn: ${createdPstSn}`);
                                }
                            }
                            catch { }
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
                        page.waitForSelector('[data-sonner-toast]:has-text("저장"), [data-sonner-toast]:has-text("완료"), [data-sonner-toast]:has-text("성공")', { timeout: 30000 }),
                    ]);
                    page.off('response', responseHandler);
                    if (!createdPstSn) {
                        const urlMatch = page.url().match(/[?&]pstSn=([^&]+)/);
                        if (urlMatch) {
                            const parsedPstSn = Number(urlMatch[1]);
                            if (Number.isSafeInteger(parsedPstSn) && parsedPstSn > 0)
                                createdPstSn = parsedPstSn;
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
                            }
                            else {
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
                        page.waitForSelector('[data-sonner-toast]:has-text("저장"), [data-sonner-toast]:has-text("완료"), [data-sonner-toast]:has-text("성공")', { timeout: 15000 }),
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
        test('본문 이미지·영상·표는 저장과 재수정 후 실제 첨부로 표시된다', async ({ page, adminRequest }) => {
            const bbsId = 'BBSMSTR_AAAAAAAAAAAA';
            const title = `E2E Media ${Date.now()}`;
            const updatedTitle = `${title} 수정`;
            const imageLabel = '업무 흐름 이미지';
            const updatedImageLabel = '수정한 업무 흐름 이미지';
            const addedImageLabel = '수정 중 추가한 업무 흐름 이미지';
            const videoLabel = '업무 흐름 영상';
            let pstSn: number | null = null;
            let saveAttempted = false;

            const readArticle = async () => {
                const response = await adminRequest.get(`/api/v1/boards/${bbsId}/posts/${pstSn}`);
                expect(response.status()).toBe(200);
                return (await response.json()).data as { pstTtl: string; pstCn: string; atchFileSn: number };
            };
            const readFiles = async (group: number) => {
                const response = await adminRequest.get(`/api/v1/files/${group}`);
                expect(response.status()).toBe(200);
                return (await response.json()).data as {
                    atchFileSn: number; fileSn: number; fileExtsn: string; orignlFileNm: string; fileMg: number;
                }[];
            };
            const readReferences = async (html: string) => page.evaluate((content) => {
                const document = new DOMParser().parseFromString(content, 'text/html');
                return [...document.querySelectorAll('figure[data-board-file]')].map((figure) => ({
                    name: figure.getAttribute('data-board-file'),
                    kind: figure.getAttribute('data-media-kind'),
                    label: figure.getAttribute('data-media-label'),
                }));
            }, html);

            try {
                await page.goto(`/admin/community/boards/insert-board-article?bbsId=${bbsId}`);
                const editor = page.getByRole('textbox', { name: '게시글 본문 내용 (필수)', exact: true });
                await expect(editor).toBeVisible();

                // 실제 디코딩 가능한 PNG/WebM을 만든다. PNG는 Server Action 기본 1 MiB 제한도 넘는다.
                const fixtures = await page.evaluate(async () => {
                    const image = document.createElement('canvas');
                    image.width = 768;
                    image.height = 768;
                    const imageContext = image.getContext('2d');
                    if (!imageContext) throw new Error('PNG fixture canvas is unavailable');
                    const pixels = imageContext.createImageData(image.width, image.height);
                    let seed = 0x12345678;
                    for (let offset = 0; offset < pixels.data.length; offset += 4) {
                        seed ^= seed << 13;
                        seed ^= seed >>> 17;
                        seed ^= seed << 5;
                        pixels.data[offset] = seed & 255;
                        pixels.data[offset + 1] = (seed >>> 8) & 255;
                        pixels.data[offset + 2] = (seed >>> 16) & 255;
                        pixels.data[offset + 3] = 255;
                    }
                    imageContext.putImageData(pixels, 0, 0);
                    const png = image.toDataURL('image/png').split(',')[1];

                    const movie = document.createElement('canvas');
                    movie.width = 128;
                    movie.height = 96;
                    const context = movie.getContext('2d');
                    if (!context) throw new Error('WebM fixture canvas is unavailable');
                    const mimeType = ['video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
                    if (!mimeType) throw new Error('This browser cannot record the WebM fixture');
                    const stream = movie.captureStream(10);
                    try {
                        const recorder = new MediaRecorder(stream, { mimeType });
                        const chunks: Blob[] = [];
                        const webm = await new Promise<string>((resolve, reject) => {
                            let frame = 0;
                            const timer = window.setInterval(() => {
                                context.fillStyle = frame % 2 === 0 ? '#164e63' : '#f59e0b';
                                context.fillRect(0, 0, movie.width, movie.height);
                                frame += 1;
                                if (frame === 12) {
                                    window.clearInterval(timer);
                                    recorder.stop();
                                }
                            }, 100);
                            recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
                            recorder.onerror = () => {
                                window.clearInterval(timer);
                                reject(new Error('WebM fixture recording failed'));
                            };
                            recorder.onstop = () => {
                                window.clearInterval(timer);
                                const reader = new FileReader();
                                reader.onerror = () => reject(new Error('WebM fixture encoding failed'));
                                reader.onload = () => resolve(String(reader.result).split(',')[1]);
                                reader.readAsDataURL(new Blob(chunks, { type: 'video/webm' }));
                            };
                            recorder.start();
                        });
                        return { png, webm };
                    } finally {
                        stream.getTracks().forEach((track) => track.stop());
                    }
                });
                const imageBytes = Buffer.from(fixtures.png, 'base64');
                const videoBytes = Buffer.from(fixtures.webm, 'base64');
                expect(imageBytes.length).toBeGreaterThan(1024 * 1024);
                expect(imageBytes.length).toBeLessThan(10 * 1024 * 1024);
                expect(videoBytes.length).toBeGreaterThan(0);

                await page.getByRole('textbox', { name: '게시글 제목', exact: true }).fill(title);
                await editor.fill('본문 미디어와 표의 저장 및 재수정 검증');
                await editor.press('End');
                await editor.press('Enter');
                await page.getByLabel('본문 이미지 파일', { exact: true }).setInputFiles({
                    name: 'workflow-noise.png', mimeType: 'image/png', buffer: imageBytes,
                });
                await page.getByRole('textbox', { name: '이미지 설명', exact: true }).fill(imageLabel);
                await expect.poll(() => page.getByRole('img', { name: imageLabel, exact: true })
                    .evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(768);
                await page.getByLabel('본문 영상 파일', { exact: true }).setInputFiles({
                    name: 'workflow-motion.webm', mimeType: 'video/webm', buffer: videoBytes,
                });
                await page.getByRole('textbox', { name: '영상 설명', exact: true }).fill(videoLabel);
                await page.getByRole('button', { name: '표 도구', exact: true }).click();
                const tableTools = page.getByRole('dialog', { name: '표 편집 도구', exact: true });
                await tableTools.getByRole('spinbutton', { name: '행 수', exact: true }).fill('2');
                await tableTools.getByRole('spinbutton', { name: '열 수', exact: true }).fill('2');
                await tableTools.getByRole('button', { name: '표 삽입', exact: true }).click();
                await editor.locator('th').first().click();
                await page.keyboard.type('검증 항목');
                await editor.locator('td').first().click();
                await page.keyboard.type('첨부와 표 보존');

                saveAttempted = true;
                await page.getByRole('button', { name: '게시글 등록', exact: true }).click();
                await page.waitForURL((url) => url.pathname.endsWith('/boards/detail')
                    && url.searchParams.get('bbsId') === bbsId && Number(url.searchParams.get('pstSn')) > 0);
                pstSn = Number(new URL(page.url()).searchParams.get('pstSn'));
                expect(Number.isSafeInteger(pstSn)).toBe(true);
                const stored = await readArticle();
                expect(stored.pstTtl).toBe(title);
                expect(stored.atchFileSn).toBeGreaterThan(0);
                expect(stored.pstCn).toContain('<table');
                expect(stored.pstCn).not.toMatch(/\bsrc\s*=|blob:|data:image|<(?:img|video)\b/i);
                const references = await readReferences(stored.pstCn);
                expect(references).toHaveLength(2);
                expect(references).toEqual(expect.arrayContaining([
                    { name: expect.stringMatching(/^media-[0-9a-f-]{36}-workflow-noise\.png$/), kind: 'image', label: imageLabel },
                    { name: expect.stringMatching(/^media-[0-9a-f-]{36}-workflow-motion\.webm$/), kind: 'video', label: videoLabel },
                ]));
                const files = await readFiles(stored.atchFileSn);
                expect(files).toHaveLength(2);
                expect(files.map((file) => file.orignlFileNm).sort()).toEqual(references.map((reference) => reference.name).sort());
                for (const [extension, bytes] of [['png', imageBytes], ['webm', videoBytes]] as const) {
                    const matches = files.filter((file) => file.fileExtsn.toLowerCase() === extension);
                    expect(matches).toHaveLength(1);
                    expect(matches[0].atchFileSn).toBe(stored.atchFileSn);
                    expect(matches[0].fileMg).toBe(bytes.length);
                    const downloaded = await adminRequest.get(`/api/v1/files/${stored.atchFileSn}/${matches[0].fileSn}`);
                    expect(downloaded.status()).toBe(200);
                    expect((await downloaded.body()).equals(bytes)).toBe(true);
                }

                await expect.poll(() => page.getByRole('img', { name: imageLabel, exact: true })
                    .evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(768);
                const videoGroup = page.getByRole('group', { name: videoLabel, exact: true });
                await videoGroup.getByRole('button', { name: '영상 불러오기', exact: true }).click();
                const video = videoGroup.locator('video');
                await expect(video).toBeVisible();
                await expect(video).toHaveAttribute('controls', '');
                await video.evaluate(async (element) => {
                    const media = element as HTMLVideoElement;
                    media.muted = true;
                    await media.play();
                });
                // MediaRecorder의 WebM은 duration이 Infinity일 수 있다. 실제 프레임 디코딩도 함께 확인한다.
                await expect.poll(() => video.evaluate((element) => {
                    const media = element as HTMLVideoElement;
                    return media.readyState >= 2 && media.videoWidth === 128 && media.duration > 0;
                })).toBe(true);
                await video.evaluate((element) => (element as HTMLVideoElement).pause());
                await expect(page.getByRole('cell', { name: '첨부와 표 보존', exact: true })).toBeVisible();

                await page.getByRole('button', { name: '게시글 수정', exact: true }).click();
                await expect(editor).toBeVisible();
                await expect(page.getByRole('textbox', { name: '게시글 제목', exact: true })).toHaveValue(title);
                await expect(page.getByRole('textbox', { name: '이미지 설명', exact: true })).toHaveValue(imageLabel);
                await expect(page.getByRole('textbox', { name: '영상 설명', exact: true })).toHaveValue(videoLabel);
                await expect(editor.getByRole('cell', { name: '첨부와 표 보존', exact: true })).toBeVisible();
                await page.getByRole('textbox', { name: '게시글 제목', exact: true }).fill(updatedTitle);
                await page.getByRole('textbox', { name: '이미지 설명', exact: true }).fill(updatedImageLabel);
                await editor.press('Control+Home');
                await page.getByLabel('본문 이미지 파일', { exact: true }).setInputFiles({
                    name: 'workflow-added.png', mimeType: 'image/png', buffer: imageBytes,
                });
                await page.getByRole('textbox', { name: '이미지 설명', exact: true })
                    .and(page.locator('input[value="workflow-added.png"]')).fill(addedImageLabel);
                await expect.poll(() => page.getByRole('img', { name: addedImageLabel, exact: true })
                    .evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(768);
                await page.getByRole('button', { name: '게시글 수정', exact: true }).click();
                await page.waitForURL((url) => url.pathname.endsWith('/boards/detail')
                    && Number(url.searchParams.get('pstSn')) === pstSn);
                const updated = await readArticle();
                expect(updated.pstTtl).toBe(updatedTitle);
                expect(updated.atchFileSn).toBe(stored.atchFileSn);
                expect(updated.pstCn).not.toMatch(/\bsrc\s*=|blob:|data:image|<(?:img|video)\b/i);
                const updatedReferences = await readReferences(updated.pstCn);
                expect(updatedReferences).toHaveLength(3);
                expect(updatedReferences).toEqual(expect.arrayContaining([
                    ...references.map((reference) => reference.kind === 'image'
                        ? { ...reference, label: updatedImageLabel } : reference),
                    { name: expect.stringMatching(/^media-[0-9a-f-]{36}-workflow-added\.png$/), kind: 'image', label: addedImageLabel },
                ]));
                const updatedFiles = await readFiles(updated.atchFileSn);
                expect(updatedFiles).toHaveLength(3);
                expect(updatedFiles).toEqual(expect.arrayContaining(files));
                expect(updatedFiles.map((file) => file.orignlFileNm).sort())
                    .toEqual(updatedReferences.map((reference) => reference.name).sort());
                const addedFiles = updatedFiles.filter((file) => !files.some((original) => original.fileSn === file.fileSn));
                expect(addedFiles).toHaveLength(1);
                expect(addedFiles[0].atchFileSn).toBe(stored.atchFileSn);
                expect(addedFiles[0].fileExtsn.toLowerCase()).toBe('png');
                expect(addedFiles[0].fileMg).toBe(imageBytes.length);
                const addedDownload = await adminRequest.get(`/api/v1/files/${updated.atchFileSn}/${addedFiles[0].fileSn}`);
                expect(addedDownload.status()).toBe(200);
                expect((await addedDownload.body()).equals(imageBytes)).toBe(true);
                await expect(page.getByRole('heading', { name: updatedTitle, exact: true, level: 1 })).toBeVisible();
                await expect.poll(() => page.getByRole('img', { name: updatedImageLabel, exact: true })
                    .evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(768);
                await expect.poll(() => page.getByRole('img', { name: addedImageLabel, exact: true })
                    .evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(768);
                await expect(page.getByRole('cell', { name: '첨부와 표 보존', exact: true })).toBeVisible();
            } finally {
                // 게시글 상세(본문 첨부 이미지 포함)를 먼저 떠난다 — 열린 화면의 재조회가 지운 글·첨부를 404 로 받으면 브라우저 오류
                //   감시가 실패로 잡는다(PR #930 의 설문 정리와 같은 순서). 떠나기가 실패해도(페이지 종료·크래시) 정리는 한다.
                try {
                    await page.goto('about:blank');
                } finally {
                    // 저장은 끝났지만 화면 전환이 실패한 경우도 고유 제목으로 찾아 정리한다.
                    const ids = new Set<number>(pstSn ? [pstSn] : []);
                    if (saveAttempted && !pstSn) {
                        const response = await adminRequest.get(`/api/v1/boards/${bbsId}`, {
                            params: { searchCnd: '0', searchWrd: title, size: 100 },
                        });
                        expect(response.status()).toBe(200);
                        const articles = (await response.json()).data.list as { pstSn: number; pstTtl: string }[];
                        articles.filter((article) => article.pstTtl === title || article.pstTtl === updatedTitle)
                            .forEach((article) => ids.add(article.pstSn));
                    }
                    for (const id of ids) {
                        expect((await adminRequest.delete(`/api/v1/boards/${bbsId}/posts/${id}`)).status()).toBe(200);
                    }
                }
            }
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
                return (list as {
                    ansCn: string;
                }[]).map((c) => c.ansCn);
            };
            try {
                await page.goto(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`);
                // ── 작성
                const input = page.locator('textarea[name="ansCn"]');
                await expect(input).toBeVisible({ timeout: 15000 });
                await input.fill(original);
                await page.getByRole('button', { name: /댓글 등록/ }).click();
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
                await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: edited }).first(), '수정 결과가 화면에 반영되어야 한다').toBeVisible({ timeout: 15000 });
                await expect.poll(serverComments, { timeout: 15000, message: 'UI 수정이 서버에 반영되어야 한다' })
                    .toContain(edited);
                // ── 삭제 ([2026-09-06 DEC-OPS-038] 네이티브 confirm → useConfirm 모달. 모달의 '삭제' 를 누른다 — 228행과 같은 패턴)
                const deleteBtn = page.getByTestId('comment-delete-button').first();
                await expect(deleteBtn).toBeEnabled({ timeout: 15000 });
                await deleteBtn.hover();
                await deleteBtn.click({ force: true });
                const deleteConfirm = page.getByRole('dialog').filter({ hasText: '댓글 삭제' });
                await expect(deleteConfirm).toBeVisible({ timeout: 15000 });
                await deleteConfirm.getByRole('button', { name: '삭제', exact: true }).click();
                await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: edited }), '삭제한 댓글이 화면에서 사라져야 한다').toHaveCount(0, { timeout: 15000 });
                await expect.poll(serverComments, { timeout: 15000, message: 'UI 삭제가 실제 삭제로 이어져야 한다' })
                    .not.toContain(edited);
            }
            finally {
                // 게시글 상세를 먼저 떠난 뒤 지운다 — 댓글 변경 뒤의 재조회가 지운 글을 404 로 받지 않게(PR #930). 떠나기가 실패해도 지운다.
                try {
                    await page.goto('about:blank');
                } finally {
                    await request.delete(`/api/v1/boards/${bbsId}/posts/${pstSn}`, { headers: auth });
                }
            }
        });
    });
});
test.describe('화면 품질', () => {
    test.describe('Quality & Resilience', () => {
        test.describe('Advanced UX & Performance', () => {
            test.use({ storageState: 'playwright/.auth/admin.json' });
            test("게시글 추천 버튼을 누르면 표시된 추천 수가 바뀐다", async ({ page, request }) => {
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
                const auth = { Authorization: `Bearer ${token}` };
                try {
                    await page.goto(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`);
                    // [E2E 감사 B] isVisible 가드 제거 — 추천 버튼이 없으면 실패시킨다(과거: 가드로 무단언 통과).
                    const likeBtn = page.locator('button').filter({ hasText: /추천|좋아요|Like/i }).first();
                    await expect(likeBtn).toBeVisible({ timeout: 15000 });
                    const initialCount = await likeBtn.innerText();
                    await expect(likeBtn).toHaveAttribute('aria-pressed', 'false');
                    await likeBtn.click();
                    // 낙관적 UI: 즉시 카운트가 변해야 한다.
                    await expect(likeBtn).not.toHaveText(initialCount, { timeout: 10000 });
                    // [2026-10-23 ADR-0040 결정 6] 추천은 토글이다 — 눌린 상태가 되고, 다시 누르면 추천을 거둬 처음 수로 돌아온다.
                    await expect(likeBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
                    await expect(likeBtn).toBeEnabled({ timeout: 10000 });
                    await likeBtn.click();
                    await expect(likeBtn).toHaveAttribute('aria-pressed', 'false', { timeout: 10000 });
                    await expect(likeBtn).toHaveText(initialCount, { timeout: 10000 });
                    // 취소 뒤에는 다시 추천할 수 있다.
                    await expect(likeBtn).toBeEnabled({ timeout: 10000 });
                    await likeBtn.click();
                    await expect(likeBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
                    await expect(likeBtn).toBeEnabled({ timeout: 10000 });
                    // 서버 계약: 취소는 내 이력이 있을 때만 줄이고, 없으면 지금 수를 그대로 돌려준다(멱등).
                    const likeUrl = `/api/v1/boards/${bbsId}/posts/${pstSn}/like`;
                    const cancelled = await request.delete(likeUrl, { headers: auth });
                    expect(cancelled.ok(), '추천 취소가 성공해야 한다').toBeTruthy();
                    const afterCancel = (await cancelled.json())?.data;
                    expect(typeof afterCancel, '취소 응답은 지금 추천 수다').toBe('number');
                    const again = await request.delete(likeUrl, { headers: auth });
                    expect(again.ok(), '이력이 없는 취소도 오류가 아니다').toBeTruthy();
                    expect((await again.json())?.data, '이력이 없는 취소는 수를 줄이지 않는다').toBe(afterCancel);
                }
                finally {
                    // 게시글 상세를 먼저 떠난 뒤 지운다 — 추천 토글 뒤의 재조회가 지운 글을 404 로 받지 않게(PR #930). 떠나기가 실패해도 지운다.
                    try {
                        await page.goto('about:blank');
                    } finally {
                        await request.delete(`/api/v1/boards/${bbsId}/posts/${pstSn}`, { headers: auth });
                    }
                }
            });
        });
    });
});
