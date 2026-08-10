import { test, expect } from './fixtures/base-test';

/**
 * Tier 11: Enterprise Workflow & Productivity
 * 전자결재 및 스마트 툴킷(일정, 업무보고) 등 핵심 기업 워크플로우 검증
 */
test.describe('Tier 11: Enterprise Workflow & Productivity', () => {
    test.use({ 
        storageState: 'playwright/.auth/admin.json',
        viewport: { width: 1920, height: 1080 }
    });

    /*
     * [2026-08-04 계약 전환] 이 테스트의 이름은 'Full Lifecycle' 이었고, 마지막에
     * `text=결재 상신이 완료되었습니다` 가 보이는지를 단언했다.
     *
     * 그런데 그 토스트는 **어떤 API 도 호출하지 않고** 뜨던 것이다. 즉 이 테스트는
     * 결재가 저장되는 것을 검증한 적이 없고, 오히려 **거짓 성공을 계약으로 동결**하고 있었다.
     * (뒤이은 '목록에 항목이 보인다' 단언도 아무 항목이나 잡으므로 통과했다 —
     *  방금 만든 것이 아니어도 통과하는, 정보량 0의 단언이었다.)
     *
     * 상신 경로를 정직화(버튼 비활성 + 미지원 안내)했으므로 단언을 그에 맞춘다.
     * ⚠ 실제 상신이 구현되면 이 테스트는 red 가 된다 — 그때 '저장되고 목록에서 조회된다' 로
     *   다시 바꾼다. 구현 시점에 테스트가 손을 들게 하는 것이 의도다.
     */
    test('Workflow: 결재 기안 화면은 상신 미지원을 숨기지 않는다', async ({ page }) => {
        console.log('\n>>> Starting Workflow: Electronic Approval Draft (미지원 정직성 검증)');
        
        // 1. Navigate to Approval Hub
        await page.goto('/approvals');
        await expect(page.getByRole('heading', { name: '결재 허브' }).first()).toBeVisible();
        
        // 2. Draft New Approval
        console.log('>>> Navigating to Draft Center');
        await page.getByRole('button', { name: '새 결재 기안' }).click();
        await expect(page).toHaveURL(/\/approvals\/draft/);
        
        // 3. Select Template (e.g., 일반 지출 결의서)
        console.log('>>> Selecting Template: 일반 지출 결의서');
        await page.getByText('일반 지출 결의서').first().click();
        
        // 4. Fill Form
        console.log('>>> Filling Approval Form');
        const subject = `E2E Test Approval ${Date.now()}`;
        await page.getByPlaceholder('상신할 문서의 제목을 입력하십시오...').fill(subject);
        await page.getByPlaceholder('결재 상세 사유 및 전달 사항을 기술하십시오...').fill('This is an automated E2E test for electronic approval workflow validation.');
        
        // 5. 미지원 사실이 화면에 드러나야 한다 — 작성만 되고 저장되지 않는다는 것을
        //    사용자가 **버튼을 누르기 전에** 알 수 있어야 한다.
        console.log('>>> Verifying the unsupported-submit notice is surfaced');
        await expect(page.getByText('상신 기능은 아직 연결되지 않았습니다.')).toBeVisible();

        // 6. 상신 버튼은 비활성이어야 한다.
        //    안내 문구만 띄우고 버튼이 눌리면 사용자는 여전히 "동작한다" 고 읽는다.
        const submitBtn = page.getByRole('button', { name: /Commit to Ledger/ });
        await expect(submitBtn).toBeVisible();
        await expect(submitBtn).toBeDisabled();

        // 7. 회귀 차단 — 종전의 가짜 성공 토스트가 되살아나면 red 가 된다.
        await expect(page.locator('text=결재 상신이 완료되었습니다')).toHaveCount(0);

        // 8. 페이지를 벗어나지 않는다(종전에는 성공한 것처럼 목록으로 튕겼다).
        await expect(page).toHaveURL(/\/approvals\/draft/);
        console.log(`>>> Draft form remains on page; nothing was submitted for #${subject}`);
    });

    test('Productivity: Smart Toolkit - Department Schedule', async ({ page }) => {
        console.log('\n>>> Starting Productivity: Smart Toolkit - Schedule');
        
        await page.goto('/smart-toolkit/schedule/dept');
        
        // 일정 관리 대시보드 확인
        await expect(page.locator('.hub-title-main, h1, h2').filter({ hasText: /일정|Schedule/i }).first()).toBeVisible();
        
        console.log('>>> Verifying Schedule Table visibility');
        const table = page.locator('table');
        await expect(table.first()).toBeVisible();
    });

    // [2026-08-10 중복제거] 삭제됨: 'Productivity: Smart Toolkit - Work Report Matrix'.
    //
    //   `if (await tabs.count() > 0)` 가드 안에 유일한 탭 단언이 있어, **탭이 통째로 사라져도 그린**이었다
    //   (기능이 없어질수록 조용해지는 단언 — 이 저장소가 반복해서 제거해 온 형태다).
    //   남는 실단언은 제목 정규식 하나뿐이었는데, 그 화면(work-report)의 실질 거동은
    //   25-deptjob-workreport-journey 가 제목 검색·pageUnit·페이저 이동·행 수정/삭제까지
    //   서버 상태 폴링으로 검증하며 소유한다.
});
