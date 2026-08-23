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
        consoleGuard.expectErrors([{
            id: 'E2E-RESILIENCE-USERS-500',
            specScope: '21-advanced-resilience.spec.ts :: Network Resilience: API 500 Error Interception',
            channel: 'response',
            urlPattern: /\/api\/v1\/admin\/system\/users(?:\?|$)/,
            messagePattern: null,
            method: 'GET',
            status: 500,
            // 전역 QueryClient retry:1 때문에 같은 fault injection이 최대 두 번 관측될 수 있다.
            maxOccurrences: 2,
            reason: '사용자 목록의 graceful degradation을 검증하려고 이 테스트가 500 응답을 주입한다.',
            expiresAt: '2026-12-31',
        }]);

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
        // /admin/user/manage(UserOrgHubClient)는 500을 client.ts 인터셉터의 전역
        // 'api-error' 이벤트 → ToastProvider → Sonner 토스트(role="status")로도 노출하며,
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

    // [2026-08-10 제거] 삭제됨: 'UI Stability: Rapid Interaction Stress Test'.
    //
    //   스트레스의 전부가 `if (await nextBtn.isVisible())` 안에 있었다. 그런데 CI 는 매 회차
    //   **빈 DB** 로 시작하므로 게시판 마스터 목록이 1페이지를 넘지 않고, 다음-페이지 버튼은
    //   존재하지 않는다 → 클릭 0회. 즉 CI 에서 이 테스트가 실제로 한 일은
    //   `expect(page.locator('body')).toBeVisible()`(항상 참)과 헤딩 재확인뿐이었다.
    //   "빠른 상호작용에도 시스템이 안정적이다"라는 **이름이 검증하지 않는 것을 주장**하고 있었다.
    //
    //   되살리려면 페이저가 뜨는 조건(페이지 크기 초과)을 테스트가 **직접 성립시켜야** 한다 —
    //   25-deptjob-workreport-journey 의 '목록에 페이저가 있고 다음 페이지로 이동한다'가
    //   보고 11건을 시딩해 그 방식을 이미 보여 준다. 조건을 만들지 않는 스트레스 테스트는
    //   스트레스를 주지 않는다.

    test('Data Integrity: Boundary Input (Huge Payload)', async ({ page, consoleGuard }) => {
        // [E2E 감사 B/C3] 광역 addIgnorePattern(/value/i, /controlled/i) 제거 — 실제 경고를 은폐하던 패턴.
        // 경계값(255자) 제출은 zod 검증 실패를 '의도'한다. useAppForm이 검증 실패 시
        // 브라우저 콘솔에 'Validation Errors:'를 출력하므로, 이 예상된 검증-실패 노이즈만
        // 정밀 ledger로 한 번만 허용한다(다른 콘솔 결함은 그대로 감지 유지).
        consoleGuard.expectErrors([{
            id: 'E2E-VALIDATION-HUGE-TITLE',
            specScope: '21-advanced-resilience.spec.ts :: Data Integrity: Boundary Input (Huge Payload)',
            channel: 'console',
            urlPattern: null,
            messagePattern: /^Validation Errors:/,
            method: null,
            status: null,
            maxOccurrences: 1,
            reason: '255자 제목 제출의 zod 실패 콜백이 검증 오류를 한 번 기록하는 것이 테스트 시나리오다.',
            expiresAt: '2026-12-31',
        }]);
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
