import { test, expect } from './fixtures/base-test';

/**
 * [Tier 21] Advanced Resilience: Network Failure & UI Stability
 * 
 * 시스템이 불안정한 네트워크 환경이나 백엔드 장애 상황에서 
 * 얼마나 견고하게 동작하는지(Graceful Degradation)를 검증합니다.
 */

test.describe('Tier 21: Advanced Resilience', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Network Resilience: API 500 Error Interception', async ({ page, consoleGuard }) => {
        // Broadly ignore 500 errors for this specific fault injection test
        consoleGuard.addIgnorePattern(/users/); // Ignore 500 from users API
        consoleGuard.addIgnorePattern(/Simulated/i);

        console.log('>>> Step 1: Navigating to User Management');
        await page.goto('/admin/user/manage');
        await expect(page.getByRole('heading', { name: '사용자 관리' }).first()).toBeVisible();

        console.log('>>> Step 2: Intercepting User List API to return 500');
        // Intercept the users list API and force it to fail
        await page.route('**/api/v1/admin/system/users*', async route => {
            console.log(`>>> Blocking request to: ${route.request().url()}`);
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Internal Server Error (Simulated)' })
            });
        });

        console.log('>>> Step 3: Triggering Refresh/Search to cause failure');
        // Use a more specific locator to avoid announcer or other inputs
        const searchInput = page.locator('input[placeholder*="identity"], input[placeholder*="검색"]').first();
        await expect(searchInput).toBeVisible({ timeout: 20000 });
        await searchInput.clear();
        await searchInput.fill('ForceFail');
        await page.keyboard.press('Enter');

        console.log('>>> Step 4: Verifying Error Surface (Sonner toast)');
        // UserManageClient는 500을 ErrorStateDisplay가 아니라 client.ts 인터셉터의 전역
        // 'api-error' 이벤트 → ToastProvider → Sonner 토스트(role="status")로 노출하며,
        // 백엔드 메시지(모의 500 body의 message)를 그대로 표시한다.
        // 과거 셀렉터 [role="alert"]는 Sonner의 '빈' aria-live announcer만 매칭해 타임아웃되었으므로,
        // 실제 렌더 텍스트('Internal Server Error (Simulated)')로 단언한다.
        const errorToast = page.getByText('Internal Server Error (Simulated)').first();
        await expect(errorToast).toBeVisible({ timeout: 15000 });
        const alertText = await errorToast.innerText();
        console.log(`>>> Detected Error Surface Text: ${alertText}`);
        console.log('>>> Error surface successfully detected and verified.');

        // UI should still be interactable
        await expect(page.getByRole('heading', { name: '사용자 관리' }).first()).toBeVisible();
    });

    test('UI Stability: Rapid Interaction Stress Test', async ({ page }) => {
        await page.goto('/admin/community/boards/master');
        await expect(page.getByRole('heading', { name: '게시판 마스터' }).first()).toBeVisible();

        console.log('>>> Step 1: Rapidly clicking pagination/tabs');
        const nextBtn = page.locator('button[aria-label*="Next"], button:has-text(">")').first();
        
        if (await nextBtn.isVisible()) {
            for (let i = 0; i < 5; i++) {
                // Click rapidly without waiting for network to finish
                await nextBtn.click({ noWaitAfter: true });
                console.log(`>>> Rapid Click ${i + 1}`);
            }
        }

        console.log('>>> Step 2: Verifying UI state consistency');
        // Ensure the page didn't crash or show a white screen
        await expect(page.locator('body')).toBeVisible();
        await expect(page.getByRole('heading', { name: '게시판 마스터' }).first()).toBeVisible();
        console.log('>>> System remained stable after rapid interaction.');
    });

    test('Data Integrity: Boundary Input (Huge Payload)', async ({ page, consoleGuard }) => {
        // [E2E 감사 B/C3] 광역 addIgnorePattern(/value/i, /controlled/i) 제거 — 실제 경고를 은폐하던 패턴.
        // 경계값(255자) 제출은 zod 검증 실패를 '의도'한다. useAppForm이 검증 실패 시
        // 브라우저 콘솔에 'Validation Errors:'를 출력하므로, 이 예상된 검증-실패 노이즈만
        // 정밀 무시한다(다른 콘솔 결함은 그대로 감지 유지).
        consoleGuard.addIgnorePattern(/Validation Errors/i);
        await page.goto('/admin/community/boards/insert-board-article?bbsId=BBSMSTR_AAAAAAAAAAAA');
        
        const hugeTitle = 'B'.repeat(255); // Near common DB limit for VARCHAR
        const hugeContent = 'Content '.repeat(500); // ~4000 characters

        console.log('>>> Step 1: Filling form with large payload');
        await page.locator('input[name="pstTtl"], input[name="nttSj"], [data-testid="article-title-input"]').first().fill(hugeTitle);
        // Using locator for TipTap/ProseMirror editor with robust fallbacks
        const editor = page.locator('.ProseMirror, textarea[name="pstCn"], textarea[name="nttCn"]').first();
        await editor.fill(hugeContent);

        console.log('>>> Step 2: Attempting to submit');
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();

        // pstTtl(255자)은 zod max(100)을 초과하므로 제출 시 검증이 '항상' 실패한다.
        // providers.tsx의 zod 에러맵이 too_big(string)을 '최대 {maximum}자 이하로 입력해야 합니다.'로
        // 매핑하고, 이 메시지는 pstTtl FormItem의 inline FormMessage(및 useAppForm의 Sonner 토스트)에
        // 렌더된다. 과거 getByRole('alert')는 Sonner의 '빈' announcer를 매칭하던 오탐이었으므로,
        // 실제 검증 메시지를 그 렌더 surface에서 단언한다.
        const validationMessage = page.getByText('최대 100자 이하로 입력해야 합니다').first();
        await expect(validationMessage).toBeVisible({ timeout: 30000 });

        const alertText = await validationMessage.innerText();
        console.log(`>>> Submission Validation Text: '${alertText}'`);
        // 경계값 초과 제출은 반드시 최대 길이 검증 메시지를 노출해야 한다(계약 단언).
        expect(alertText, `경계값(255자) 제출은 최대 길이 검증 메시지를 노출해야 함 (실제: '${alertText}')`)
            .toContain('최대 100자 이하로 입력해야 합니다');
    });
});
